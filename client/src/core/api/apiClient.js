/**
 * NexVault — API Client Config
 */

import axios from 'axios';
import store from '../../store/store.js';

// Base URL falls back to localhost if not set in .env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send HttpOnly cookies (for refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    // In a real app, the access token would be managed by an auth slice
    // We are getting it from Redux state (assuming it's stored there, or localStorage)
    const state = store.getState();
    const token = state.auth?.accessToken; // Adjust path based on your auth state

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh & Errors
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {}, {
          withCredentials: true
        });

        const newAccessToken = refreshResponse.data.data.accessToken;
        
        // Dispatch action to update Redux with new token
        // store.dispatch(setAccessToken(newAccessToken));

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed (e.g. refresh token expired)
        // store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }

    // Format error response
    const errMessage = error.response?.data?.error?.message || error.message || 'API Request Failed';
    return Promise.reject(new Error(errMessage));
  }
);

export default apiClient;
