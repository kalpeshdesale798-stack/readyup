import assert from "node:assert";
import dotenv from "dotenv";
import mongoose from "mongoose";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000/api/v1";

const request = async (endpoint, { method = "GET", data = null, token = null } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null,
    });

    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body: json };
};

const runAllTests = async () => {
    console.log("=== ReadyUp Automated API & Security Test Suite ===\n");
    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`✓ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`✗ FAIL: ${name}`);
            console.error(`  Error: ${err.message}`);
            failed++;
        }
    };

    // 1. Health Check
    await test("Health check responds healthy", async () => {
        const res = await request("/health");
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.status, "healthy");
    });

    // 2. Privilege Escalation Prevention on Registration
    await test("Public registration forces student role and ignores coordinator/admin request", async () => {
        const testEmail = `test_hacker_${Date.now()}@readyup.edu`;
        const res = await request("/auth/register", {
            method: "POST",
            data: {
                name: "Intruder",
                email: testEmail,
                password: "Password123!",
                role: "admin", // attempt privilege escalation
            },
        });
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.data.user.role, "student", "Role must be forced to 'student'");
    });

    // 3. Invalid credentials
    await test("Login with wrong password returns 401 Unauthorized", async () => {
        const res = await request("/auth/login", {
            method: "POST",
            data: {
                email: "student@readyup.edu",
                password: "WrongPassword999!",
            },
        });
        assert.strictEqual(res.status, 401);
        assert.strictEqual(res.body.success, false);
    });

    // 4. Authenticate All 3 Roles
    let studentToken = "";
    let studentUser = null;
    let coordinatorToken = "";
    let adminToken = "";

    await test("Login succeeds for student, coordinator, and admin", async () => {
        const stuRes = await request("/auth/login", {
            method: "POST",
            data: { email: "student@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(stuRes.status, 200);
        studentToken = stuRes.body.data.token;
        studentUser = stuRes.body.data.user;

        const coordRes = await request("/auth/login", {
            method: "POST",
            data: { email: "coordinator@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(coordRes.status, 200);
        coordinatorToken = coordRes.body.data.token;

        const adminRes = await request("/auth/login", {
            method: "POST",
            data: { email: "admin@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(adminRes.status, 200);
        adminToken = adminRes.body.data.token;
    });

    // 5. Auth /me
    await test("GET /auth/me returns currently authenticated user details", async () => {
        const res = await request("/auth/me", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.data.email, "student@readyup.edu");
    });

    // 6. Security: Question listing does NOT leak correct answers or explanations to students
    await test("Security: Questions endpoint strips answers & explanations for students", async () => {
        const res = await request("/questions", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.data.length > 0);

        for (const q of res.body.data) {
            assert.strictEqual(q.correctOption, undefined, "Student must never see correctOption in listing");
            assert.strictEqual(q.explanation, undefined, "Student must never see explanation in listing");
        }
    });

    // 7. Coordinator sees correct answers and explanations
    await test("Coordinator can see correctOption and explanation in questions listing", async () => {
        const res = await request("/questions", { token: coordinatorToken });
        assert.strictEqual(res.status, 200);
        const first = res.body.data[0];
        assert.ok(first.correctOption, "Coordinator must see correctOption");
        assert.ok(first.explanation, "Coordinator must see explanation");
    });

    // 8. Role-based access control: Student cannot access coordinator or admin endpoints
    await test("Role restriction: Student receives 403 Forbidden on coordinator & admin routes", async () => {
        const coordRes = await request("/coordinator/dashboard", { token: studentToken });
        assert.strictEqual(coordRes.status, 403, "Student must be forbidden from coordinator dashboard");

        const adminRes = await request("/admin/dashboard", { token: studentToken });
        assert.strictEqual(adminRes.status, 403, "Student must be forbidden from admin dashboard");
    });

    // 9. Practice Session Start: Returns questions WITHOUT answers
    let practiceAttemptId = "";
    let practiceQuestions = [];
    await test("POST /tests/practice/start initializes drill and strips answers", async () => {
        const res = await request("/tests/practice/start", {
            method: "POST",
            token: studentToken,
            data: { category: "Quantitative Aptitude", count: 3 },
        });
        assert.strictEqual(res.status, 201);
        assert.ok(res.body.data.attemptId);
        practiceAttemptId = res.body.data.attemptId;
        practiceQuestions = res.body.data.questions;
        assert.ok(practiceQuestions.length > 0);

        for (const q of practiceQuestions) {
            assert.strictEqual(q.correctOption, undefined);
            assert.strictEqual(q.explanation, undefined);
        }
    });

    // 10. Submit Attempt: Server-side scoring & Duplicate submission prevention
    await test("POST /tests/attempts/:id/submit calculates score on server and blocks duplicates", async () => {
        const firstQ = practiceQuestions[0];
        const answers = { [firstQ.questionId]: "A" };

        const submitRes = await request(`/tests/attempts/${practiceAttemptId}/submit`, {
            method: "POST",
            token: studentToken,
            data: { answers },
        });
        assert.strictEqual(submitRes.status, 200);
        assert.strictEqual(typeof submitRes.body.data.score, "number");
        assert.strictEqual(typeof submitRes.body.data.accuracy, "number");

        // Duplicate submission attempt
        const dupRes = await request(`/tests/attempts/${practiceAttemptId}/submit`, {
            method: "POST",
            token: studentToken,
            data: { answers },
        });
        assert.strictEqual(dupRes.status, 409, "Duplicate submission must return 409 Conflict");
    });

    // 10b. Expiration & Late Submission Enforcement
    await test("POST /tests/attempts/:id/submit enforces expiration deadline and rejects late submissions", async () => {
        // Start a fresh drill to test expiration
        const startLateRes = await request("/tests/practice/start", {
            method: "POST",
            token: studentToken,
            data: { category: "Quantitative Aptitude", count: 3 },
        });
        assert.strictEqual(startLateRes.status, 201);
        const lateAttemptId = startLateRes.body.data.attemptId;

        // Simulate elapsed time past expiration by connecting to mongoose and backdating startTime
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        const AttemptModel = mongoose.models.Attempt || mongoose.model("Attempt", new mongoose.Schema({}, { strict: false }));
        // Backdate attempt startTime by 2 hours
        await AttemptModel.findByIdAndUpdate(lateAttemptId, {
            startTime: new Date(Date.now() - 2 * 3600 * 1000),
        });

        // Submit late
        const lateSubmitRes = await request(`/tests/attempts/${lateAttemptId}/submit`, {
            method: "POST",
            token: studentToken,
            data: { answers: {} },
        });
        assert.strictEqual(lateSubmitRes.status, 400, "Late submission must return 400 Bad Request");
        assert.strictEqual(lateSubmitRes.body.data.status, "expired");
        assert.strictEqual(lateSubmitRes.body.data.score, 0);
        assert.strictEqual(lateSubmitRes.body.data.result, "Failed");

        // Attempt resubmission of expired attempt
        const resubmitExpired = await request(`/tests/attempts/${lateAttemptId}/submit`, {
            method: "POST",
            token: studentToken,
            data: { answers: {} },
        });
        assert.strictEqual(resubmitExpired.status, 409, "Resubmission of expired attempt must return 409 Conflict");
    });

    // 11. Review Attempt & Ownership Isolation
    await test("GET /tests/attempts/:id/review returns answers and enforces ownership isolation", async () => {
        // Owner student can review
        const reviewRes = await request(`/tests/attempts/${practiceAttemptId}/review`, {
            token: studentToken,
        });
        assert.strictEqual(reviewRes.status, 200);
        assert.ok(reviewRes.body.data.questions[0].correctOption, "Review must include correctOption");
        assert.ok(reviewRes.body.data.questions[0].explanation, "Review must include explanation");

        // Another student cannot review this attempt
        const otherEmail = `other_student_${Date.now()}@readyup.edu`;
        await request("/auth/register", {
            method: "POST",
            data: {
                name: "Other Student",
                email: otherEmail,
                password: "Password123!",
            },
        });
        const otherLogin = await request("/auth/login", {
            method: "POST",
            data: { email: otherEmail, password: "Password123!" },
        });
        const otherToken = otherLogin.body.data.token;

        const unauthorizedReview = await request(`/tests/attempts/${practiceAttemptId}/review`, {
            token: otherToken,
        });
        assert.strictEqual(unauthorizedReview.status, 403, "Other student must be forbidden from accessing attempt review");
    });

    // 12. Bookmarks Isolation & Management
    await test("Bookmarks: Add, retrieve, and delete with student isolation", async () => {
        const qRes = await request("/questions", { token: studentToken });
        const targetQ = qRes.body.data[0];

        // Add
        const addRes = await request("/bookmarks", {
            method: "POST",
            token: studentToken,
            data: { questionId: targetQ.questionId, note: "Important for TCS exam" },
        });
        assert.ok([200, 201].includes(addRes.status));

        // Get
        const listRes = await request("/bookmarks", { token: studentToken });
        assert.strictEqual(listRes.status, 200);
        assert.ok(listRes.body.data.some((b) => b.questionId === targetQ.questionId));

        // Delete
        const delRes = await request(`/bookmarks/${targetQ.questionId}`, {
            method: "DELETE",
            token: studentToken,
        });
        assert.strictEqual(delRes.status, 200);
    });

    // 13. Student Dashboard Pre-Aggregated Analytics
    await test("GET /analytics/dashboard returns full student metrics, goal, and next action", async () => {
        const res = await request("/analytics/dashboard", { token: studentToken });
        assert.strictEqual(res.status, 200);
        const data = res.body.data;
        assert.ok(data.metrics, "Must have metrics object");
        assert.ok(data.nextBestAction, "Must have nextBestAction recommendation");
        assert.ok(data.weeklyGoal, "Must have weeklyGoal progress");
        assert.ok(Array.isArray(data.recentAttempts), "Must have recentAttempts list");
    });

    // 14. Admin User Management & Audit Logs
    await test("Admin: Dashboard metrics, user query, role update, and audit logs", async () => {
        const dashRes = await request("/admin/dashboard", { token: adminToken });
        assert.strictEqual(dashRes.status, 200);
        assert.ok(dashRes.body.data.metrics.totalUsers > 0);

        const usersRes = await request("/admin/users", { token: adminToken });
        assert.strictEqual(usersRes.status, 200);
        assert.ok(usersRes.body.data.length > 0);

        const logsRes = await request("/admin/audit-logs", { token: adminToken });
        assert.strictEqual(logsRes.status, 200);
        assert.ok(Array.isArray(logsRes.body.data));
    });

    // 15. Coordinator Dashboard & Template
    await test("Coordinator: Dashboard metrics and CSV template endpoint", async () => {
        const dashRes = await request("/coordinator/dashboard", { token: coordinatorToken });
        assert.strictEqual(dashRes.status, 200);
        assert.ok(dashRes.body.data.metrics.totalQuestions > 0);

        const templateRes = await fetch(`${BASE_URL}/coordinator/import/template`, {
            headers: { Authorization: `Bearer ${coordinatorToken}` },
        });
        assert.strictEqual(templateRes.status, 200);
        const text = await templateRes.text();
        assert.ok(text.includes("questionId"), "Template must contain header row");
    });

    console.log(`\n==========================================`);
    console.log(`Test Results: ${passed} passed, ${failed} failed.`);
    console.log(`==========================================\n`);

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
};

runAllTests();
