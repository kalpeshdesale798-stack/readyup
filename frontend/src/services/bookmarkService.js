import { apiClient } from './apiClient';

export const bookmarkService = {
  async getBookmarks(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/bookmarks?${query}` : '/bookmarks';
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res.data;
  },

  async addBookmark(questionId, note = '') {
    const res = await apiClient.request('/bookmarks', {
      method: 'POST',
      data: { questionId, note }
    });
    return res.data;
  },

  async removeBookmark(questionId) {
    const res = await apiClient.request(`/bookmarks/${questionId}`, {
      method: 'DELETE'
    });
    return res;
  }
};
