import { apiClient } from './apiClient';

export const notificationService = {
  async getNotifications() {
    const res = await apiClient.request('/notifications', { method: 'GET' });
    return res.data;
  },

  async markAsRead(id) {
    const res = await apiClient.request(`/notifications/${id}/read`, { method: 'PATCH' });
    return res.data;
  },

  async markAllAsRead() {
    const res = await apiClient.request('/notifications/read-all', { method: 'PATCH' });
    return res.data;
  }
};
