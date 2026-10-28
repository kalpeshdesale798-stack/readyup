import { apiClient } from './apiClient';

export const companyService = {
  async getCompanies() {
    const res = await apiClient.request('/companies', { method: 'GET' });
    return res.data;
  },

  async getCompanyBySlug(slug) {
    const res = await apiClient.request(`/companies/${slug}`, { method: 'GET' });
    return res.data;
  }
};
