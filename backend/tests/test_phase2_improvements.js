import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }
    const res = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    return { status: res.status, data };
}

async function runTests() {
    console.log('\n=== READYUP PHASE 2 IMPROVEMENTS BACKEND TEST SUITE ===\n');
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

    let studentToken = '';
    let coordinatorToken = '';
    let adminToken = '';

    // 1. Role separation and enforcement on login
    try {
        // Successful logins
        const sRes = await request('/auth/login', {
            method: 'POST',
            body: { email: 'student@readyup.edu', password: 'Password123!', requiredRole: 'student' }
        });
        assert.strictEqual(sRes.status, 200, 'Student login with requiredRole=student should succeed');
        studentToken = sRes.data.data.token;

        const cRes = await request('/auth/login', {
            method: 'POST',
            body: { email: 'coordinator@readyup.edu', password: 'Password123!', requiredRole: 'coordinator' }
        });
        assert.strictEqual(cRes.status, 200, 'Coordinator login with requiredRole=coordinator should succeed');
        coordinatorToken = cRes.data.data.token;

        const aRes = await request('/auth/login', {
            method: 'POST',
            body: { email: 'admin@readyup.edu', password: 'Password123!', requiredRole: 'admin' }
        });
        assert.strictEqual(aRes.status, 200, 'Admin login with requiredRole=admin should succeed');
        adminToken = aRes.data.data.token;

        // Role mismatch: Attempting student login through coordinator portal must return 403
        const mismatchRes = await request('/auth/login', {
            method: 'POST',
            body: { email: 'student@readyup.edu', password: 'Password123!', requiredRole: 'coordinator' }
        });
        assert.strictEqual(mismatchRes.status, 403, 'Should reject student login on coordinator portal with 403');
        assert.strictEqual(mismatchRes.data.code, 'ROLE_MISMATCH', 'Should return ROLE_MISMATCH code');

        // Role mismatch: Attempting coordinator login through student portal must return 403
        const coordOnStudent = await request('/auth/login', {
            method: 'POST',
            body: { email: 'coordinator@readyup.edu', password: 'Password123!', requiredRole: 'student' }
        });
        assert.strictEqual(coordOnStudent.status, 403, 'Should reject coordinator login on student portal with 403');

        pass('Role-based login enforcement strictly denies cross-portal authentication with 403');
    } catch (err) {
        fail('Role-based login enforcement', err);
    }

    // 2. Tab switch detection & integrity event logging
    try {
        // Start a student practice session
        const practiceRes = await request('/tests/practice/start', {
            method: 'POST',
            token: studentToken,
            body: { count: 3 }
        });
        assert.strictEqual(practiceRes.status, 201, 'Practice session should start');
        const attemptId = practiceRes.data.data.attemptId;

        // Log tab switch event #1
        const event1 = await request(`/tests/attempts/${attemptId}/integrity-event`, {
            method: 'POST',
            token: studentToken,
            body: { eventType: 'tab_switch', warningCount: 1, details: 'User switched away from active tab' }
        });
        assert.strictEqual(event1.status, 200, 'Integrity event 1 should be recorded');
        assert.strictEqual(event1.data.data.warningCount, 1);
        assert.strictEqual(event1.data.data.tabSwitches, 1);

        // Log tab switch event #2
        const event2 = await request(`/tests/attempts/${attemptId}/integrity-event`, {
            method: 'POST',
            token: studentToken,
            body: { eventType: 'tab_switch', warningCount: 2, details: 'User minimized browser window' }
        });
        assert.strictEqual(event2.status, 200, 'Integrity event 2 should be recorded');
        assert.strictEqual(event2.data.data.warningCount, 2);
        assert.strictEqual(event2.data.data.tabSwitches, 2);

        // Unauthorized user cannot modify someone else's attempt integrity events
        const unauthEvent = await request(`/tests/attempts/${attemptId}/integrity-event`, {
            method: 'POST',
            token: coordinatorToken,
            body: { eventType: 'tab_switch', warningCount: 99 }
        });
        assert.strictEqual(unauthEvent.status, 403, 'Should forbid another user from modifying attempt integrity log');

        pass('Tab-switch integrity event logging tracks warning count and isolates student attempts');
    } catch (err) {
        fail('Tab-switch integrity logging', err);
    }

    // 3. Company Drills: "Verified" and "Recruitment Drive" functional filtering
    try {
        // Query all companies
        const allCompanies = await request('/companies');
        assert.strictEqual(allCompanies.status, 200);
        assert.ok(Array.isArray(allCompanies.data.data), 'Companies should be an array');
        assert.ok(allCompanies.data.data.length > 0, 'Should return companies');

        // Check each company has grounded flags
        const firstCo = allCompanies.data.data[0];
        assert.strictEqual(typeof firstCo.isVerified, 'boolean', 'isVerified should be boolean');
        assert.strictEqual(typeof firstCo.hasActiveDrive, 'boolean', 'hasActiveDrive should be boolean');
        assert.ok(firstCo.badge, 'Company should have a meaningful badge');

        // Filter by verified
        const verifiedCompanies = await request('/companies?filter=verified');
        assert.strictEqual(verifiedCompanies.status, 200);
        for (const c of verifiedCompanies.data.data) {
            assert.strictEqual(c.isVerified, true, 'All returned items must be verified');
        }

        // Filter by recruitment drive
        const driveCompanies = await request('/companies?filter=recruitment_drive');
        assert.strictEqual(driveCompanies.status, 200);
        for (const c of driveCompanies.data.data) {
            assert.strictEqual(c.hasActiveDrive, true, 'All returned items must have active drive');
        }

        pass('Company Drills verified and recruitment drive filters return accurate grounded records');
    } catch (err) {
        fail('Company Drills filtering', err);
    }

    // 4. Coordinator Preview & Published workflow
    try {
        // Coordinator creates a staged mock test in "preview" status
        const uniqueSlug = `test-eval-${Date.now()}`;
        const createRes = await request('/tests/mock-tests', {
            method: 'POST',
            token: coordinatorToken,
            body: {
                title: 'Spring Placement Staging Test',
                slug: uniqueSlug,
                type: 'grand',
                durationMinutes: 30,
                totalQuestions: 10,
                category: 'Mixed',
                difficulty: 'medium',
            }
        });
        assert.strictEqual(createRes.status, 201, 'Should create mock test');
        const testId = createRes.data.data._id;

        // Set status to preview
        const statusRes = await request(`/tests/mock-tests/${testId}/status`, {
            method: 'PATCH',
            token: coordinatorToken,
            body: { status: 'preview' }
        });
        assert.strictEqual(statusRes.status, 200, 'Should update status to preview');
        assert.strictEqual(statusRes.data.data.status, 'preview');

        // Student tries to view test in preview mode -> must be denied 403
        const studentViewRes = await request(`/tests/mock-tests/${testId}`, {
            method: 'GET',
            token: studentToken
        });
        assert.strictEqual(studentViewRes.status, 403, 'Student should be blocked from preview assessment');

        // Student tries to start preview test -> must be denied 403
        const studentStartRes = await request(`/tests/mock-tests/${testId}/start`, {
            method: 'POST',
            token: studentToken
        });
        assert.strictEqual(studentStartRes.status, 403, 'Student should be blocked from starting preview assessment');

        // Coordinator can preview safely
        const previewRes = await request(`/tests/mock-tests/${testId}/preview`, {
            method: 'GET',
            token: coordinatorToken
        });
        assert.strictEqual(previewRes.status, 200, 'Coordinator can inspect preview');
        assert.strictEqual(previewRes.data.data.isPreview, true);

        // Coordinator publishes the test
        const pubRes = await request(`/tests/mock-tests/${testId}/publish`, {
            method: 'PATCH',
            token: coordinatorToken
        });
        assert.strictEqual(pubRes.status, 200, 'Coordinator can publish assessment');
        assert.strictEqual(pubRes.data.data.status, 'published');

        // Now student can view the published test
        const studentViewAfter = await request(`/tests/mock-tests/${testId}`, {
            method: 'GET',
            token: studentToken
        });
        assert.strictEqual(studentViewAfter.status, 200, 'Student can access published assessment');

        pass('Coordinator preview and published lifecycle properly isolates assessments from students');
    } catch (err) {
        fail('Coordinator preview & published lifecycle', err);
    }

    // 5. Audit Log Filtering
    try {
        // Query audit logs with Admin token
        const allLogs = await request('/admin/audit-logs', { token: adminToken });
        assert.strictEqual(allLogs.status, 200);
        assert.ok(Array.isArray(allLogs.data.data), 'Audit logs should be an array');
        assert.ok(allLogs.data.totalCount >= 0, 'Should include totalCount for full dataset pagination');

        // Filter by action
        const loginLogs = await request('/admin/audit-logs?action=USER_LOGIN', { token: adminToken });
        assert.strictEqual(loginLogs.status, 200);
        for (const log of loginLogs.data.data) {
            assert.strictEqual(log.action, 'USER_LOGIN', 'Action must match USER_LOGIN');
        }

        // Filter by targetType
        const authLogs = await request('/admin/audit-logs?targetType=AUTH', { token: adminToken });
        assert.strictEqual(authLogs.status, 200);
        for (const log of authLogs.data.data) {
            assert.strictEqual(log.targetType, 'AUTH', 'targetType must match AUTH');
        }

        // Unauthorized user cannot view audit logs
        const studentAudit = await request('/admin/audit-logs', { token: studentToken });
        assert.strictEqual(studentAudit.status, 403, 'Student must receive 403 on audit logs');

        pass('Audit log filters support action, targetType, full-dataset pagination, and role isolation');
    } catch (err) {
        fail('Audit log filtering', err);
    }

    // 6. Forgot and Reset Password user experience
    try {
        // Request forgot password for existing student
        const forgotRes = await request('/auth/forgot-password', {
            method: 'POST',
            body: { email: 'student@readyup.edu' }
        });
        assert.strictEqual(forgotRes.status, 200);
        // Verify user-facing message matches standard without revealing existence
        assert.strictEqual(
            forgotRes.data.message,
            'If an account exists for that email, reset instructions will be provided.',
            'Must return standard clean user message'
        );

        // Request forgot password for non-existent email -> must return the EXACT same message
        const nonExistentRes = await request('/auth/forgot-password', {
            method: 'POST',
            body: { email: 'nonexistentuser999@example.com' }
        });
        assert.strictEqual(nonExistentRes.status, 200);
        assert.strictEqual(
            nonExistentRes.data.message,
            'If an account exists for that email, reset instructions will be provided.',
            'Must not leak whether non-existent email exists'
        );

        // Try resetting with invalid token
        const invalidReset = await request('/auth/reset-password', {
            method: 'POST',
            body: { token: 'invalid-fake-token-12345', password: 'NewValidPassword123!' }
        });
        assert.strictEqual(invalidReset.status, 400);
        assert.strictEqual(
            invalidReset.data.message,
            'This reset link is invalid or has expired.',
            'Must return standard invalid/expired message'
        );

        pass('Password reset experience returns clear standard feedback without user enumeration');
    } catch (err) {
        fail('Password reset UX', err);
    }

    console.log(`\n==========================================`);
    console.log(`Phase 2 Test Results: ${passed} passed, ${failed} failed.`);
    console.log(`==========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((e) => {
    console.error('Fatal test error:', e);
    process.exit(1);
});
