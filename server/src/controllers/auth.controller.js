import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import Admin from '../models/Admin.js';
import SecurityEvent from '../models/SecurityEvent.js';

const generateTokens = (adminId, role) => {
  const accessToken = jwt.sign(
    { id: adminId, role },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { id: adminId, role },
    process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

export const login = asyncHandler(async (req, res) => {
  const { email, password, totpToken } = req.body;

  const admin = await Admin.findOne({ email });
  
  if (!admin) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  // Check if locked
  if (admin.lockUntil && admin.lockUntil > Date.now()) {
    throw ApiError.forbidden(`Account locked. Try again after ${new Date(admin.lockUntil).toLocaleTimeString()}`);
  }

  const isMatch = await admin.matchPassword(password);
  
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  if (!isMatch) {
    admin.failedLoginAttempts += 1;
    
    // Log failed attempt
    admin.loginHistory.push({ ipAddress, userAgent, success: false });

    if (admin.failedLoginAttempts >= 5) {
      admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      await SecurityEvent.create({
        eventType: 'FAILED_LOGIN_SPIKE',
        severity: 'HIGH',
        details: `Admin account ${email} locked after 5 failed attempts`,
        ipAddress,
        adminId: admin._id,
      });
    }
    
    await admin.save();
    throw ApiError.unauthorized('Invalid credentials');
  }

  if (admin.is2FAEnabled) {
    if (!totpToken) {
      throw ApiError.unauthorized('TOTP token required');
    }

    const isTotpValid = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: totpToken,
      window: 1
    });

    if (!isTotpValid) {
      throw ApiError.unauthorized('Invalid TOTP token');
    }
  }

  // Reset lock and failed attempts on success
  admin.failedLoginAttempts = 0;
  admin.lockUntil = undefined;
  admin.lastLogin = new Date();
  admin.loginHistory.push({ ipAddress, userAgent, success: true });
  
  await admin.save();

  const { accessToken, refreshToken } = generateTokens(admin._id, admin.role);

  // Set refresh token in HttpOnly cookie
  res.cookie('adminRefreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: {
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      accessToken,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.cookie('adminRefreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.adminRefreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret');
    const admin = await Admin.findById(decoded.id);
    
    if (!admin || admin.lockUntil > Date.now()) {
      throw new Error('Invalid admin or locked');
    }

    const { accessToken } = generateTokens(admin._id, admin.role);

    res.json({
      success: true,
      data: { accessToken }
    });
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
});

export const generateTOTPSecret = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  if (!admin) throw ApiError.notFound('Admin not found');

  const secret = speakeasy.generateSecret({
    name: `NexVault Admin (${admin.email})`
  });

  admin.twoFactorSecret = secret.base32;
  await admin.save();

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

  res.json({
    success: true,
    data: {
      secret: secret.base32,
      qrCodeUrl
    }
  });
});

export const verifyAndEnableTOTP = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const admin = await Admin.findById(req.admin._id);

  if (!admin || !admin.twoFactorSecret) {
    throw ApiError.badRequest('TOTP not initialized');
  }

  const isValid = speakeasy.totp.verify({
    secret: admin.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (!isValid) {
    throw ApiError.unauthorized('Invalid TOTP token');
  }

  admin.is2FAEnabled = true;
  await admin.save();

  res.json({ success: true, message: '2FA enabled successfully' });
});

export const disableTOTP = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const admin = await Admin.findById(req.admin._id);

  if (!admin) throw ApiError.notFound('Admin not found');

  const isValid = speakeasy.totp.verify({
    secret: admin.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (!isValid) {
    throw ApiError.unauthorized('Invalid TOTP token');
  }

  admin.is2FAEnabled = false;
  admin.twoFactorSecret = undefined;
  await admin.save();

  res.json({ success: true, message: '2FA disabled successfully' });
});
