import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Adjust in production
  withCredentials: true,
});

// Interceptor to add admin token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token using the HttpOnly cookie
        const res = await axios.post(
          'http://localhost:5000/api/admin/auth/refresh',
          {},
          { withCredentials: true }
        );
        
        if (res.data?.success && res.data?.data?.accessToken) {
          // Save new token
          localStorage.setItem('adminToken', res.data.data.accessToken);
          
          // Update authorization header for the retried request
          originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          
          // Retry the original request with new token
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, clear token and let the app handle logout (e.g. redirect to login)
        localStorage.removeItem('adminToken');
        // You might want to dispatch a logout action here or trigger a page reload
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const adminApi = {
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: (page = 1) => api.get(`/admin/users?page=${page}`),
  toggleBan: (id, isBanned) => api.put(`/admin/users/${id}/ban`, { isBanned }),
  getConfig: () => api.get('/admin/config'),
  updateConfig: (updates) => api.put('/admin/config', { updates }),
};

export default api;
