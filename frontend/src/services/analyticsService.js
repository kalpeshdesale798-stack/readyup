import { apiClient } from './apiClient';

export const analyticsService = {
  async getStudentDashboard() {
    const res = await apiClient.request('/analytics/dashboard', { method: 'GET' });
    return res.data;
  }
};
