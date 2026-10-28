// Centralized API Client for ReadyUp Aptitude Platform
// Conforms to ReadyUp API Contract v1.0.0
// Transparently switches to mock store if backend is unreachable

import { mockStore } from './mockStore';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  constructor() {
    this.tokenKey = 'readyup_auth_token';
    this.onUnauthorizedCallback = null;
  }

  setOnUnauthorized(cb) {
    this.onUnauthorizedCallback = cb;
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  async request(endpoint, { method = 'GET', data = null, headers = {}, isMultipart = false } = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const requestHeaders = { ...headers };
    if (!isMultipart) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    let activeToken = token;
    // If user holds a synthetic mock token, check if live backend is online to seamlessly upgrade to live MongoDB session
    if (activeToken && activeToken.startsWith('mock_') && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
      const savedUserStr = localStorage.getItem('readyup_auth_user');
      let savedUser = null;
      try { savedUser = savedUserStr ? JSON.parse(savedUserStr) : null; } catch {}
      const role = savedUser?.role || (activeToken.includes('coordinator') ? 'coordinator' : activeToken.includes('admin') ? 'admin' : 'student');
      const email = savedUser?.email || `${role}@readyup.edu`;

      try {
        const liveAuth = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'Password123!' })
        });
        if (liveAuth.ok) {
          const authJson = await liveAuth.json();
          if (authJson?.data?.token) {
            activeToken = authJson.data.token;
            this.setToken(activeToken);
            if (authJson.data.user) {
              localStorage.setItem('readyup_auth_user', JSON.stringify(authJson.data.user));
            }
          }
        }
      } catch {
        // Backend genuinely unreachable, fall through to offline fallback
      }

      if (activeToken && activeToken.startsWith('mock_')) {
        return this.handleOfflineFallback(endpoint, method, data);
      }
    }

    if (activeToken) {
      requestHeaders['Authorization'] = `Bearer ${activeToken}`;
    }

    const isImportOperation = isMultipart || endpoint.includes('/import');
    const timeoutDuration = isImportOperation ? 60000 : 20000;

    let timedOut = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutDuration);

      const fetchOptions = {
        method,
        headers: requestHeaders,
        signal: controller.signal
      };

      if (data) {
        fetchOptions.body = isMultipart ? data : JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
          this.clearToken();
          localStorage.removeItem('readyup_auth_user');
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        }
        const error = new Error(json?.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.errors = json?.errors || [];
        error.data = json;
        throw error;
      }

      return json;
    } catch (err) {
      // If server responded with any deliberate status code (4xx or 5xx), do not mask it
      if (err.status) {
        throw err;
      }

      if (timedOut) {
        const timeoutErr = new Error(`Request to ${endpoint} timed out after ${timeoutDuration / 1000}s. Please check your network and try again.`);
        timeoutErr.name = 'TimeoutError';
        throw timeoutErr;
      }

      // If user is authenticated in a live session (real backend JWT), do not silently route to mockStore!
      // This prevents split-brain states where preview creates an in-memory batch and publish fails on MongoDB.
      if (token && !token.startsWith('mock_')) {
        console.error(`[ReadyUp API] Network request failed for authenticated endpoint ${endpoint}:`, err.message);
        throw err;
      }

      console.warn(`[ReadyUp API] Live backend network unreachable at ${url}. Using offline development fallback.`);
      // If backend network is strictly unreachable or offline, fallback to mockStore for development continuity
      return this.handleOfflineFallback(endpoint, method, data);
    }
  }

  async handleOfflineFallback(endpoint, method, data) {
    // Artificial small delay for realistic UI transition
    await new Promise((r) => setTimeout(r, 120));

    // Route matching for mockStore
    if (endpoint === '/health') {
      return { status: 'healthy', timestamp: new Date().toISOString(), service: 'ReadyUp Aptitude Backend API (Mock Fallback)', version: '1.0.0' };
    }

    // Auth
    if (endpoint === '/auth/login' && method === 'POST') {
      const result = mockStore.login(data.email, data.password, data.requiredRole || data.role);
      this.setToken(result.token);
      return { success: true, message: 'Logged in successfully', data: result };
    }
    if (endpoint === '/auth/register' && method === 'POST') {
      const result = mockStore.register(data);
      return { success: true, message: 'Account created successfully. Please log in.', data: { user: result.user } };
    }
    if (endpoint === '/auth/logout' && method === 'POST') {
      this.clearToken();
      return { success: true, message: 'Logged out successfully', data: null };
    }
    if (endpoint === '/auth/me' && method === 'GET') {
      const student = mockStore.getStudentDashboard().student;
      return { success: true, message: 'User retrieved', data: student };
    }
    if (endpoint === '/auth/profile' && method === 'PUT') {
      const student = mockStore.getStudentDashboard().student;
      const updated = mockStore.updateProfile(student._id, data);
      return { success: true, message: 'Profile updated successfully', data: updated };
    }
    if (endpoint === '/auth/change-password' && method === 'PUT') {
      return { success: true, message: 'Password changed successfully', data: null };
    }
    if (endpoint === '/auth/forgot-password' && method === 'POST') {
      const res = mockStore.forgotPassword(data.email, data.role);
      return res;
    }
    if (endpoint === '/auth/reset-password' && method === 'POST') {
      const res = mockStore.resetPassword(data.token, data.password);
      return res;
    }

    // Questions & Categories
    if (endpoint === '/questions/categories' && method === 'GET') {
      return { success: true, message: 'Categories retrieved successfully', data: mockStore.getCategories() };
    }
    if (endpoint.startsWith('/questions') && method === 'GET') {
      if (endpoint === '/questions' || endpoint.includes('?')) {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const res = mockStore.getQuestions(Object.fromEntries(urlParams.entries()));
        return { success: true, message: 'Questions retrieved successfully', data: res.data, pagination: res.pagination };
      }
      const qId = endpoint.split('/')[2];
      return { success: true, message: 'Question retrieved', data: mockStore.getQuestionById(qId) };
    }
    if (endpoint === '/questions' && method === 'POST') {
      const newQ = mockStore.addQuestion(data);
      return { success: true, message: 'Question created successfully', data: newQ };
    }
    if (endpoint.startsWith('/questions/') && method === 'PUT') {
      const qId = endpoint.split('/')[2];
      const updated = mockStore.updateQuestion(qId, data);
      return { success: true, message: 'Question updated successfully', data: updated };
    }
    if (endpoint.includes('/status') && method === 'PATCH') {
      const parts = endpoint.split('/');
      const qId = parts[2];
      const updated = mockStore.toggleQuestionStatus(qId, data.isActive);
      return { success: true, message: 'Question status updated', data: updated };
    }

    // Companies
    if (endpoint === '/companies' && method === 'GET') {
      return { success: true, message: 'Companies retrieved successfully', data: mockStore.getCompanies() };
    }
    if (endpoint.startsWith('/companies/') && method === 'GET') {
      const slug = endpoint.split('/')[2];
      return { success: true, message: 'Company details retrieved', data: mockStore.getCompanyBySlug(slug) };
    }

    // Tests & Practice
    if (endpoint === '/tests/mock-tests' && method === 'GET') {
      return { success: true, message: 'Mock tests retrieved', data: mockStore.getMockTests() };
    }
    if (endpoint.startsWith('/tests/mock-tests/') && method === 'GET') {
      const testId = endpoint.split('/')[3];
      return { success: true, message: 'Mock test retrieved', data: mockStore.getMockTestById(testId) };
    }
    if (endpoint === '/tests/practice/start' && method === 'POST') {
      const session = mockStore.startPracticeSession(data);
      return { success: true, message: 'Practice session initialized successfully', data: session };
    }
    if (endpoint.includes('/mock-tests/') && endpoint.endsWith('/start') && method === 'POST') {
      const testId = endpoint.split('/')[3];
      const session = mockStore.startMockTest(testId);
      return { success: true, message: 'Mock test started. Timer is now running.', data: session };
    }
    if (endpoint.includes('/attempts/') && endpoint.endsWith('/submit') && method === 'POST') {
      const attemptId = endpoint.split('/')[3];
      const result = mockStore.submitAttempt(attemptId, data);
      return { success: true, message: 'Test submitted and scored successfully', data: result };
    }
    if (endpoint.includes('/attempts/') && endpoint.endsWith('/review') && method === 'GET') {
      const attemptId = endpoint.split('/')[3];
      const review = mockStore.getAttemptReview(attemptId);
      return { success: true, message: 'Review retrieved', data: review };
    }
    if (endpoint.includes('/attempts/') && !endpoint.includes('/review') && !endpoint.includes('/submit') && method === 'GET') {
      const attemptId = endpoint.split('/')[3];
      const session = mockStore.getAttemptSession ? mockStore.getAttemptSession(attemptId) : null;
      return { success: true, message: 'Attempt retrieved', data: session };
    }
    if (endpoint === '/tests/history' && method === 'GET') {
      return { success: true, message: 'History retrieved', data: mockStore.getTestHistory() };
    }
    if (endpoint === '/tests/incorrect' && method === 'GET') {
      return { success: true, message: 'Incorrect questions retrieved', data: mockStore.getIncorrectQuestions() };
    }
    if ((endpoint === '/tests/revision/clear-all' && method === 'POST') || (endpoint === '/tests/incorrect/all' && method === 'DELETE')) {
      mockStore.clearAllRevisionItems();
      return { success: true, message: 'All active revision items cleared successfully', data: null };
    }
    if (endpoint.startsWith('/tests/incorrect/') && method === 'DELETE') {
      const qId = decodeURIComponent(endpoint.split('/')[3] || '');
      mockStore.removeIncorrectQuestion(qId);
      return { success: true, message: 'Question removed from revision centre', data: { questionId: qId } };
    }

    // Bookmarks
    if (endpoint === '/bookmarks' && method === 'GET') {
      return { success: true, message: 'Bookmarks retrieved', data: mockStore.getBookmarks() };
    }
    if (endpoint === '/bookmarks' && method === 'POST') {
      const bmk = mockStore.addBookmark(data);
      return { success: true, message: 'Bookmark added successfully', data: bmk };
    }
    if (endpoint.startsWith('/bookmarks/') && method === 'DELETE') {
      const qId = endpoint.split('/')[2];
      mockStore.removeBookmark(qId);
      return { success: true, message: 'Bookmark removed successfully', data: null };
    }

    // Analytics
    if (endpoint === '/analytics/dashboard' && method === 'GET') {
      return { success: true, message: 'Student dashboard retrieved', data: mockStore.getStudentDashboard() };
    }

    // Coordinator
    if (endpoint === '/coordinator/dashboard' && method === 'GET') {
      return { success: true, message: 'Coordinator dashboard retrieved', data: mockStore.getCoordinatorDashboard() };
    }
    if (endpoint === '/coordinator/departments' && method === 'GET') {
      return { success: true, message: 'Departments retrieved', data: mockStore.getDepartments() };
    }
    if (endpoint === '/coordinator/mock-tests' && method === 'POST') {
      const created = mockStore.createMockTest(data);
      return { success: true, message: 'Mock test created successfully', data: created };
    }
    if (endpoint.startsWith('/coordinator/mock-tests/') && method === 'PUT') {
      const testId = endpoint.split('/')[3];
      const updated = mockStore.updateMockTest(testId, data);
      return { success: true, message: 'Mock test updated successfully', data: updated };
    }
    if (
      (endpoint.startsWith('/coordinator/mock-tests/') && method === 'DELETE') ||
      (endpoint.includes('/mock-tests/') && endpoint.endsWith('/archive'))
    ) {
      const testId = endpoint.split('/')[3];
      const archived = mockStore.archiveMockTest(testId);
      return { success: true, message: 'Mock test safely archived', data: archived };
    }
    if (
      endpoint.includes('/mock-tests/') &&
      endpoint.endsWith('/publish') &&
      (method === 'PATCH' || method === 'POST')
    ) {
      const testId = endpoint.split('/')[3];
      const published = mockStore.publishCoordinatorMockTest
        ? mockStore.publishCoordinatorMockTest(testId)
        : mockStore.updateMockTest(testId, { status: 'published', isActive: true });
      return { success: true, message: 'Mock test published successfully', data: published };
    }
    if (endpoint.startsWith('/coordinator/mock-tests') && method === 'GET') {
      if (endpoint === '/coordinator/mock-tests' || endpoint.includes('?')) {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const res = mockStore.getCoordinatorMockTests(Object.fromEntries(urlParams.entries()));
        return { success: true, message: 'Mock test monitoring data retrieved', data: res.data, pagination: res.pagination };
      }
      if (endpoint.endsWith('/attempts') || endpoint.includes('/attempts?')) {
        const parts = endpoint.split('/');
        const testId = parts[3];
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const res = mockStore.getCoordinatorMockTestAttempts(testId, Object.fromEntries(urlParams.entries()));
        return { success: true, message: 'Mock test attempts retrieved', data: res.data, pagination: res.pagination };
      }
      const testId = endpoint.split('/')[3];
      return { success: true, message: 'Mock test details retrieved', data: mockStore.getCoordinatorMockTestDetail(testId) };
    }
    if (endpoint.includes('/mock-tests/') && endpoint.endsWith('/assign') && method === 'PATCH') {
      const testId = endpoint.split('/')[3];
      const updated = mockStore.assignCoordinatorMockTest(testId, data);
      return { success: true, message: 'Mock test assigned and scheduled', data: updated };
    }
    if (endpoint.startsWith('/coordinator/students') && method === 'GET') {
      if (endpoint === '/coordinator/students' || endpoint.includes('?')) {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const res = mockStore.getCoordinatorStudents(Object.fromEntries(urlParams.entries()));
        return { success: true, message: 'Students retrieved', data: res.data, pagination: res.pagination };
      }
      const studentId = endpoint.split('/')[3];
      return { success: true, message: 'Student detail retrieved', data: mockStore.getCoordinatorStudentDetail(studentId) };
    }
    if (endpoint === '/coordinator/analytics' && method === 'GET') {
      return { success: true, message: 'Analytics retrieved', data: mockStore.getCoordinatorAnalytics() };
    }
    if (endpoint === '/coordinator/import/preview' && method === 'POST') {
      const file = data?.get?.('file') || data?.file;
      const preview = await mockStore.previewSpreadsheetImport({ file });
      return { success: true, message: `Spreadsheet parsed successfully. ${preview.validRowsCount} valid rows ready for review.`, data: preview };
    }
    if (endpoint === '/coordinator/import/confirm' && method === 'POST') {
      const batchId = data?.importBatchId || data?.batchId;
      const confirmed = mockStore.confirmSpreadsheetImport(batchId);
      return { success: true, message: 'Import confirmed and published successfully into question bank', data: confirmed };
    }
    if (endpoint === '/coordinator/import/history' && method === 'GET') {
      return { success: true, message: 'Import history retrieved', data: mockStore.coordinator.importHistory };
    }

    // Admin
    if (endpoint === '/admin/dashboard' && method === 'GET') {
      return { success: true, message: 'Admin dashboard retrieved', data: mockStore.getAdminDashboard() };
    }
    if (endpoint.startsWith('/admin/users') && method === 'GET') {
      return { success: true, message: 'Users retrieved', data: mockStore.getAdminUsers() };
    }
    if (endpoint === '/admin/users' && method === 'POST') {
      const newUser = mockStore.createUser(data);
      return { success: true, message: 'User provisioned successfully', data: newUser };
    }
    if (endpoint.includes('/role') && method === 'PATCH') {
      const userId = endpoint.split('/')[3];
      const updated = mockStore.updateUserRole(userId, data.role);
      return { success: true, message: 'Role updated successfully', data: updated };
    }
    if (endpoint.includes('/status') && method === 'PATCH') {
      const userId = endpoint.split('/')[3];
      const updated = mockStore.updateUserStatus(userId, data.isActive);
      return { success: true, message: 'Status updated successfully', data: updated };
    }
    if (endpoint.startsWith('/admin/audit-logs') && method === 'GET') {
      return { success: true, message: 'Audit logs retrieved', data: mockStore.getAuditLogs() };
    }

    // Default envelope
    return { success: true, message: 'Operation completed', data: null };
  }
}

export const apiClient = new ApiClient();
