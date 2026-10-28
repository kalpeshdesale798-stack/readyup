import assert from "node:assert";
import dotenv from "dotenv";
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

const runTargetedVerification = async () => {
    console.log("=== Targeted Bug Fixes & Non-Regression Verification Suite ===\n");
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
            if (err.stack) {
                const callerLine = err.stack.split("\n")[2];
                if (callerLine) console.error(`  Location: ${callerLine.trim()}`);
            }
            failed++;
        }
    };

    let coordinatorToken = null;
    let studentToken = null;
    let studentDept = null;
    let createdTestIds = [];

    await test("Auth: Authenticate coordinator and student accounts", async () => {
        const coordRes = await request("/auth/login", {
            method: "POST",
            data: { email: "coordinator@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(coordRes.status, 200, "Coordinator login failed");
        coordinatorToken = coordRes.body.data.token;
        assert(coordinatorToken, "Missing coordinator token");

        const studRes = await request("/auth/login", {
            method: "POST",
            data: { email: "student@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(studRes.status, 200, "Student login failed");
        studentToken = studRes.body.data.token;
        studentDept = studRes.body.data.user.department || "Computer Engineering";
    });

    let draftTestId = null;
    await test("Issue 2 Fix: Coordinator saves a DRAFT mock test (status: 'draft')", async () => {
        const payload = {
            title: `E2E Draft Mock Test ${Date.now()}`,
            description: "A draft test saved from the review wizard",
            category: "General",
            durationMinutes: 40,
            passingMarks: 5,
            totalMarks: 10,
            status: "draft",
            assignedDepartments: ["ALL"],
            csvQuestions: [
                {
                    questionText: "What is the Big O time complexity of binary search on a sorted array?",
                    options: [
                        { key: "A", text: "O(1)" },
                        { key: "B", text: "O(log n)" },
                        { key: "C", text: "O(n)" },
                        { key: "D", text: "O(n^2)" }
                    ],
                    correctOption: "B",
                    marks: 1,
                    explanation: "Binary search halves the search space at each iteration."
                }
            ]
        };

        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: payload,
            token: coordinatorToken,
        });

        assert.strictEqual(res.status, 201, `Failed to save draft: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.status, "draft");
        draftTestId = res.body.data._id;
        createdTestIds.push(draftTestId);
    });

    await test("Issue 2 Fix: Draft test persists and is retrievable on page refresh", async () => {
        const detailRes = await request(`/coordinator/mock-tests/${draftTestId}`, {
            token: coordinatorToken,
        });
        assert.strictEqual(detailRes.status, 200);
        assert.strictEqual(detailRes.body.data.status, "draft");
        assert.strictEqual(detailRes.body.data.questions.length, 1);

        // Verify draft test does NOT leak to student active test listing
        const studentListRes = await request("/tests/mock-tests", { token: studentToken });
        assert.strictEqual(studentListRes.status, 200);
        const leaked = studentListRes.body.data.find(t => String(t._id) === String(draftTestId));
        assert(!leaked, "Draft test must not appear in student mock test listing");
    });

    let publishedTestId = null;
    const tenCsvQuestions = Array.from({ length: 10 }, (_, i) => ({
        questionText: `CSV Review Wizard Question ${i + 1}: What is ${i + 1} * 10?`,
        options: [
            { key: "A", text: `${(i + 1) * 10}` },
            { key: "B", text: `${(i + 1) * 10 + 5}` },
            { key: "C", text: `${(i + 1) * 10 - 2}` },
            { key: "D", text: "None of the above" }
        ],
        correctOption: "A",
        marks: 1,
        explanation: `Explanation for question ${i + 1}`
    }));

    await test("Issue 1 Fix: POST /api/v1/coordinator/mock-tests saves a 10-question CSV test", async () => {
        const payload = {
            title: `E2E 10-Question Published Test ${Date.now()}`,
            description: "10 CSV questions saved and published",
            category: "General",
            durationMinutes: 30,
            passingMarks: 6,
            totalMarks: 10,
            status: "published",
            assignedDepartments: [studentDept],
            csvQuestions: tenCsvQuestions,
            startTime: new Date(Date.now() - 3600000).toISOString(),
            deadline: new Date(Date.now() + 86400000).toISOString(),
            instructions: [
                "1 mark per question.",
                "No negative marking.",
                "Submissions after deadline will be rejected."
            ]
        };

        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: payload,
            token: coordinatorToken,
        });

        assert.strictEqual(res.status, 201, `Failed to save test: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.totalQuestions, 10);
        publishedTestId = res.body.data._id;
        createdTestIds.push(publishedTestId);
    });

    await test("Issue 3 Fix: Student mock test listing displays consistent start time, deadline, and schedule status", async () => {
        const res = await request("/tests/mock-tests", { token: studentToken });
        assert.strictEqual(res.status, 200);
        const target = res.body.data.find(t => String(t._id) === String(publishedTestId));
        assert(target, "Published test should be visible to student in target department");
        assert.strictEqual(target.totalQuestions, 10);
        assert.strictEqual(target.scheduleStatus, "live");
        // Verify start time and deadline are consistently normalized
        assert(target.startDate || target.startTime, "Start time should be available");
        assert(target.endDate || target.deadline, "Deadline should be available");
    });

    let attemptId = null;
    let questionsReceived = null;
    await test("Issue 4 & 5 Fix: Starting Live test returns questions without hanging on 'Loading exam environment...'", async () => {
        const res = await request(`/tests/mock-tests/${publishedTestId}/start`, {
            method: "POST",
            token: studentToken,
        });

        assert.strictEqual(res.status, 201, `Failed to start test: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.success, true);
        attemptId = res.body.data.attemptId;
        questionsReceived = res.body.data.questions;

        assert(attemptId, "Should return attemptId");
        assert(Array.isArray(questionsReceived) && questionsReceived.length === 10, "Should return 10 questions");

        // Security check: Student MUST NOT see correctOption or explanation
        questionsReceived.forEach(q => {
            assert.strictEqual(q.correctOption, undefined, "Security: correctOption must be hidden");
            assert.strictEqual(q.explanation, undefined, "Security: explanation must be hidden");
        });
    });

    await test("Issue 5 Fix: Starting test again resumes existing in-progress attempt (no duplicates)", async () => {
        const res = await request(`/tests/mock-tests/${publishedTestId}/start`, {
            method: "POST",
            token: studentToken,
        });

        assert.strictEqual(res.status, 200, "Resuming should succeed with 200");
        assert.strictEqual(res.body.data.attemptId, attemptId, "Must return the SAME attempt ID");
        assert.strictEqual(res.body.data.resumed, true, "Should indicate resumed: true");
        assert.strictEqual(res.body.data.questions.length, 10);
    });

    await test("Issue 4 Fix: GET /tests/attempts/:attemptId loads active attempt on page reload", async () => {
        const res = await request(`/tests/attempts/${attemptId}`, {
            token: studentToken,
        });

        assert.strictEqual(res.status, 200, `Failed to load attempt: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.data.attemptId, attemptId);
        assert.strictEqual(res.body.data.questions.length, 10);
        assert.strictEqual(res.body.data.status, "in-progress");
    });

    await test("Submit answers, calculate score, and verify review isolation", async () => {
        const answers = questionsReceived.map((q, idx) => ({
            questionId: q._id,
            selectedOption: idx < 6 ? "A" : "B" // 6 correct ('A'), 4 incorrect ('B')
        }));

        const submitRes = await request(`/tests/attempts/${attemptId}/submit`, {
            method: "POST",
            data: { answers },
            token: studentToken,
        });

        assert.strictEqual(submitRes.status, 200);
        assert.strictEqual(submitRes.body.data.status, "completed");
        assert.strictEqual(submitRes.body.data.score, 6);
        assert.strictEqual(submitRes.body.data.totalMarks, 10);
        assert.strictEqual(submitRes.body.data.result, "Passed");

        // Review can now be accessed
        const reviewRes = await request(`/tests/attempts/${attemptId}/review`, {
            token: studentToken,
        });
        assert.strictEqual(reviewRes.status, 200);
        assert.strictEqual(reviewRes.body.data.score, 6);
    });

    await test("Non-Regression: Starting test with 0 questions rejects with 400 instead of creating broken attempts", async () => {
        // Create an empty published test
        const emptyTestRes = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: "Empty Test For Validation",
                durationMinutes: 20,
                status: "published",
                assignedDepartments: ["ALL"]
            },
            token: coordinatorToken,
        });
        // createMockTest requires at least one question when published
        assert.strictEqual(emptyTestRes.status, 400, "Should reject creating a published test with 0 questions");
    });

    await test("Cleanup: Remove created test artifacts from database", async () => {
        if (createdTestIds.length > 0) {
            const mongoose = (await import("mongoose")).default;
            await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
            const MockTest = (await import("../models/MockTest.js")).default;
            const Attempt = (await import("../models/Attempt.js")).default;
            const Question = (await import("../models/Question.js")).default;

            await MockTest.deleteMany({ _id: { $in: createdTestIds } });
            await Attempt.deleteMany({ mockTest: { $in: createdTestIds } });
            await Question.deleteMany({ questionText: { $regex: /CSV Review Wizard Question/i } });
            await mongoose.disconnect();
        }
    });

    console.log(`\n==========================================`);
    console.log(`Targeted Test Results: ${passed} passed, ${failed} failed.`);
    console.log(`==========================================\n`);

    if (failed > 0) process.exit(1);
};

runTargetedVerification().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
