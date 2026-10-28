import { apiClient } from './apiClient';

export const questionService = {
  async getCategories() {
    const res = await apiClient.request('/questions/categories', { method: 'GET' });
    return res.data;
  },

  async getQuestions(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    const endpoint = queryString ? `/questions?${queryString}` : '/questions';
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res;
  },

  async getQuestionById(id) {
    const res = await apiClient.request(`/questions/${id}`, { method: 'GET' });
    return res.data;
  },

  async createQuestion(payload) {
    const res = await apiClient.request('/questions', {
      method: 'POST',
      data: payload
    });
    return res.data;
  },

  async updateQuestion(id, payload) {
    const res = await apiClient.request(`/questions/${id}`, {
      method: 'PUT',
      data: payload
    });
    return res.data;
  },

  async toggleStatus(id, isActive) {
    const res = await apiClient.request(`/questions/${id}/status`, {
      method: 'PATCH',
      data: { isActive }
    });
    return res.data;
  }
};
