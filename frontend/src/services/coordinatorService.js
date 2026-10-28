import { apiClient, API_BASE_URL } from './apiClient';

export const coordinatorService = {
  async getDashboard() {
    const res = await apiClient.request('/coordinator/dashboard', { method: 'GET' });
    return res.data;
  },

  async downloadTemplate(format = 'xlsx') {
    // Generate CSV template client-side or call backend
    const csvContent = [
      'questionId,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,category,topic,subtopic,difficulty,companies,source,year',
      'QA-TW-001,"A can do a work in 12 days, B in 18 days. Fraction left after 4 days?","4/9","5/9","1/3","2/5",A,"1 - 4*(5/36) = 4/9","Quantitative Aptitude","Time and Work","Combined Work",easy,"TCS, Infosys","TCS NQT 2024",2024'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `readyup_questions_template.${format === 'xlsx' ? 'csv' : 'csv'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async previewImport(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.request('/coordinator/import/preview', {
      method: 'POST',
      data: formData,
      isMultipart: true
    });
    return res.data;
  },

  async confirmImport(importBatchId) {
    const res = await apiClient.request('/coordinator/import/confirm', {
      method: 'POST',
      data: { importBatchId, batchId: importBatchId }
    });
    return res.data;
  },

  async getImportHistory() {
    const res = await apiClient.request('/coordinator/import/history', { method: 'GET' });
    return res.data;
  },

  // Mock Test Monitoring & Scheduling
  async getMockTests(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'All' && v !== 'undefined' && v !== 'null')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = query ? `/coordinator/mock-tests?${query}` : '/coordinator/mock-tests';
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res;
  },

  async getMockTestDetail(testId) {
    const res = await apiClient.request(`/coordinator/mock-tests/${testId}`, { method: 'GET' });
    return res.data;
  },

  async getMockTestAttempts(testId, params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'All' && v !== 'undefined' && v !== 'null')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = query ? `/coordinator/mock-tests/${testId}/attempts?${query}` : `/coordinator/mock-tests/${testId}/attempts`;
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res;
  },

  async getDepartments() {
    const res = await apiClient.request('/coordinator/departments', { method: 'GET' });
    return res.data || [];
  },

  async createMockTest(payload) {
    const res = await apiClient.request('/coordinator/mock-tests', {
      method: 'POST',
      data: payload
    });
    return res.data;
  },

  async updateMockTest(testId, payload) {
    const res = await apiClient.request(`/coordinator/mock-tests/${testId}`, {
      method: 'PUT',
      data: payload
    });
    return res.data;
  },

  async archiveMockTest(testId) {
    const res = await apiClient.request(`/coordinator/mock-tests/${testId}`, {
      method: 'DELETE'
    });
    return res.data;
  },

  async publishMockTest(testId) {
    const res = await apiClient.request(`/coordinator/mock-tests/${testId}/publish`, {
      method: 'PATCH'
    });
    return res.data;
  },

  async assignMockTest(testId, data) {
    const res = await apiClient.request(`/coordinator/mock-tests/${testId}/assign`, {
      method: 'PATCH',
      data
    });
    return res.data;
  },

  // Student Directory & Performance
  async getStudents(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'All' && v !== 'undefined' && v !== 'null')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = query ? `/coordinator/students?${query}` : '/coordinator/students';
    const res = await apiClient.request(endpoint, { method: 'GET' });
    return res;
  },

  async getStudentDetail(studentId) {
    const res = await apiClient.request(`/coordinator/students/${studentId}`, { method: 'GET' });
    return res.data;
  },

  // Performance Insights & Reports
  async getAnalytics() {
    const res = await apiClient.request('/coordinator/analytics', { method: 'GET' });
    return res.data;
  },

  async exportResultsCsv(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'all' && v !== 'All' && v !== 'undefined' && v !== 'null')
    );
    const query = new URLSearchParams(cleanParams).toString();
    const endpoint = query ? `/coordinator/reports/export?${query}` : '/coordinator/reports/export';
    const token = apiClient.getToken();
    const url = `${apiClient.API_BASE_URL || 'http://localhost:5000/api/v1'}${endpoint}`;

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to export CSV report');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `readyup_coordinator_report_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
};
