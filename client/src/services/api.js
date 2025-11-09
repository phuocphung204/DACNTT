import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me')
};

// Request services
export const requestService = {
  createRequest: (requestData) => api.post('/requests', requestData),
  getMyRequests: () => api.get('/requests/my-requests'),
  getAllRequests: (filters) => api.get('/requests', { params: filters }),
  getRequestById: (id) => api.get(`/requests/${id}`),
  updateRequestStatus: (id, data) => api.put(`/requests/${id}/status`, data),
  deleteRequest: (id) => api.delete(`/requests/${id}`),
  getStatistics: () => api.get('/requests/statistics/overview')
};

export default api;
