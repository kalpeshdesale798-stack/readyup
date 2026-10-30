// Stateful in-memory mock store with localStorage persistence
// Powers offline functionality and full interactivity matching the API contract 1:1

import { ALLOWED_DEPARTMENTS, isValidInstitutionalEmail, normalizeEmail, normalizeDepartment } from '../constants/departments.js';
import {
  initialCategories,
  initialQuestions,
  initialCompanies,
  initialMockTests,
  initialStudentData,
  initialBookmarks,
  initialCoordinatorData,
  initialAdminData
} from './mockData.js';

const STORAGE_KEYS = {
  CATEGORIES: 'readyup_mock_categories',
  QUESTIONS: 'readyup_mock_questions',
  COMPANIES: 'readyup_mock_companies',
  MOCK_TESTS: 'readyup_mock_tests',
  STUDENT_DASHBOARD: 'readyup_mock_student_dashboard',
  BOOKMARKS: 'readyup_mock_bookmarks',
  ATTEMPTS: 'readyup_mock_attempts',
  COORDINATOR: 'readyup_mock_coordinator',
  ADMIN_USERS: 'readyup_mock_admin_users',
  ADMIN_LOGS: 'readyup_mock_admin_logs',
  CURRENT_USER: 'readyup_mock_auth_user'
};

function getStored(key, defaultValue) {
  try {
    if (typeof localStorage === 'undefined') return defaultValue;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.warn('Error reading from localStorage:', err);
    return defaultValue;
  }
}

function setStored(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Error saving to localStorage:', err);
  }
}

function parseCSVToRows(text) {
  const cleanText = text.replace(/^\uFEFF/, '');
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentCell);
        if (currentRow.some((c) => c.trim().length > 0)) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell);
        if (currentRow.some((c) => c.trim().length > 0)) rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((c) => c.trim().length > 0)) rows.push(currentRow);
  }
  return rows;
}

class MockStore {
  constructor() {
    this.categories = getStored(STORAGE_KEYS.CATEGORIES, initialCategories);
    this.questions = getStored(STORAGE_KEYS.QUESTIONS, initialQuestions);
    this.companies = getStored(STORAGE_KEYS.COMPANIES, initialCompanies);
    this.mockTests = getStored(STORAGE_KEYS.MOCK_TESTS, initialMockTests);
    this.studentDashboard = getStored(STORAGE_KEYS.STUDENT_DASHBOARD, initialStudentData);
    this.bookmarks = getStored(STORAGE_KEYS.BOOKMARKS, initialBookmarks);
    this.attempts = getStored(STORAGE_KEYS.ATTEMPTS, initialStudentData.recentAttempts);
    this.coordinator = getStored(STORAGE_KEYS.COORDINATOR, initialCoordinatorData);
    this.users = getStored(STORAGE_KEYS.ADMIN_USERS, initialAdminData.users);
    this.auditLogs = getStored(STORAGE_KEYS.ADMIN_LOGS, initialAdminData.auditLogs);
    this.pendingBatches = {};
  }

  saveState() {
    setStored(STORAGE_KEYS.CATEGORIES, this.categories);
    setStored(STORAGE_KEYS.QUESTIONS, this.questions);
    setStored(STORAGE_KEYS.COMPANIES, this.companies);
    setStored(STORAGE_KEYS.MOCK_TESTS, this.mockTests);
    setStored(STORAGE_KEYS.STUDENT_DASHBOARD, this.studentDashboard);
    setStored(STORAGE_KEYS.BOOKMARKS, this.bookmarks);
    setStored(STORAGE_KEYS.ATTEMPTS, this.attempts);
    setStored(STORAGE_KEYS.COORDINATOR, this.coordinator);
    setStored(STORAGE_KEYS.ADMIN_USERS, this.users);
    setStored(STORAGE_KEYS.ADMIN_LOGS, this.auditLogs);
  }

  getActiveUser() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('readyup_auth_user');
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return this.users?.find((u) => u.role === 'coordinator') || null;
  }

  isCoordinatorAuthorizedForTest(user, test) {
    if (!user || !test) return false;

    // Strict: Inactive or archived tests are not accessible to coordinators or admins
    if (test.isActive === false || test.status === 'archived') {
      return false;
    }

    if (user.role === 'admin') return true;
    if (user.role !== 'coordinator') return false;

    const testCreatorId = test.createdBy ? (test.createdBy._id ? String(test.createdBy._id) : String(test.createdBy)) : null;
    const userId = user._id ? String(user._id) : (user.id ? String(user.id) : null);

    // 1. Author ownership
    if (testCreatorId && userId && testCreatorId === userId) {
      return true;
    }

    // 2. Department exact match (case-insensitive)
    const userDept = typeof user.department === 'string' ? user.department.trim().toLowerCase() : '';
    if (userDept && Array.isArray(test.assignedDepartments)) {
      const hasDeptMatch = test.assignedDepartments.some((d) => {
        if (typeof d !== 'string') return false;
        return d.trim().toLowerCase() === userDept;
      });
      if (hasDeptMatch) return true;
    }

    // 3. Open institutional test: createdBy must be null/missing AND BOTH departments and batches must be unrestricted
    const isArrayUnrestricted = (arr, allowedTokens) => {
      if (!arr || !Array.isArray(arr) || arr.length === 0) return true;
      return arr.every((item) => {
        if (typeof item !== 'string') return false;
        return allowedTokens.includes(item.trim().toLowerCase());
      });
    };

    const isDeptsOpen = isArrayUnrestricted(test.assignedDepartments, ['all', 'all departments']);
    const isBatchesOpen = isArrayUnrestricted(test.assignedBatches, ['all', 'all batches']);
    const isInstitutional = (!testCreatorId) && isDeptsOpen && isBatchesOpen;

    return isInstitutional;
  }

  // --- Auth & Users ---
  login(email, password, requiredRole) {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidInstitutionalEmail(normalizedEmail)) {
      throw { status: 400, message: 'Only institutional email addresses ending in @kkwagh.edu.in are allowed' };
    }
    const user = this.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw { status: 401, message: 'Invalid email or password' };
    }
    if (user.isActive === false) {
      throw { status: 403, message: 'This account has been deactivated. Please contact an administrator.' };
    }
    if (requiredRole && typeof requiredRole === 'string' && requiredRole.trim()) {
      const expected = requiredRole.trim().toLowerCase();
      if (user.role.toLowerCase() !== expected) {
        throw {
          status: 403,
          code: 'ROLE_MISMATCH',
          message: `Access denied. Your account is registered as a ${user.role}. Please sign in via the ${user.role} login portal.`
        };
      }
    }
    const token = 'mock_jwt_token_' + user.role + '_' + Date.now();
    user.lastLoginAt = new Date().toISOString();
    this.saveState();

    this.addAuditLog({
      action: 'USER_LOGIN',
      performedBy: `${user.name} (${user.email})`,
      targetType: 'AUTH',
      details: `Successful ${user.role} sign-in`
    });

    return { user, token };
  }

  register(userData) {
    const normalizedEmail = normalizeEmail(userData.email);
    if (!isValidInstitutionalEmail(normalizedEmail)) {
      throw { status: 400, message: 'Only institutional email addresses ending in @kkwagh.edu.in are allowed' };
    }
    if (!userData.department || !ALLOWED_DEPARTMENTS.includes(userData.department.trim())) {
      throw { status: 400, message: 'Please select a valid department from the institutional options.' };
    }
    const exists = this.users.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (exists) {
      throw { status: 409, message: 'An account with this email address already exists' };
    }

    const newUser = {
      _id: 'usr_' + Date.now(),
      name: userData.name,
      email: normalizedEmail,
      role: userData.role || 'student',
      department: userData.department.trim(),
      college: userData.college || 'National Institute of Technology',
      graduationYear: userData.graduationYear ? Number(userData.graduationYear) : 2026,
      studentId: userData.studentId || `STU-${Date.now().toString().slice(-4)}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    this.users.unshift(newUser);
    this.saveState();

    return { user: newUser };
  }

  updateProfile(userId, updateData) {
    const user = this.users.find((u) => u._id === userId);
    if (!user) throw { status: 404, message: 'User not found' };

    if (updateData.department !== undefined) {
      const trimmed = String(updateData.department).trim();
      if (!ALLOWED_DEPARTMENTS.includes(trimmed) && user.department !== trimmed) {
        throw { status: 400, message: 'Please select a valid department from the institutional options.' };
      }
    }

    Object.assign(user, {
      name: updateData.name || user.name,
      department: updateData.department !== undefined ? String(updateData.department).trim() : user.department,
      college: updateData.college !== undefined ? updateData.college : user.college,
      graduationYear: updateData.graduationYear ? Number(updateData.graduationYear) : user.graduationYear,
      studentId: updateData.studentId !== undefined ? updateData.studentId : user.studentId
    });

    this.saveState();
    return user;
  }

  forgotPassword(email, role) {
    const rawToken = 'mock_reset_' + Date.now();
    return {
      success: true,
      emailConfigured: false,
      message: 'Email delivery configuration is not configured on this server (SMTP settings missing). For verification and testing, your reset token has been generated below.',
      data: {
        resetToken: rawToken,
        email,
        role: role || 'student',
        expiresInMinutes: 15
      }
    };
  }

  resetPassword(token, password) {
    return {
      success: true,
      message: 'Password has been successfully reset. You can now sign in with your new password.',
      data: null
    };
  }

  // --- Categories & Questions ---
  getCategories() {
    return this.categories;
  }

  getQuestions({ category, topic, subtopic, difficulty, company, search, page = 1, limit = 20 } = {}) {
    let filtered = [...this.questions];

    if (category) {
      filtered = filtered.filter((q) => q.category.toLowerCase() === category.toLowerCase());
    }
    if (topic) {
      filtered = filtered.filter((q) => q.topic.toLowerCase() === topic.toLowerCase());
    }
    if (subtopic) {
      filtered = filtered.filter((q) => q.subtopic && q.subtopic.toLowerCase() === subtopic.toLowerCase());
    }
    if (difficulty) {
      filtered = filtered.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (company) {
      filtered = filtered.filter((q) => q.companies && q.companies.some((c) => c.toLowerCase() === company.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.questionId.toLowerCase().includes(q) ||
          item.questionText.toLowerCase().includes(q) ||
          item.topic.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(startIndex, startIndex + Number(limit));

    return {
      data: paginated,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
        hasNextPage: startIndex + Number(limit) < total,
        hasPrevPage: Number(page) > 1
      }
    };
  }

  getQuestionById(id) {
    const q = this.questions.find((item) => item._id === id || item.questionId === id);
    if (!q) throw { status: 404, message: 'Question not found' };
    return q;
  }

  addQuestion(payload) {
    const exists = this.questions.some((q) => q.questionId === payload.questionId);
    if (exists) throw { status: 409, message: `Question ID '${payload.questionId}' already exists.` };

    const newQ = {
      _id: 'q_' + Date.now(),
      ...payload,
      isVerified: true,
      isActive: payload.isActive !== undefined ? payload.isActive : true
    };
    this.questions.unshift(newQ);
    this.saveState();
    return newQ;
  }

  updateQuestion(id, payload) {
    const q = this.questions.find((item) => item._id === id || item.questionId === id);
    if (!q) throw { status: 404, message: 'Question not found' };

    Object.assign(q, payload);
    this.saveState();
    return q;
  }

  toggleQuestionStatus(id, isActive) {
    const q = this.questions.find((item) => item._id === id || item.questionId === id);
    if (!q) throw { status: 404, message: 'Question not found' };
    q.isActive = isActive;
    this.saveState();
    return q;
  }

  // --- Companies ---
  getCompanies() {
    return this.companies;
  }

  getCompanyBySlug(slug) {
    const comp = this.companies.find((c) => c.slug.toLowerCase() === slug.toLowerCase() || c.name.toLowerCase() === slug.toLowerCase());
    if (!comp) throw { status: 404, message: 'Company not found' };
    return comp;
  }

  // --- Mock Tests & Practice Sessions ---
  getMockTests({ company, type } = {}) {
    let filtered = [...this.mockTests].filter(
      (t) => t.isActive !== false && t.status !== 'draft' && t.status !== 'archived'
    );
    if (company) filtered = filtered.filter((t) => (t.company || '').toLowerCase() === company.toLowerCase());
    if (type) filtered = filtered.filter((t) => t.type === type);

    const now = new Date();
    return filtered.map((t) => {
      let scheduleStatus = 'live';
      if (t.startDate && now < new Date(t.startDate)) {
        scheduleStatus = 'upcoming';
      } else if (t.endDate && now > new Date(t.endDate)) {
        scheduleStatus = 'closed';
      }

      // Match attempt strictly by stable mock-test ID
      const testId = String(t._id || t.id);
      const matchingAttempt = (this.attempts || []).find((a) => {
        const attemptTestId = a.mockTestId || a.testId || a.mockTest;
        return attemptTestId ? String(attemptTestId) === testId : false;
      });

      const userAttempt = t.userAttempt || (matchingAttempt ? {
        attemptId: matchingAttempt.id || matchingAttempt.attemptId,
        status: matchingAttempt.status || 'completed',
        score: matchingAttempt.score,
        result: matchingAttempt.passed ? 'passed' : 'failed'
      } : null);

      return {
        ...t,
        scheduleStatus,
        totalMarks: t.totalMarks || t.totalQuestions || 15,
        passingMarks: Math.round(((t.totalMarks || t.totalQuestions || 15) * (t.passingScore || 60)) / 100),
        userAttempt
      };
    });
  }

  getMockTestById(id) {
    const test = this.mockTests.find((t) => t._id === id || t.slug === id);
    if (!test) throw { status: 404, message: 'Mock test not found' };
    return test;
  }

  startPracticeSession({ category, topic, difficulty, company, count = 10, isRevision, questionIds } = {}) {
    let available = [...this.questions];
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      const qIdSet = new Set(questionIds.map((id) => String(id).toUpperCase()));
      available = this.questions.filter((q) => qIdSet.has(q.questionId?.toUpperCase()) || qIdSet.has(q._id));
    } else {
      if (category) available = available.filter((q) => q.category.toLowerCase() === category.toLowerCase());
      if (topic) available = available.filter((q) => q.topic.toLowerCase() === topic.toLowerCase());
      if (difficulty) available = available.filter((q) => q.difficulty.toLowerCase() === difficulty.toLowerCase());
      if (company) available = available.filter((q) => q.companies && q.companies.some((c) => c.toLowerCase() === company.toLowerCase()));
    }

    if (available.length === 0) {
      available = [...this.questions]; // fallback to all available
    }

    const selected = available.slice(0, count || 10);
    const attemptId = 'att_' + Date.now();

    // Strip answers from questions payload per API spec
    const strippedQuestions = selected.map((q) => ({
      _id: q._id,
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty
    }));

    const session = {
      attemptId,
      title: isRevision ? 'Revision Practice Drill' : `Practice: ${topic || category || 'Comprehensive Drill'}`,
      type: 'practice',
      totalQuestions: strippedQuestions.length,
      startedAt: new Date().toISOString(),
      questions: strippedQuestions,
      originalQuestionIds: selected.map((q) => q.questionId)
    };

    this.pendingBatches[attemptId] = session;
    return session;
  }

  startMockTest(testId) {
    const test = this.getMockTestById(testId);
    const attemptId = 'att_' + Date.now();
    const durationMinutes = test.durationMinutes || 30;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const questions = this.questions.filter((q) => test.questionIds.includes(q.questionId));
    const fallbackQuestions = questions.length > 0 ? questions : this.questions.slice(0, test.totalQuestions || 8);

    const strippedQuestions = fallbackQuestions.map((q) => ({
      _id: q._id,
      questionId: q.questionId,
      questionText: q.questionText,
      options: q.options,
      category: q.category,
      topic: q.topic,
      difficulty: q.difficulty
    }));

    const session = {
      attemptId,
      mockTestId: test._id,
      title: test.title,
      company: test.company,
      type: 'mock_test',
      durationMinutes,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      instructions: test.instructions,
      startedAt: new Date().toISOString(),
      expiresAt,
      questions: strippedQuestions,
      originalQuestionIds: fallbackQuestions.map((q) => q.questionId)
    };

    this.pendingBatches[attemptId] = session;
    return session;
  }

  submitAttempt(attemptId, { answers = [] }) {
    const session = this.pendingBatches[attemptId];
    const questionList = this.questions;

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    const answerMap = new Map();
    answers.forEach((ans) => answerMap.set(ans.questionId, ans));

    const totalQuestions = session?.questions?.length || answers.length || 1;
    const detailedAnswers = [];
    const topicStats = {};

    (session?.questions || questionList.slice(0, totalQuestions)).forEach((qItem) => {
      const original = questionList.find((q) => q.questionId === qItem.questionId) || qItem;
      const studentAns = answerMap.get(qItem.questionId);
      const isAttempted = studentAns && studentAns.selectedOption;
      const isCorrect = isAttempted && studentAns.selectedOption === original.correctOption;

      if (!topicStats[original.topic]) {
        topicStats[original.topic] = {
          topic: original.topic,
          category: original.category,
          total: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0
        };
      }
      topicStats[original.topic].total += 1;

      if (isAttempted) {
        topicStats[original.topic].attempted += 1;
        if (isCorrect) {
          correctCount += 1;
          topicStats[original.topic].correct += 1;
        } else {
          incorrectCount += 1;
          topicStats[original.topic].incorrect += 1;
        }
      } else {
        unansweredCount += 1;
      }

      detailedAnswers.push({
        questionId: original.questionId,
        questionText: original.questionText,
        options: original.options,
        selectedOption: studentAns?.selectedOption || null,
        correctOption: original.correctOption,
        isCorrect: Boolean(isCorrect),
        explanation: original.explanation,
        topic: original.topic,
        category: original.category,
        difficulty: original.difficulty,
        timeSpentSeconds: studentAns?.timeSpentSeconds || 0
      });
    });

    const score = correctCount;
    const percentage = Number(((score / totalQuestions) * 100).toFixed(1));
    const passed = percentage >= 60.0;

    const topicBreakdown = Object.values(topicStats).map((stat) => ({
      ...stat,
      unanswered: stat.total - stat.attempted,
      accuracy: stat.attempted > 0 ? Number(((stat.correct / stat.attempted) * 100).toFixed(1)) : 0
    }));

    const recommendations = topicBreakdown.map((stat) => {
      if (stat.accuracy >= 75) {
        return {
          topic: stat.topic,
          category: stat.category,
          accuracy: stat.accuracy,
          status: 'strong',
          message: `Strong performance in ${stat.topic} (${stat.accuracy}%). Ready for placement test level questions.`
        };
      }
      return {
        topic: stat.topic,
        category: stat.category,
        accuracy: stat.accuracy,
        status: 'weak',
        message: `Practice recommended for ${stat.topic} (${stat.accuracy}% accuracy). Review foundational concepts and formulas.`
      };
    });

    const result = {
      attemptId,
      title: session?.title || 'Practice Assessment',
      type: session?.type || 'practice',
      company: session?.company || 'General',
      status: 'completed',
      submittedAt: new Date().toISOString(),
      durationSeconds: 900,
      totalQuestions,
      attemptedCount: correctCount + incorrectCount,
      correctCount,
      incorrectCount,
      unansweredCount,
      score,
      totalMarks: totalQuestions,
      percentage,
      passed,
      topicBreakdown,
      recommendations,
      detailedAnswers
    };

    // Record in attempts history
    this.attempts.unshift({
      id: attemptId,
      mockTestId: session?.mockTestId || session?.testId,
      testId: session?.mockTestId || session?.testId,
      title: result.title,
      type: result.type,
      submittedAt: result.submittedAt,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      passed: result.passed,
      statusBadge: result.passed ? 'Passed' : 'Needs Review',
      reviewData: result
    });

    // Update student metrics
    this.studentDashboard.recentAttempts = this.attempts.slice(0, 5);
    this.saveState();

    return result;
  }

  getAttemptReview(attemptId) {
    const attempt = this.attempts.find((a) => a.id === attemptId);
    if (attempt && attempt.reviewData) {
      return attempt.reviewData;
    }
    // Return sample review if direct attempt not stored
    return this.attempts[0]?.reviewData || null;
  }

  getAttemptSession(attemptId) {
    const attempt = this.attempts.find((a) => a.id === attemptId);
    if (attempt) {
      return {
        attemptId: attempt.id,
        mockTestId: attempt.testId,
        title: attempt.title,
        durationMinutes: attempt.durationMinutes || 45,
        totalQuestions: attempt.totalQuestions || (attempt.questions?.length || 15),
        questions: (attempt.questions || this.questions.slice(0, 15)).map((q) => ({
          _id: q._id || q.id,
          questionId: q.questionId,
          questionText: q.questionText,
          options: q.options,
          category: q.category,
          topic: q.topic,
          difficulty: q.difficulty,
        })),
        startTime: attempt.startTime || new Date().toISOString(),
      };
    }
    return null;
  }

  getTestHistory() {
    return this.attempts;
  }

  getIncorrectQuestions() {
    // Unique questions marked incorrect across attempts
    const incorrectIds = new Set();
    this.attempts.forEach((att) => {
      if (att.reviewData?.detailedAnswers) {
        att.reviewData.detailedAnswers.forEach((ans) => {
          if (ans.selectedOption && !ans.isCorrect) {
            incorrectIds.add(ans.questionId);
          }
        });
      }
    });

    const dismissed = new Set(this.dismissedIncorrectIds || []);

    // Provide default incorrects if none yet
    if (incorrectIds.size === 0) {
      return [this.questions[1], this.questions[2]].filter((q) => !dismissed.has(q.questionId));
    }

    return this.questions.filter((q) => incorrectIds.has(q.questionId) && !dismissed.has(q.questionId));
  }

  // --- Bookmarks ---
  getBookmarks() {
    return this.bookmarks;
  }

  addBookmark({ questionId, note = '' }) {
    const existingIndex = this.bookmarks.findIndex((b) => b.questionId === questionId);
    const question = this.questions.find((q) => q.questionId === questionId || q._id === questionId);

    const bookmark = {
      _id: 'bmk_' + Date.now(),
      questionId: question ? question.questionId : questionId,
      note,
      createdAt: new Date().toISOString(),
      question: question || null
    };

    if (existingIndex >= 0) {
      this.bookmarks[existingIndex] = bookmark;
    } else {
      this.bookmarks.unshift(bookmark);
    }

    this.studentDashboard.bookmarkCount = this.bookmarks.length;
    this.saveState();
    return bookmark;
  }

  removeBookmark(questionId) {
    this.bookmarks = this.bookmarks.filter(
      (b) => b.questionId !== questionId && b._id !== questionId && b.question?._id !== questionId
    );
    this.studentDashboard.bookmarkCount = this.bookmarks.length;
    this.saveState();
    return { success: true };
  }

  removeIncorrectQuestion(questionId) {
    if (!this.dismissedIncorrectIds) this.dismissedIncorrectIds = [];
    if (!this.dismissedIncorrectIds.includes(questionId)) {
      this.dismissedIncorrectIds.push(questionId);
    }
    this.saveState();
    return { success: true };
  }

  clearAllRevisionItems() {
    this.bookmarks = [];
    this.studentDashboard.bookmarkCount = 0;
    if (!this.dismissedIncorrectIds) this.dismissedIncorrectIds = [];
    this.questions.forEach((q) => {
      if (!this.dismissedIncorrectIds.includes(q.questionId)) {
        this.dismissedIncorrectIds.push(q.questionId);
      }
    });
    this.saveState();
    return { success: true };
  }

  // --- Analytics Dashboard ---
  getStudentDashboard() {
    return this.studentDashboard;
  }

  // --- Coordinator Features ---
  getCoordinatorDashboard() {
    const students = this.users.filter((u) => u.role === 'student');
    const totalStudents = students.length || 24;
    const activeTests = this.mockTests.length || 8;
    const completedAttempts = 42;
    const inProgressAttempts = 6;
    const totalAttempts = completedAttempts + inProgressAttempts;
    const uniqueStudentsAttempted = 18;
    const unattemptedStudents = Math.max(0, totalStudents - uniqueStudentsAttempted);
    const avgAccuracy = 68;
    const avgScore = 14.5;
    const completionRate = totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 88;
    const passRate = 71;

    const summaryCards = [
      {
        label: 'Accessible Students',
        value: totalStudents,
        subtext: `${unattemptedStudents} pending mock tests`,
        icon: 'Users',
        color: 'teal'
      },
      {
        label: 'Available Mock Tests',
        value: activeTests,
        subtext: 'Campus placement assessments',
        icon: 'FolderGit2',
        color: 'blue'
      },
      {
        label: 'Students Attempted',
        value: uniqueStudentsAttempted,
        subtext: `${Math.round((uniqueStudentsAttempted / totalStudents) * 100)}% participation rate`,
        icon: 'CheckCircle2',
        color: 'emerald'
      },
      {
        label: 'Completed Attempts',
        value: completedAttempts,
        subtext: `${completionRate}% attempt completion rate`,
        icon: 'Award',
        color: 'amber'
      },
      {
        label: 'In-Progress Tests',
        value: inProgressAttempts,
        subtext: 'Currently active test sessions',
        icon: 'Timer',
        color: 'purple'
      },
      {
        label: 'Unattempted Students',
        value: unattemptedStudents,
        subtext: 'Zero mock test attempts',
        icon: 'AlertCircle',
        color: 'rose'
      },
      {
        label: 'Average Accuracy',
        value: `${avgAccuracy}%`,
        subtext: `Avg score: ${avgScore} pts (${passRate}% pass rate)`,
        icon: 'TrendingUp',
        color: 'emerald'
      },
      {
        label: 'Completion Rate',
        value: `${completionRate}%`,
        subtext: `${completedAttempts} / ${totalAttempts} attempts`,
        icon: 'Activity',
        color: 'sky'
      }
    ];

    const recentActivity = [
      {
        _id: 'att_demo_1',
        attemptId: 'att_demo_1',
        studentName: students[0]?.name || 'Aarav Sharma',
        studentEmail: students[0]?.email || 'aarav.sharma@readyup.edu',
        studentId: students[0]?.studentId || 'STU-2026-001',
        department: students[0]?.department || 'Computer Science & Engineering',
        testTitle: this.mockTests[0]?.title || 'TCS National Mock Test',
        score: 16,
        totalMarks: 20,
        accuracy: 80,
        status: 'completed',
        result: 'Passed',
        durationSeconds: 1540,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        _id: 'att_demo_2',
        attemptId: 'att_demo_2',
        studentName: students[1]?.name || 'Priya Patel',
        studentEmail: students[1]?.email || 'priya.patel@readyup.edu',
        studentId: students[1]?.studentId || 'STU-2026-002',
        department: students[1]?.department || 'Information Technology',
        testTitle: this.mockTests[1]?.title || 'Infosys Reasoning Sprint',
        score: 11,
        totalMarks: 15,
        accuracy: 73,
        status: 'completed',
        result: 'Passed',
        durationSeconds: 1120,
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        _id: 'att_demo_3',
        attemptId: 'att_demo_3',
        studentName: students[2]?.name || 'Rohan Verma',
        studentEmail: students[2]?.email || 'rohan.verma@readyup.edu',
        studentId: students[2]?.studentId || 'STU-2026-003',
        department: students[2]?.department || 'Electronics Engineering',
        testTitle: this.mockTests[0]?.title || 'TCS National Mock Test',
        score: 0,
        totalMarks: 20,
        accuracy: 0,
        status: 'in-progress',
        result: 'Incomplete',
        durationSeconds: 420,
        createdAt: new Date(Date.now() - 900000).toISOString()
      }
    ];

    return {
      metrics: {
        totalQuestions: this.questions.length,
        activeQuestions: this.questions.length,
        verifiedQuestions: this.questions.length,
        needsReview: 0,
        activeTests,
        pendingImports: 0,
        totalStudents,
        uniqueStudentsAttempted,
        completedAttempts,
        inProgressAttempts,
        totalAttempts,
        unattemptedStudents,
        averageScore: avgScore,
        averageAccuracy: avgAccuracy,
        completionRate,
        passRate
      },
      summaryCards,
      recentActivity,
      metricCards: [
        { label: 'Total Questions', value: this.questions.length, subtext: 'Active verified questions', icon: 'BookOpen', color: 'teal' },
        { label: 'Active Mock Tests', value: activeTests, subtext: 'Across placement companies', icon: 'FolderGit2', color: 'blue' },
        { label: 'Student Attempts', value: totalAttempts, subtext: `${uniqueStudentsAttempted} unique candidates`, icon: 'CheckCircle2', color: 'emerald' },
        { label: 'Average Accuracy', value: `${avgAccuracy}%`, subtext: `${passRate}% pass rate`, icon: 'TrendingUp', color: 'amber' }
      ],
      importHistory: this.coordinator.importHistory
    };
  }

  getCoordinatorMockTests({ search, category, status, page = 1, limit = 20 } = {}, user = null) {
    const activeUser = user || this.getActiveUser();
    const students = this.users.filter((u) => u.role === 'student');
    const totalStudents = students.length || 24;

    const authorized = this.mockTests.filter((t) => this.isCoordinatorAuthorizedForTest(activeUser, t));

    let list = authorized.map((t, idx) => {
      const eligibleCount = t.assignedBatches?.length ? 15 : totalStudents;
      const uniqueStudents = Math.min(eligibleCount, 12 + (idx % 6));
      const completed = Math.min(uniqueStudents, 10 + (idx % 4));
      const inProgress = Math.max(0, uniqueStudents - completed);
      const unattempted = Math.max(0, eligibleCount - uniqueStudents);
      const avgAcc = 60 + ((idx * 7) % 30);

      return {
        _id: t._id,
        title: t.title,
        slug: t.slug,
        type: t.type || 'company_mock',
        company: t.company || 'General',
        category: t.category || 'Mixed Aptitude',
        difficulty: t.difficulty || 'medium',
        durationMinutes: t.durationMinutes || 30,
        totalQuestions: t.totalQuestions || 15,
        passingScore: t.passingScore || 60,
        totalMarks: t.totalMarks || t.totalQuestions || 15,
        assignedDepartments: t.assignedDepartments || [],
        assignedBatches: t.assignedBatches || [],
        assignedStudentsCount: t.assignedStudents?.length || 0,
        startDate: t.startDate || null,
        endDate: t.endDate || null,
        isScheduled: Boolean(t.isScheduled),
        status: t.status || (t.isActive !== false ? 'published' : 'archived'),
        isActive: t.isActive !== false,
        scheduleStatus: t.endDate && new Date() > new Date(t.endDate) ? 'closed' : t.startDate && new Date() < new Date(t.startDate) ? 'upcoming' : 'active',
        eligibleStudentsCount: eligibleCount,
        uniqueStudentsAttempted: uniqueStudents,
        totalAttempts: completed + inProgress + (idx % 3),
        completedAttempts: completed,
        inProgressAttempts: inProgress,
        unattemptedCount: unattempted,
        averageScore: Number(((avgAcc / 100) * (t.totalQuestions || 15)).toFixed(1)),
        averageAccuracy: avgAcc,
        passedCount: Math.round(completed * 0.75),
        passRate: completed > 0 ? 75 : 0,
        createdAt: t.createdAt || new Date().toISOString()
      };
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.company.toLowerCase().includes(q));
    }
    if (category && category !== 'all') {
      list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }
    if (status && status !== 'all') {
      if (status === 'completed') {
        list = list.filter((t) => t.completedAttempts > 0);
      } else if (status === 'in-progress') {
        list = list.filter((t) => t.inProgressAttempts > 0);
      } else if (status === 'closed' || status === 'expired') {
        list = list.filter((t) => t.scheduleStatus === 'closed');
      } else {
        list = list.filter((t) => t.scheduleStatus === status);
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return {
      data: paginated,
      pagination: {
        total: list.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(list.length / limitNum) || 1
      }
    };
  }

  getCoordinatorMockTestDetail(testId, user = null) {
    const activeUser = user || this.getActiveUser();
    const test = this.mockTests.find((t) => t._id === testId || t.slug === testId);
    if (!test) throw { status: 404, message: 'Mock test not found' };
    if (!this.isCoordinatorAuthorizedForTest(activeUser, test)) {
      throw { status: 403, message: 'Access denied: You are not authorized to view this mock test' };
    }
    const students = this.users.filter((u) => u.role === 'student');
    return {
      ...test,
      stats: {
        totalAttempts: 25,
        completedAttempts: 20,
        inProgressAttempts: 3,
        uniqueStudentsAttempted: 16,
        eligibleStudentsCount: students.length || 24,
        unattemptedCount: 8,
        averageScore: 12.4,
        averageAccuracy: 69,
        passedCount: 15,
        passRate: 75,
        scheduleStatus: 'active'
      }
    };
  }

  getCoordinatorMockTestAttempts(testId, { search, status, department, page = 1, limit = 20 } = {}, user = null) {
    const activeUser = user || this.getActiveUser();
    const students = this.users.filter((u) => u.role === 'student');

    let matchingTests = [];
    if (testId === 'all') {
      matchingTests = this.mockTests.filter((t) => this.isCoordinatorAuthorizedForTest(activeUser, t));
    } else {
      const test = this.mockTests.find((t) => t._id === testId || t.slug === testId);
      if (!test) throw { status: 404, message: 'Mock test not found' };
      if (!this.isCoordinatorAuthorizedForTest(activeUser, test)) {
        throw { status: 403, message: 'Access denied: You are not authorized to view attempts for this mock test' };
      }
      matchingTests = [test];
    }

    let attempts = [];
    matchingTests.forEach((t) => {
      students.forEach((s, idx) => {
        const isCompleted = idx % 5 !== 0;
        const score = 10 + (idx % 6);
        const totalMarks = t.totalQuestions || 15;
        const accuracy = Math.round((score / totalMarks) * 100);

        attempts.push({
          _id: `att_${t._id}_${s._id}`,
          attemptId: `att_${t._id}_${s._id}`,
          mockTestId: t._id,
          studentId: s.studentId || `STU-2026-${String(idx + 1).padStart(3, '0')}`,
          studentName: s.name,
          studentEmail: s.email,
          department: s.department || 'Computer Engineering',
          graduationYear: s.graduationYear || 2026,
          testTitle: t.title || 'Mock Test',
          score: isCompleted ? score : 0,
          totalMarks,
          accuracy: isCompleted ? accuracy : 0,
          status: isCompleted ? 'completed' : 'in-progress',
          result: isCompleted ? (accuracy >= 60 ? 'Passed' : 'Needs Review') : 'Incomplete',
          attemptNumber: 1 + (idx % 2),
          startTime: new Date(Date.now() - 3600000 * (idx + 1)).toISOString(),
          submissionTime: isCompleted ? new Date(Date.now() - 3600000 * idx).toISOString() : null,
          durationSeconds: isCompleted ? 1200 + idx * 30 : 450,
          createdAt: new Date(Date.now() - 3600000 * (idx + 1)).toISOString()
        });
      });
    });

    if (search) {
      const q = search.toLowerCase();
      attempts = attempts.filter((a) => a.studentName.toLowerCase().includes(q) || a.studentEmail.toLowerCase().includes(q) || a.studentId.toLowerCase().includes(q));
    }
    if (status && status !== 'all') {
      attempts = attempts.filter((a) => a.status === status);
    }
    if (department && department !== 'all') {
      const d2 = department.toLowerCase();
      attempts = attempts.filter((a) => {
        const d1 = (a.department || '').toLowerCase();
        if (d1 === d2) return true;
        if (d1.replace(/\s+engineering$/, '') === d2.replace(/\s+engineering$/, '')) return true;
        if (d2 === 'e & tc' && (d1 === 'etc' || d1 === 'e&tc' || d1.includes('telecom') || d1.includes('communication') || d1 === 'entc')) return true;
        if (d2 === 'aids' && (d1 === 'ai & ds' || d1 === 'ai and ds' || d1.includes('intelligence') || d1.includes('data science'))) return true;
        if (d2 === 'csd' && (d1 === 'cs & design' || d1.includes('design'))) return true;
        if (d2 === 'computer engineering' && (d1.includes('computer') || d1 === 'cse')) return true;
        if (d2 === 'information technology' && (d1 === 'it' || d1.includes('information technology'))) return true;
        if (d2 === 'mechanical' && (d1 === 'mech' || d1.includes('mechanical'))) return true;
        if (d2 === 'civil' && d1.includes('civil')) return true;
        if (d2 === 'electrical' && (d1 === 'ee' || (d1.includes('electrical') && !d1.includes('electronics')))) return true;
        if (d2 === 'chemical' && d1.includes('chemical')) return true;
        if (d2 === 'robotics and automation' && (d1.includes('robotics') || d1.includes('automation'))) return true;
        return false;
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    return {
      data: attempts.slice((pageNum - 1) * limitNum, pageNum * limitNum),
      pagination: {
        total: attempts.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(attempts.length / limitNum) || 1
      }
    };
  }

  assignCoordinatorMockTest(testId, data) {
    const test = this.mockTests.find((t) => t._id === testId);
    if (!test) throw { status: 404, message: 'Mock test not found' };

    Object.assign(test, {
      assignedBatches: data.assignedBatches || [],
      assignedStudents: data.assignedStudents || [],
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      isScheduled: Boolean(data.isScheduled)
    });

    this.saveState();
    return test;
  }

  getDepartments() {
    return [...ALLOWED_DEPARTMENTS];
  }

  createMockTest(data) {
    const newId = `mock_test_${Date.now()}`;
    const newTest = {
      _id: newId,
      title: data.title,
      slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type: data.type || 'company_mock',
      category: data.category || 'Mixed Aptitude',
      company: data.company || 'General',
      durationMinutes: Number(data.durationMinutes) || 60,
      totalQuestions: data.questions?.length || 15,
      totalMarks: data.totalMarks || data.questions?.length || 15,
      passingScore: Number(data.passingScore) || 60,
      assignedDepartments: data.assignedDepartments || [],
      assignedBatches: data.assignedBatches || [],
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      isScheduled: Boolean(data.isScheduled),
      status: data.status || 'published',
      isActive: data.status !== 'archived',
      questions: data.questions || [],
      createdBy: data.createdBy || (this.getActiveUser()?._id ? String(this.getActiveUser()._id) : (this.getActiveUser()?.id ? String(this.getActiveUser().id) : 'coord_mock_user')),
      createdAt: new Date().toISOString()
    };
    this.mockTests.unshift(newTest);
    this.saveState();
    return newTest;
  }

  updateMockTest(testId, data) {
    const idx = this.mockTests.findIndex((t) => t._id === testId);
    if (idx === -1) throw { status: 404, message: 'Mock test not found' };
    this.mockTests[idx] = {
      ...this.mockTests[idx],
      ...data,
      assignedDepartments: data.assignedDepartments !== undefined ? data.assignedDepartments : this.mockTests[idx].assignedDepartments,
      assignedBatches: data.assignedBatches !== undefined ? data.assignedBatches : this.mockTests[idx].assignedBatches,
      isActive: data.status ? data.status !== 'archived' : (data.isActive !== undefined ? data.isActive : this.mockTests[idx].isActive),
    };
    this.saveState();
    return this.mockTests[idx];
  }

  archiveMockTest(testId) {
    const idx = this.mockTests.findIndex((t) => t._id === testId);
    if (idx === -1) throw { status: 404, message: 'Mock test not found' };
    this.mockTests[idx].isActive = false;
    this.mockTests[idx].status = 'archived';
    this.saveState();
    return { testId, title: this.mockTests[idx].title, status: 'archived', isActive: false };
  }

  publishCoordinatorMockTest(testId) {
    const idx = this.mockTests.findIndex((t) => t._id === testId);
    if (idx === -1) throw { status: 404, message: 'Mock test not found' };
    this.mockTests[idx].status = 'published';
    this.mockTests[idx].isActive = true;
    if (Array.isArray(this.notifications)) {
      this.notifications.unshift({
        _id: 'notif_' + Date.now(),
        title: 'New Mock Test Published',
        message: `'${this.mockTests[idx].title}' is now live and available to attempt.`,
        type: 'info',
        link: `/tests?testId=${this.mockTests[idx]._id}`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
    this.saveState();
    return this.mockTests[idx];
  }

  getCoordinatorStudents({ search, department, graduationYear, testId, page = 1, limit = 20 } = {}, user = null) {
    const activeUser = user || this.getActiveUser();
    let list = this.users.filter((u) => u.role === 'student');

    if (testId && testId !== 'all') {
      const test = this.mockTests.find((t) => t._id === testId || t.slug === testId);
      if (!test) throw { status: 404, message: 'Mock test not found' };
      if (!this.isCoordinatorAuthorizedForTest(activeUser, test)) {
        throw { status: 403, message: 'Access denied: You are not authorized to view students for this mock test' };
      }

      if (test.assignedStudents && test.assignedStudents.length > 0) {
        list = list.filter((s) => test.assignedStudents.includes(s._id) || test.assignedStudents.includes(s.studentId));
      } else {
        // 1. Department filter
        const rawDepts = (test.assignedDepartments && test.assignedDepartments.length > 0)
          ? test.assignedDepartments
          : (test.assignedBatches || []).filter((b) => isNaN(parseInt(b, 10)) && b.toLowerCase() !== 'all' && b.toLowerCase() !== 'all batches');

        const isDeptsOpen = rawDepts.length === 0 || rawDepts.every((d) => {
          const s = String(d || '').trim().toLowerCase();
          return s === 'all' || s === 'all departments';
        });

        if (!isDeptsOpen) {
          list = list.filter((s) => rawDepts.some((d) => {
            const sDept = (s.department || '').trim().toLowerCase();
            const tDept = String(d || '').trim().toLowerCase();
            if (sDept === tDept || (sDept && (sDept.includes(tDept) || tDept.includes(sDept)))) return true;
            const normD = normalizeDepartment(tDept);
            const normS = normalizeDepartment(sDept);
            return Boolean(normD && normS && normD === normS);
          }));
        }

        // 2. Batch / graduation year filter
        const rawBatches = (test.assignedBatches || []).filter((b) => !isNaN(parseInt(b, 10)));
        if (rawBatches.length > 0) {
          const years = rawBatches.map((b) => String(parseInt(b, 10)));
          list = list.filter((s) => years.includes(String(s.graduationYear)));
        }
      }
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.studentId && s.studentId.toLowerCase().includes(q)));
    }
    if (department && department !== 'all') {
      list = list.filter((s) => {
        if (!s.department) return false;
        if (s.department.toLowerCase() === department.toLowerCase()) return true;
        const normS = normalizeDepartment(s.department);
        const normD = normalizeDepartment(department);
        if (normS && normD && normS === normD) return true;
        return s.department.toLowerCase().includes(department.toLowerCase()) || department.toLowerCase().includes(s.department.toLowerCase());
      });
    }
    if (graduationYear && graduationYear !== 'all') {
      list = list.filter((s) => String(s.graduationYear).trim() === String(graduationYear).trim());
    }

    const availableYears = Array.from(new Set(
      this.users
        .filter((u) => u.role === 'student' && u.graduationYear)
        .map((u) => String(u.graduationYear).trim())
    )).sort((a, b) => b.localeCompare(a));

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const paginated = list.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const formatted = paginated.map((s, idx) => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      studentId: s.studentId || `STU-2026-${String(idx + 1).padStart(3, '0')}`,
      department: s.department || 'Computer Science & Engineering',
      graduationYear: s.graduationYear || 2026,
      college: s.college || 'National Institute of Technology',
      isActive: s.isActive !== false,
      testsAttempted: 2 + (idx % 4),
      testsCompleted: 2 + (idx % 3),
      passedCount: 1 + (idx % 3),
      avgAccuracy: 62 + ((idx * 9) % 32),
      lastAttemptDate: new Date(Date.now() - idx * 86400000).toISOString()
    }));

    return {
      data: formatted,
      availableYears,
      pagination: {
        total: list.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(list.length / limitNum) || 1
      }
    };
  }

  getCoordinatorStudentDetail(studentId) {
    const student = this.users.find((u) => u._id === studentId || u.studentId === studentId);
    if (!student) throw { status: 404, message: 'Student not found' };

    const attempts = (this.testHistory || []).map((h, i) => ({
      _id: `att_hist_${i}`,
      attemptId: `att_hist_${i}`,
      title: h.title,
      type: h.type || 'mock-test',
      score: h.score,
      totalMarks: h.totalQuestions || 15,
      accuracy: h.accuracy,
      status: 'completed',
      result: h.accuracy >= 60 ? 'Passed' : 'Needs Review',
      durationSeconds: 1200,
      createdAt: h.completedAt || new Date().toISOString()
    }));

    return {
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId || 'STU-2026-001',
        department: student.department || 'Computer Science & Engineering',
        graduationYear: student.graduationYear || 2026,
        college: student.college || 'ReadyUp Campus',
        isActive: student.isActive !== false,
        createdAt: student.createdAt || new Date().toISOString()
      },
      summary: {
        totalAttempts: attempts.length || 3,
        completedAttempts: attempts.length || 3,
        passedCount: attempts.filter((a) => a.result === 'Passed').length || 2,
        passRate: 75,
        avgAccuracy: 71
      },
      progression: [
        { title: 'TCS Diagnostic Drill', score: 12, totalMarks: 15, accuracy: 80, date: '2026-10-15' },
        { title: 'Infosys Specialist Sprint', score: 9, totalMarks: 15, accuracy: 60, date: '2026-10-20' },
        { title: 'Campus Qualifier Exam', score: 14, totalMarks: 15, accuracy: 93, date: '2026-10-25' }
      ],
      topicBreakdown: [
        { topic: 'Time and Work', category: 'Quantitative Aptitude', total: 6, correct: 5, answered: 6, accuracy: 83 },
        { topic: 'Syllogisms', category: 'Logical Reasoning', total: 5, correct: 4, answered: 5, accuracy: 80 },
        { topic: 'Error Spotting', category: 'Verbal Ability', total: 4, correct: 2, answered: 4, accuracy: 50 }
      ],
      strongTopics: [
        { topic: 'Time and Work', accuracy: 83 },
        { topic: 'Syllogisms', accuracy: 80 }
      ],
      weakTopics: [
        { topic: 'Error Spotting', accuracy: 50 }
      ],
      attempts
    };
  }

  getCoordinatorAnalytics(user = null) {
    const activeUser = user || this.getActiveUser();
    const authorizedTests = this.mockTests.filter((t) => this.isCoordinatorAuthorizedForTest(activeUser, t));
    const topics = [
      { topic: 'Time and Work', category: 'Quantitative Aptitude', totalQuestions: 120, answeredCount: 110, correctCount: 92, accuracy: 84, status: 'strong' },
      { topic: 'Syllogisms', category: 'Logical Reasoning', totalQuestions: 95, answeredCount: 90, correctCount: 72, accuracy: 80, status: 'strong' },
      { topic: 'Seating Arrangement', category: 'Logical Reasoning', totalQuestions: 80, answeredCount: 75, correctCount: 54, accuracy: 72, status: 'strong' },
      { topic: 'Percentages & Profit', category: 'Quantitative Aptitude', totalQuestions: 110, answeredCount: 100, correctCount: 65, accuracy: 65, status: 'moderate' },
      { topic: 'Data Interpretation', category: 'Quantitative Aptitude', totalQuestions: 75, answeredCount: 70, correctCount: 42, accuracy: 60, status: 'moderate' },
      { topic: 'Reading Comprehension', category: 'Verbal Ability', totalQuestions: 85, answeredCount: 80, correctCount: 38, accuracy: 48, status: 'weak' },
      { topic: 'Vocabulary & Sentence Completion', category: 'Verbal Ability', totalQuestions: 90, answeredCount: 85, correctCount: 39, accuracy: 46, status: 'weak' },
      { topic: 'Probability & Permutations', category: 'Quantitative Aptitude', totalQuestions: 65, answeredCount: 60, correctCount: 24, accuracy: 40, status: 'weak' }
    ];

    const strongTopics = topics.filter((t) => t.status === 'strong');
    const weakTopics = topics.filter((t) => t.status === 'weak');

    const atRiskStudents = [
      { _id: 'risk_1', name: 'Vikram Mehta', email: 'vikram.mehta@readyup.edu', studentId: 'STU-2026-014', department: 'Mechanical Engineering', completedTests: 3, avgAccuracy: 42, failedCount: 3 },
      { _id: 'risk_2', name: 'Neha Gupta', email: 'neha.gupta@readyup.edu', studentId: 'STU-2026-021', department: 'Civil Engineering', completedTests: 2, avgAccuracy: 46, failedCount: 2 },
      { _id: 'risk_3', name: 'Siddharth Rao', email: 'siddharth.rao@readyup.edu', studentId: 'STU-2026-008', department: 'Electrical Engineering', completedTests: 4, avgAccuracy: 48, failedCount: 2 }
    ];

    const testComparison = (authorizedTests.length > 0 ? authorizedTests : this.mockTests).slice(0, 10).map((t, i) => {
      const avgScore = 11.5 + (i % 3);
      const totalQuestions = t.totalQuestions || 15;
      const averageAccuracy = Math.min(100, Math.round((avgScore / totalQuestions) * 100));
      return {
        _id: t._id,
        title: t.title,
        category: t.category || 'General',
        company: t.company || 'Placement',
        durationMinutes: t.durationMinutes || 30,
        totalQuestions,
        attemptsCount: 20 + i * 5,
        averageScore: avgScore,
        averageAccuracy
      };
    });

    const overallAverageAccuracy = testComparison.length > 0
      ? Math.round(testComparison.reduce((sum, t) => sum + (t.averageAccuracy || 0), 0) / testComparison.length)
      : 69;

    return {
      topicAccuracy: topics,
      strongTopics,
      weakTopics,
      atRiskStudents,
      testComparison,
      overallAverageAccuracy
    };
  }

  async previewSpreadsheetImport({ file, parsedRows = [] }) {
    const importBatchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const validRows = [];
    const errors = [];
    const seenIds = new Set();

    let candidateRows = [];

    if (parsedRows && parsedRows.length > 0) {
      candidateRows = parsedRows;
    } else if (file) {
      let fileText = '';
      if (typeof file.text === 'function') {
        fileText = await file.text();
      } else if (typeof file === 'string') {
        fileText = file;
      } else if (file && typeof file.arrayBuffer === 'function') {
        const buf = await file.arrayBuffer();
        fileText = new TextDecoder('utf-8').decode(buf);
      }

      if (fileText && fileText.trim().length > 0) {
        const parsedGrid = parseCSVToRows(fileText);
        if (parsedGrid.length < 2) {
          throw new Error('Spreadsheet contains no data rows.');
        }

        const rawHeaders = parsedGrid[0];
        const headerKeys = rawHeaders.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

        for (let i = 1; i < parsedGrid.length; i++) {
          const rowValues = parsedGrid[i];
          const rowObj = {};
          headerKeys.forEach((key, colIdx) => {
            rowObj[key] = rowValues[colIdx] !== undefined ? rowValues[colIdx].trim() : '';
          });

          candidateRows.push({
            _rowNumber: i + 1,
            questionId: (rowObj.questionid || rowObj.id || `IMP-${i + 1}`).toUpperCase(),
            questionText: rowObj.questiontext || rowObj.question || '',
            optionA: rowObj.optiona || rowObj.a || '',
            optionB: rowObj.optionb || rowObj.b || '',
            optionC: rowObj.optionc || rowObj.c || '',
            optionD: rowObj.optiond || rowObj.d || '',
            correctOption: (rowObj.correctoption || rowObj.answer || '').trim(),
            explanation: rowObj.explanation || '',
            category: rowObj.category || 'Quantitative Aptitude',
            topic: rowObj.topic || 'General',
            subtopic: rowObj.subtopic || '',
            difficulty: (rowObj.difficulty || 'medium').toLowerCase(),
            companies: rowObj.companies ? rowObj.companies.split(',').map((c) => c.trim()).filter(Boolean) : [],
            source: rowObj.source || 'Spreadsheet Import',
            year: rowObj.year ? Number(rowObj.year) : 2026
          });
        }
      }
    }

    if (candidateRows.length === 0) {
      throw new Error('Spreadsheet contains no data rows or could not be parsed.');
    }

    candidateRows.forEach((row, index) => {
      const rowNum = row._rowNumber || index + 2;
      const rowErrors = [];
      const qId = (row.questionId || '').toUpperCase();
      const rawCorrect = (row.correctOption || '').trim();
      const upperCorrect = rawCorrect.toUpperCase();

      if (!qId) rowErrors.push('Missing questionId');
      if (!row.questionText || row.questionText.length < 5) rowErrors.push('Question text must be at least 5 characters');
      if (!row.optionA || !row.optionB) rowErrors.push('Options A and B are required');
      if (!['A', 'B', 'C', 'D'].includes(upperCorrect)) {
        rowErrors.push(`Correct option must be one of A, B, C, or D (got '${rawCorrect}')`);
      }
      if (!row.category) rowErrors.push('Category is required');
      if (!row.topic) rowErrors.push('Topic is required');

      if (seenIds.has(qId)) {
        rowErrors.push(`Duplicate questionId '${qId}' within this file`);
      } else if (qId) {
        seenIds.add(qId);
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          rowNumber: rowNum,
          questionId: qId || `Row ${rowNum}`,
          field: rowErrors[0].includes('option') ? 'correctOption' : (rowErrors[0].includes('Question') ? 'questionText' : 'general'),
          error: rowErrors.join(', '),
          messages: rowErrors
        });
      } else {
        const isDuplicateInDb = this.questions.some((q) => q.questionId === qId);
        validRows.push({
          ...row,
          questionId: qId,
          rowNumber: rowNum,
          correctOption: upperCorrect,
          options: [
            { optionId: 'A', text: row.optionA },
            { optionId: 'B', text: row.optionB },
            ...(row.optionC ? [{ optionId: 'C', text: row.optionC }] : []),
            ...(row.optionD ? [{ optionId: 'D', text: row.optionD }] : [])
          ],
          difficulty: ['easy', 'medium', 'hard'].includes(row.difficulty) ? row.difficulty : 'medium',
          companies: Array.isArray(row.companies) ? row.companies : (typeof row.companies === 'string' ? row.companies.split(',').map((c) => c.trim()).filter(Boolean) : []),
          isDuplicateInDb,
          status: isDuplicateInDb ? 'Duplicate (Will Update)' : 'Valid',
          errors: []
        });
      }
    });

    const stagedBatch = {
      importBatchId,
      filename: file?.name || 'aptitude_questions_upload.csv',
      totalRows: candidateRows.length,
      validRowsCount: validRows.length,
      invalidRowsCount: errors.length,
      errors,
      validRows,
      previewSample: validRows.slice(0, 5),
      rows: validRows.slice(0, 50)
    };

    this.pendingBatches[importBatchId] = stagedBatch;
    return stagedBatch;
  }

  confirmSpreadsheetImport(importBatchId) {
    const batch = this.pendingBatches[importBatchId];
    if (!batch) {
      throw { status: 404, message: 'Import batch not found or already processed' };
    }

    let insertedCount = 0;
    let updatedCount = 0;

    batch.validRows.forEach((row) => {
      const existing = this.questions.find((q) => q.questionId === row.questionId);
      const formattedQ = {
        _id: existing ? existing._id : 'q_' + Date.now() + Math.random().toString(36).substring(2, 6),
        questionId: row.questionId,
        questionText: row.questionText,
        options: [
          { optionId: 'A', text: row.optionA },
          { optionId: 'B', text: row.optionB },
          { optionId: 'C', text: row.optionC },
          { optionId: 'D', text: row.optionD }
        ],
        correctOption: row.correctOption,
        explanation: row.explanation,
        category: row.category,
        topic: row.topic,
        subtopic: row.subtopic || 'General',
        difficulty: row.difficulty,
        companies: row.companies,
        source: row.source || 'Spreadsheet Import',
        year: Number(row.year) || 2026,
        isVerified: true,
        isActive: true
      };

      if (existing) {
        Object.assign(existing, formattedQ);
        updatedCount += 1;
      } else {
        this.questions.unshift(formattedQ);
        insertedCount += 1;
      }
    });

    const historyEntry = {
      importBatchId,
      filename: batch.filename,
      uploadedAt: new Date().toISOString(),
      uploaderName: 'Prof. Sunita Patil',
      status: 'published',
      totalRows: batch.validRows.length,
      insertedCount,
      updatedCount,
      failedCount: batch.invalidRowsCount
    };

    this.coordinator.importHistory.unshift(historyEntry);
    delete this.pendingBatches[importBatchId];

    this.addAuditLog({
      action: 'SPREADSHEET_IMPORT_CONFIRMED',
      performedBy: 'Prof. Sunita Patil (coordinator@readyup.edu)',
      targetType: 'QUESTION_BANK',
      details: `Published ${batch.validRows.length} questions from ${batch.filename}`
    });

    this.saveState();

    return {
      importBatchId,
      filename: batch.filename,
      status: 'published',
      insertedCount,
      updatedCount,
      skippedCount: 0,
      totalProcessed: batch.validRows.length
    };
  }

  // --- Admin Features ---
  getAdminDashboard() {
    return {
      metrics: [
        { label: "Registered Students", value: this.users.filter((u) => u.role === 'student').length + 1200, subtext: "+68 this month", icon: "GraduationCap", color: "teal" },
        { label: "T&P Coordinators", value: this.users.filter((u) => u.role === 'coordinator').length, subtext: "Active staff members", icon: "ShieldCheck", color: "amber" },
        { label: "Total Question Bank", value: this.questions.length, subtext: "Verified questions", icon: "BookOpen", color: "blue" },
        { label: "Platform Pass Rate", value: "81.2%", subtext: "Across all drives", icon: "TrendingUp", color: "emerald" }
      ],
      recentAuditLogs: this.auditLogs.slice(0, 5)
    };
  }

  getAdminUsers({ role, isActive, search } = {}) {
    let filtered = [...this.users];
    if (role) filtered = filtered.filter((u) => u.role === role);
    if (isActive !== undefined) {
      const activeBool = String(isActive) === 'true';
      filtered = filtered.filter((u) => u.isActive === activeBool);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return filtered;
  }

  createUser(userData) {
    const exists = this.users.some((u) => u.email.toLowerCase() === userData.email.toLowerCase());
    if (exists) throw { status: 409, message: 'User with this email already exists' };

    const newUser = {
      _id: 'usr_' + Date.now(),
      name: userData.name,
      email: userData.email,
      role: userData.role || 'student',
      department: userData.department || 'Training & Placement Cell',
      college: userData.college || 'National Institute of Technology',
      studentId: userData.studentId || `EMP-${Date.now().toString().slice(-4)}`,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.users.unshift(newUser);
    this.addAuditLog({
      action: 'USER_CREATED',
      performedBy: 'Dr. Vikram Malhotra (admin@readyup.edu)',
      targetType: 'USER',
      details: `Provisioned account for ${newUser.name} with role ${newUser.role}`
    });
    this.saveState();
    return newUser;
  }

  updateUserRole(userId, newRole) {
    const user = this.users.find((u) => u._id === userId);
    if (!user) throw { status: 404, message: 'User not found' };

    const oldRole = user.role;
    user.role = newRole;
    this.addAuditLog({
      action: 'ROLE_ASSIGNED',
      performedBy: 'Dr. Vikram Malhotra (admin@readyup.edu)',
      targetType: 'USER',
      details: `Changed role for ${user.name} from ${oldRole} to ${newRole}`
    });
    this.saveState();
    return user;
  }

  updateUserStatus(userId, isActive) {
    const user = this.users.find((u) => u._id === userId);
    if (!user) throw { status: 404, message: 'User not found' };

    user.isActive = isActive;
    this.addAuditLog({
      action: 'USER_STATUS_CHANGE',
      performedBy: 'Dr. Vikram Malhotra (admin@readyup.edu)',
      targetType: 'USER',
      details: `${isActive ? 'Activated' : 'Deactivated'} account for ${user.name} (${user.email})`
    });
    this.saveState();
    return user;
  }

  getAuditLogs({ action, targetType } = {}) {
    let filtered = [...this.auditLogs];
    if (action) filtered = filtered.filter((l) => l.action === action);
    if (targetType) filtered = filtered.filter((l) => l.targetType === targetType);
    return filtered;
  }

  addAuditLog({ action, performedBy, targetType, details }) {
    const log = {
      _id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 6),
      action,
      performedBy: performedBy || 'System Admin',
      targetType,
      details,
      ipAddress: '192.168.1.10',
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    this.saveState();
    return log;
  }
}

export const mockStore = new MockStore();
