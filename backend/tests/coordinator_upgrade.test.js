import assert from "node:assert";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000/api/v1";

const request = async (endpoint, { method = "GET", data = null, token = null } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null,
    });

    const contentType = res.headers.get("content-type") || "";
    let body = null;
    if (contentType.includes("application/json")) {
        body = await res.json().catch(() => null);
    } else if (contentType.includes("text/")) {
        body = await res.text().catch(() => "");
    }

    return { status: res.status, ok: res.ok, body, headers: res.headers };
};

const runCoordinatorUpgradeTests = async () => {
    console.log("=== ReadyUp Coordinator Panel Upgrade Verification Suite ===\n");
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

    let coordinatorToken = null;
    let studentToken = null;
    let sampleTestId = null;
    let sampleStudentId = null;
    let sampleAttemptId = null;

    // 1. Auth: Login Coordinator & Student
    await test("Login coordinator and retrieve JWT", async () => {
        const res = await request("/auth/login", {
            method: "POST",
            data: { email: "coordinator@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(res.status, 200, "Coordinator login failed");
        assert.ok(res.body.data.token, "No token returned");
        assert.strictEqual(res.body.data.user.role, "coordinator");
        coordinatorToken = res.body.data.token;
    });

    await test("Login student and retrieve JWT", async () => {
        const res = await request("/auth/login", {
            method: "POST",
            data: { email: "student@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(res.status, 200, "Student login failed");
        assert.ok(res.body.data.token, "No token returned");
        assert.strictEqual(res.body.data.user.role, "student");
        studentToken = res.body.data.token;
        sampleStudentId = res.body.data.user._id || res.body.data.user.id;
    });

    // 2. Role Protection Security Verification
    await test("Security: Student receives 403 Forbidden on coordinator monitoring endpoints", async () => {
        const res = await request("/coordinator/mock-tests", {
            method: "GET",
            token: studentToken,
        });
        assert.strictEqual(res.status, 403, "Student was not blocked with 403");
    });

    await test("Security: Unauthenticated request receives 401 Unauthorized", async () => {
        const res = await request("/coordinator/dashboard", {
            method: "GET",
        });
        assert.strictEqual(res.status, 401, "Unauthenticated request was not blocked with 401");
    });

    // 3. Coordinator Dashboard
    await test("GET /coordinator/dashboard returns live database-backed metrics and summary cards", async () => {
        const res = await request("/coordinator/dashboard", {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.success);
        assert.ok(res.body.data.metrics.totalStudents > 0, "totalStudents should be > 0");
        assert.ok(res.body.data.metrics.activeTests > 0, "activeTests should be > 0");
        assert.ok(Array.isArray(res.body.data.summaryCards), "summaryCards should be an array");
        assert.strictEqual(res.body.data.summaryCards.length, 8, "Expected 8 summary cards");
        assert.ok(Array.isArray(res.body.data.metricCards), "metricCards should exist for backward compatibility");
        assert.ok(Array.isArray(res.body.data.recentActivity), "recentActivity should be an array");
    });

    // 4. Mock Test Monitoring
    await test("GET /coordinator/mock-tests returns test-wise monitoring data with participation counts", async () => {
        const res = await request("/coordinator/mock-tests", {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.success);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.data.length > 0, "Should return at least 1 mock test");

        const first = res.body.data[0];
        sampleTestId = first._id;
        assert.ok(first.title);
        assert.ok(typeof first.eligibleStudentsCount === "number");
        assert.ok(typeof first.uniqueStudentsAttempted === "number");
        assert.ok(typeof first.completedAttempts === "number");
        assert.ok(typeof first.unattemptedCount === "number");
        assert.ok(first.scheduleStatus, "Missing scheduleStatus");
    });

    await test("GET /coordinator/mock-tests/:id returns single mock test detail with stats", async () => {
        assert.ok(sampleTestId);
        const res = await request(`/coordinator/mock-tests/${sampleTestId}`, {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.stats);
        assert.strictEqual(res.body.data._id.toString(), sampleTestId.toString());
    });

    await test("GET /coordinator/mock-tests/:id/attempts returns student-level attempt list", async () => {
        assert.ok(sampleTestId);
        const res = await request(`/coordinator/mock-tests/${sampleTestId}/attempts`, {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.success);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.pagination);
    });

    // 5. Test Assignment and Scheduling
    await test("PATCH /coordinator/mock-tests/:id/assign updates batches and schedule", async () => {
        assert.ok(sampleTestId);
        const now = new Date();
        const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);

        const res = await request(`/coordinator/mock-tests/${sampleTestId}/assign`, {
            method: "PATCH",
            token: coordinatorToken,
            data: {
                assignedBatches: ["2026", "Computer Science & Engineering"],
                startDate: now.toISOString(),
                endDate: nextWeek.toISOString(),
                isScheduled: true,
            },
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.success);
        assert.strictEqual(res.body.data.isScheduled, true);
        assert.strictEqual(res.body.data.assignedBatches.length, 2);
    });

    // 6. Student Directory & Profile Detail
    await test("GET /coordinator/students returns student directory with attempt statistics", async () => {
        const res = await request("/coordinator/students", {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.success);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.data.length > 0);

        const firstStudent = res.body.data[0];
        assert.ok(firstStudent.name);
        assert.ok(firstStudent.email);
        assert.ok(typeof firstStudent.testsAttempted === "number");
        sampleStudentId = firstStudent._id;
    });

    await test("GET /coordinator/students/:id returns candidate attempt history and topic diagnostics", async () => {
        assert.ok(sampleStudentId);
        const res = await request(`/coordinator/students/${sampleStudentId}`, {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.success);
        assert.ok(res.body.data.student);
        assert.ok(res.body.data.summary);
        assert.ok(Array.isArray(res.body.data.attempts));
    });

    // 7. Performance Insights & Analytics
    await test("GET /coordinator/analytics returns topic accuracy and at-risk students", async () => {
        const res = await request("/coordinator/analytics", {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.success);
        assert.ok(Array.isArray(res.body.data.topicAccuracy));
        assert.ok(Array.isArray(res.body.data.strongTopics));
        assert.ok(Array.isArray(res.body.data.weakTopics));
        assert.ok(Array.isArray(res.body.data.atRiskStudents));
    });

    // 8. Reports & CSV Export
    await test("GET /coordinator/reports/export generates RFC 4180 CSV export", async () => {
        const res = await request("/coordinator/reports/export", {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers.get("content-type").includes("text/csv"));
        assert.ok(res.headers.get("content-disposition").includes(".csv"));
        assert.ok(typeof res.body === "string");
        assert.ok(res.body.includes('"Attempt ID"'));
        assert.ok(res.body.includes('"Student Name"'));
        assert.ok(res.body.includes('"Accuracy (%)"'));
    });

    // 9. Existing Question Bank & CSV Import Regression Protection
    await test("Regression: GET /coordinator/import/template still works", async () => {
        const res = await request("/coordinator/import/template", {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.includes("questionId,questionText"));
    });

    await test("Regression: GET /coordinator/import/history still works", async () => {
        const res = await request("/coordinator/import/history", {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.data));
    });

    // 10. Student Test-Taking & Scoring Regression Protection
    await test("Regression: Student can start, answer, submit mock test, and coordinator can review answers", async () => {
        // Start mock test
        const startRes = await request(`/tests/mock-tests/${sampleTestId}/start`, {
            method: "POST",
            token: studentToken,
        });
        assert.strictEqual(startRes.status, 201);
        sampleAttemptId = startRes.body.data.attemptId;
        const qList = startRes.body.data.questions;
        assert.ok(sampleAttemptId);
        assert.ok(Array.isArray(qList));
        assert.strictEqual(qList[0].correctOption, undefined, "Answers should be stripped for student");

        // Submit answers
        const answers = qList.map((q) => ({
            questionId: q.questionId,
            selectedOption: "A",
        }));
        const submitRes = await request(`/tests/attempts/${sampleAttemptId}/submit`, {
            method: "POST",
            token: studentToken,
            data: { answers },
        });
        assert.strictEqual(submitRes.status, 200);
        assert.strictEqual(submitRes.body.data.status, "completed");
        assert.ok(typeof submitRes.body.data.score === "number");
        assert.ok(typeof submitRes.body.data.accuracy === "number");

        // Coordinator reviews attempt
        const reviewRes = await request(`/tests/attempts/${sampleAttemptId}/review`, {
            method: "GET",
            token: coordinatorToken,
        });
        assert.strictEqual(reviewRes.status, 200);
        assert.ok(Array.isArray(reviewRes.body.data.questions));
        assert.ok(reviewRes.body.data.questions[0].correctOption, "Coordinator should see correctOption");
    });

    console.log("\n==========================================");
    console.log(`Test Results: ${passed} passed, ${failed} failed.`);
    console.log("==========================================");

    if (failed > 0) {
        process.exit(1);
    }
};

runCoordinatorUpgradeTests().catch((err) => {
    console.error("Test runner error:", err);
    process.exit(1);
});
