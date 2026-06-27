import mongoose from 'mongoose';
import Admin from '../src/models/Admin.js';
import { connectDB } from '../src/config/database.js';

const seedAdmin = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const email = 'admin@nexvault.com';
    const password = 'Password123!';

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('Admin already exists!');
      process.exit(0);
    }

    const admin = new Admin({
      email,
      passwordHash: password, // The pre-save hook will hash this
      role: 'SUPER_ADMIN',
    });

    await admin.save();
    console.log(`✅ Super Admin created successfully.`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
