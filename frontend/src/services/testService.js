import { apiClient } from './apiClient';

export const testService = {
  async getMockTests(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/tests/mock-tests?${query}` : '/tests/mock-tests';
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res.data;
  },

  async getMockTestById(id) {
    const res = await apiClient.request(`/tests/mock-tests/${id}`, { method: 'GET' });
    return res.data;
  },

  async startPractice(params) {
    const res = await apiClient.request('/tests/practice/start', {
      method: 'POST',
      data: params
    });
    return res.data;
  },

  async startMockTest(testId) {
    const res = await apiClient.request(`/tests/mock-tests/${testId}/start`, {
      method: 'POST'
    });
    return res.data;
  },

  async getAttempt(attemptId) {
    const res = await apiClient.request(`/tests/attempts/${attemptId}`, {
      method: 'GET'
    });
    return res.data;
  },

  async submitAttempt(attemptId, answers) {
    const res = await apiClient.request(`/tests/attempts/${attemptId}/submit`, {
      method: 'POST',
      data: { answers }
    });
    return res.data;
  },

  async getAttemptReview(attemptId) {
    const res = await apiClient.request(`/tests/attempts/${attemptId}/review`, {
      method: 'GET'
    });
    return res.data;
  },

  async getHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/tests/history?${query}` : '/tests/history';
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res.data;
  },

  async getIncorrectQuestions(limit = 100) {
    const res = await apiClient.request(`/tests/incorrect?limit=${limit}`, {
      method: 'GET'
    });
    return res.data;
  },

  async removeIncorrectQuestion(questionId) {
    const res = await apiClient.request(`/tests/incorrect/${encodeURIComponent(questionId)}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async clearAllRevisionItems() {
    const res = await apiClient.request('/tests/revision/clear-all', {
      method: 'POST'
    });
    return res.data;
  },

  async startRevisionDrill(questionIds = []) {
    const res = await apiClient.request('/tests/practice/start', {
      method: 'POST',
      data: {
        isRevision: true,
        questionIds,
        count: questionIds.length || 10
      }
    });
    return res.data;
  }
};
