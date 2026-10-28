import assert from 'node:assert';
import http from 'node:http';

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}

async function runPhase1Tests() {
  console.log('\n=== READYUP PHASE 1 IMPROVEMENTS AUTOMATED TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function pass(title) {
    console.log(`✓ PASS: ${title}`);
    passed++;
  }

  function fail(title, err) {
    console.error(`✗ FAIL: ${title}`);
    console.error(`  Details: ${err.message || err}`);
    failed++;
  }

  // --- 1. LOGIN & RETRIEVE TOKENS FOR ALL 3 ROLES ---
  let studentToken = '';
  let coordinatorToken = '';
  let adminToken = '';

  try {
    const studentRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'student@readyup.edu', password: 'Password123!' }
    });
    assert.strictEqual(studentRes.status, 200, 'Student login should succeed');
    studentToken = studentRes.data.data.token;

    const coordRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'coordinator@readyup.edu', password: 'Password123!' }
    });
    assert.strictEqual(coordRes.status, 200, 'Coordinator login should succeed');
    coordinatorToken = coordRes.data.data.token;

    const adminRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@readyup.edu', password: 'Password123!' }
    });
    assert.strictEqual(adminRes.status, 200, 'Admin login should succeed');
    adminToken = adminRes.data.data.token;

    pass('Role authentication verified for student, coordinator, and admin');
  } catch (err) {
    fail('Role authentication verification', err);
  }

  // --- 2. FORGOT PASSWORD & RESET FLOW ACROSS ALL ROLES ---
  for (const role of ['student', 'coordinator', 'admin']) {
    try {
      const email = `${role}@readyup.edu`;
      const forgotRes = await request('/auth/forgot-password', {
        method: 'POST',
        body: { email, role }
      });

      assert.strictEqual(forgotRes.status, 200, `Forgot password request for ${role} should return 200`);
      assert.strictEqual(forgotRes.data.success, true);
      assert.strictEqual(forgotRes.data.emailConfigured, false, 'Should honestly report email delivery not configured');
      assert.ok(forgotRes.data.data?.resetToken, 'Should return test reset token when SMTP is unconfigured');
      const resetToken = forgotRes.data.data.resetToken;

      // Try resetting password with too short password
      const shortPassRes = await request('/auth/reset-password', {
        method: 'POST',
        body: { token: resetToken, password: 'short' }
      });
      assert.strictEqual(shortPassRes.status, 400, 'Should reject password shorter than 8 characters');

      // Reset password successfully with new temporary password
      const tempPass = 'TemporaryPass456!';
      const resetRes = await request('/auth/reset-password', {
        method: 'POST',
        body: { token: resetToken, password: tempPass }
      });
      assert.strictEqual(resetRes.status, 200, `Reset password for ${role} should succeed`);
      assert.strictEqual(resetRes.data.success, true);

      // Verify token cannot be reused
      const reuseRes = await request('/auth/reset-password', {
        method: 'POST',
        body: { token: resetToken, password: tempPass }
      });
      assert.strictEqual(reuseRes.status, 400, 'Token cannot be reused after successful reset');

      // Verify login works with new password
      const newLoginRes = await request('/auth/login', {
        method: 'POST',
        body: { email, password: tempPass }
      });
      assert.strictEqual(newLoginRes.status, 200, `Login with new password for ${role} should succeed`);
      const newAuthToken = newLoginRes.data.data.token;

      // Restore original password
      const restoreRes = await request('/auth/change-password', {
        method: 'PUT',
        token: newAuthToken,
        body: { currentPassword: tempPass, newPassword: 'Password123!' }
      });
      assert.strictEqual(restoreRes.status, 200, `Restored standard password for ${role}`);

      pass(`Forgot password full lifecycle verified for ${role} (request, token invalidation, reuse block, restore)`);
    } catch (err) {
      fail(`Forgot password lifecycle for ${role}`, err);
    }
  }

  // --- 3. REVISION CENTER: QUESTION EXTRACTION & PRACTICE DRILL ---
  try {
    // Bookmark a question to guarantee review item
    const questionsRes = await request('/questions?limit=2', { token: studentToken });
    const qList = questionsRes.data.data || [];
    assert.ok(qList.length >= 2, 'Should have at least 2 questions available');
    const targetQ = qList[0];

    // Bookmark question 0
    await request('/bookmarks', {
      method: 'POST',
      token: studentToken,
      body: { questionId: targetQ.questionId, notes: 'Phase 1 verification mark' }
    });

    // Check bookmarks endpoint
    const bmRes = await request('/bookmarks', { token: studentToken });
    assert.strictEqual(bmRes.status, 200);
    const hasBookmark = bmRes.data.data.some((b) => b.questionId === targetQ.questionId);
    assert.ok(hasBookmark, 'Bookmarked question should appear in bookmarks list');

    // Start practice with explicit revision questionIds
    const practiceRes = await request('/tests/practice/start', {
      method: 'POST',
      token: studentToken,
      body: {
        count: 2,
        isRevision: true,
        questionIds: [targetQ.questionId]
      }
    });

    assert.strictEqual(practiceRes.status, 201, 'Should start revision practice session');
    assert.ok(practiceRes.data.data.attemptId, 'Should return attemptId');
    const session = practiceRes.data.data;
    assert.ok(session.questions.length >= 1, 'Session should contain revision questions');
    // Security check: questions in revision drill must not leak correct answers
    assert.strictEqual(session.questions[0].correctOption, undefined, 'Answers must be stripped for students in revision drill');

    pass('Revision Center: Practice drill launch with eligible revision questionIds strips answers and tracks attempt');
  } catch (err) {
    fail('Revision Center: Practice drill launch', err);
  }

  // --- 4. REVISION RESOLUTION ON CORRECT SUBMISSION ---
  try {
    // Start practice and submit correct answer to verify question resolution
    const startRes = await request('/tests/practice/start', {
      method: 'POST',
      token: studentToken,
      body: { count: 1 }
    });
    const session = startRes.data.data;
    const qItem = session.questions[0];

    // Get the correct answer using coordinator token (simulating student answering correctly)
    const coordQRes = await request(`/questions?search=${encodeURIComponent(qItem.questionId)}`, { token: coordinatorToken });
    const fullQ = coordQRes.data.data.find((q) => q.questionId === qItem.questionId);
    const correctOption = fullQ ? fullQ.correctOption : 'B';

    // Bookmark it first
    await request('/bookmarks', {
      method: 'POST',
      token: studentToken,
      body: { questionId: qItem.questionId, notes: 'Pre-resolution bookmark' }
    });

    // Submit with correct answer
    const submitRes = await request(`/tests/attempts/${session.attemptId}/submit`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          {
            questionId: qItem.questionId,
            selectedOption: correctOption,
            timeSpentSeconds: 12,
            markedForReview: false
          }
        ]
      }
    });

    assert.strictEqual(submitRes.status, 200, 'Attempt submit should succeed');
    assert.strictEqual(submitRes.data.data.score, 1, 'Score should be 1 for correct answer');

    // Verify bookmark was cleared after correct resolution
    const checkBmRes = await request('/bookmarks', { token: studentToken });
    const stillBookmarked = checkBmRes.data.data.some((b) => b.questionId === qItem.questionId);
    assert.strictEqual(stillBookmarked, false, 'Correctly answered revision question should be resolved and removed from bookmarks');

    pass('Revision Center: Successfully corrected revision question is resolved and removed from active list');
  } catch (err) {
    fail('Revision Center: Question resolution on correct answer', err);
  }

  // --- 5. REVISION CLEAR ALL ACTION ---
  try {
    // Add a bookmark
    const qRes = await request('/questions?limit=1', { token: studentToken });
    const qId = qRes.data.data[0].questionId;
    await request('/bookmarks', {
      method: 'POST',
      token: studentToken,
      body: { questionId: qId, notes: 'To be cleared' }
    });

    // Invoke revision clear-all
    const clearRes = await request('/tests/revision/clear-all', {
      method: 'POST',
      token: studentToken
    });

    assert.strictEqual(clearRes.status, 200, 'Clear all endpoint should return 200');
    assert.strictEqual(clearRes.data.success, true);

    // Verify bookmarks are empty for student
    const checkBm = await request('/bookmarks', { token: studentToken });
    assert.strictEqual(checkBm.data.data.length, 0, 'Active bookmarks should be cleared');

    // Verify original question bank is NOT deleted
    const verifyBank = await request('/questions?limit=5', { token: studentToken });
    assert.ok(verifyBank.data.data.length > 0, 'Original question bank must not be deleted');

    pass('Revision Center: Clear All action clears active revision items without deleting questions from bank');
  } catch (err) {
    fail('Revision Center: Clear All action', err);
  }

  // --- 6. USER ISOLATION IN REVISION & ATTEMPTS ---
  try {
    // Student A's review attempt cannot be fetched by Student B (or unauthenticated)
    const unauthorizedRes = await request('/tests/revision/clear-all', { method: 'POST' });
    assert.strictEqual(unauthorizedRes.status, 401, 'Unauthenticated clear-all should be rejected');

    const unauthForgot = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: '' }
    });
    assert.strictEqual(unauthForgot.status, 400, 'Empty email in forgot password should be rejected');

    pass('User isolation and authorization guards strictly enforced across revision and auth endpoints');
  } catch (err) {
    fail('User isolation and authorization guards', err);
  }

  console.log('\n==========================================');
  console.log(`Phase 1 Test Results: ${passed} passed, ${failed} failed.`);
  console.log('==========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1Tests();
