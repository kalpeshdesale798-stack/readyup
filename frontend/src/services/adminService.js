import { apiClient } from './apiClient';

export const adminService = {
  async getDashboard() {
    const res = await apiClient.request('/admin/dashboard', { method: 'GET' });
    return res.data;
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/users?${query}` : '/admin/users';
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res.data;
  },

  async createUser(userData) {
    const res = await apiClient.request('/admin/users', {
      method: 'POST',
      data: userData
    });
    return res.data;
  },

  async updateUserRole(id, role) {
    const res = await apiClient.request(`/admin/users/${id}/role`, {
      method: 'PATCH',
      data: { role }
    });
    return res.data;
  },

  async updateUserStatus(id, isActive) {
    const res = await apiClient.request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      data: { isActive }
    });
    return res.data;
  },

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/admin/audit-logs?${query}` : '/admin/audit-logs';
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res.data;
  }
};
