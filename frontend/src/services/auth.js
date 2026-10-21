import { api } from './api.js';

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: (options = {}) => api.get('/auth/me', options),
  logout: () => api.post('/auth/logout', {}),
};
