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

const runUpgradeTests = async () => {
    console.log("=== ReadyUp Mock Test Creation & Management Upgrade Test Suite ===\n");
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

    let coordinatorToken = "";
    let studentToken = "";
    let studentUser = null;
    let bankQuestionIds = [];
    const createdTestIds = [];
    const createdQuestionIds = [];

    // 1. Authentication
    await test("1. Authenticate coordinator and student", async () => {
        const coordRes = await request("/auth/login", {
            method: "POST",
            data: { email: "coordinator@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(coordRes.status, 200, "Coordinator login failed");
        coordinatorToken = coordRes.body.data.token;

        const stuRes = await request("/auth/login", {
            method: "POST",
            data: { email: "student@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(stuRes.status, 200, "Student login failed");
        studentToken = stuRes.body.data.token;
        studentUser = stuRes.body.data.user;
        assert(studentUser.department, "Student should have a department");
    });

    // 2. Dynamic Coordinator Departments
    await test("2. GET /coordinator/departments returns campus departments with 'ALL'", async () => {
        const res = await request("/coordinator/departments", { token: coordinatorToken });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        const depts = res.body.data;
        assert(
            depts.some((d) => (typeof d === "string" ? d.toLowerCase().includes("all") : d.code === "ALL")),
            "Must contain All Departments option"
        );
        assert(depts.length >= 2, "Must contain at least campus departments and ALL");
    });

    // Fetch existing question bank questions for reuse
    await test("3. Fetch existing Question Bank questions for selection testing", async () => {
        const res = await request("/questions?limit=5", { token: coordinatorToken });
        assert.strictEqual(res.status, 200);
        assert(Array.isArray(res.body.data), "Questions should be an array");
        assert(res.body.data.length >= 2, "Should have at least 2 questions in DB");
        bankQuestionIds = res.body.data.slice(0, 3).map((q) => q._id);
    });

    // 4. Method B: Create Test from Question Bank only
    let qbTestId = null;
    await test("4. Method B: Create Mock Test selecting existing Question Bank questions", async () => {
        const payload = {
            title: `AutoTest QB Only ${Date.now()}`,
            description: "Automated test with Question Bank selection only",
            category: "Mixed Aptitude",
            company: "General",
            type: "topic_test",
            durationMinutes: 30,
            passingScore: 60,
            status: "published",
            assignedDepartments: ["ALL"],
            questionIds: bankQuestionIds.slice(0, 2),
        };
        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: payload,
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 201, `Failed to create test: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.success, true);
        qbTestId = res.body.data._id;
        createdTestIds.push(qbTestId);
        assert.strictEqual(res.body.data.totalQuestions, 2);
    });

    // 5. Method C: Create Test from Manual Entry only
    let manualTestId = null;
    await test("5. Method C: Create Mock Test with manually entered questions", async () => {
        const manualQuestions = [
            {
                questionText: "Which data structure uses LIFO order?",
                options: [
                    { key: "A", text: "Queue" },
                    { key: "B", text: "Stack" },
                    { key: "C", text: "Linked List" },
                    { key: "D", text: "Tree" },
                ],
                correctOption: "B",
                category: "Computer Science",
                topic: "Data Structures",
                difficulty: "easy",
                marks: 2,
                explanation: "A Stack follows Last-In-First-Out (LIFO).",
            },
            {
                questionText: "What is the time complexity of binary search?",
                options: [
                    { key: "A", text: "O(n)" },
                    { key: "B", text: "O(n^2)" },
                    { key: "C", text: "O(log n)" },
                    { key: "D", text: "O(1)" },
                ],
                correctOption: "C",
                category: "Computer Science",
                topic: "Algorithms",
                difficulty: "medium",
                marks: 2,
                explanation: "Binary search divides the search space in half each step.",
            },
        ];

        const payload = {
            title: `AutoTest Manual Only ${Date.now()}`,
            description: "Automated test with manual questions only",
            category: "Computer Science",
            company: "General",
            type: "topic_test",
            durationMinutes: 20,
            passingScore: 50,
            status: "published",
            assignedDepartments: ["ALL"],
            manualQuestions,
        };

        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: payload,
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 201, `Failed: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.success, true);
        manualTestId = res.body.data._id;
        createdTestIds.push(manualTestId);
        assert.strictEqual(res.body.data.totalQuestions, 2);
        assert.strictEqual(res.body.data.totalMarks, 4);
    });

    // 6. Method A: Create Test from CSV parsed questions
    let csvTestId = null;
    await test("6. Method A: Create Mock Test with CSV questions", async () => {
        const csvQuestions = [
            {
                questionText: "What does HTTP stand for?",
                options: [
                    { key: "A", text: "HyperText Transfer Protocol" },
                    { key: "B", text: "HighText Transfer Protocol" },
                    { key: "C", text: "HyperText Transmission Protocol" },
                    { key: "D", text: "Hyper Transfer Text Protocol" },
                ],
                correctOption: "A",
                category: "Networking",
                topic: "Web Protocols",
                difficulty: "easy",
                marks: 1,
                explanation: "HTTP is HyperText Transfer Protocol.",
            },
        ];

        const payload = {
            title: `AutoTest CSV Only ${Date.now()}`,
            description: "Automated test with CSV questions only",
            category: "Networking",
            company: "General",
            type: "topic_test",
            durationMinutes: 15,
            passingScore: 60,
            status: "published",
            assignedDepartments: ["ALL"],
            csvQuestions,
        };

        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: payload,
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 201);
        csvTestId = res.body.data._id;
        createdTestIds.push(csvTestId);
        assert.strictEqual(res.body.data.totalQuestions, 1);
    });

    // 7. Combined Test (QB + Manual + CSV)
    let combinedTestId = null;
    await test("7. Combined: Create Mock Test merging QB selection + Manual entry + CSV questions", async () => {
        const payload = {
            title: `AutoTest Combined 3-in-1 ${Date.now()}`,
            description: "Test combining Question Bank, Manual entry, and CSV questions",
            category: "Mixed Aptitude",
            company: "General",
            type: "topic_test",
            durationMinutes: 40,
            passingScore: 60,
            status: "published",
            assignedDepartments: [studentUser.department],
            questionIds: [bankQuestionIds[0]], // 1 from QB
            manualQuestions: [
                {
                    questionText: "What is 15 * 4?",
                    options: [
                        { key: "A", text: "50" },
                        { key: "B", text: "60" },
                        { key: "C", text: "70" },
                        { key: "D", text: "80" },
                    ],
                    correctOption: "B",
                    category: "Quantitative Aptitude",
                    topic: "Arithmetic",
                    difficulty: "easy",
                    marks: 1,
                },
            ], // 1 manual
            csvQuestions: [
                {
                    questionText: "What is the capital of France?",
                    options: [
                        { key: "A", text: "Berlin" },
                        { key: "B", text: "Madrid" },
                        { key: "C", text: "Paris" },
                        { key: "D", text: "Rome" },
                    ],
                    correctOption: "C",
                    category: "Verbal Ability",
                    topic: "General Knowledge",
                    difficulty: "easy",
                    marks: 1,
                },
            ], // 1 CSV
        };

        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: payload,
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.success, true);
        combinedTestId = res.body.data._id;
        createdTestIds.push(combinedTestId);
        assert.strictEqual(res.body.data.totalQuestions, 3, "Should have consolidated 3 questions");
    });

    // 8. Validation Rejection: No questions or invalid question structure
    await test("8. Validation: Reject test creation with no questions or invalid manual question", async () => {
        // Empty questions
        const emptyRes = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: "Invalid Empty Test",
                questionIds: [],
                manualQuestions: [],
                csvQuestions: [],
            },
            token: coordinatorToken,
        });
        assert.strictEqual(emptyRes.status, 400);

        // Invalid manual question (missing correct option)
        const invalidQRes = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: "Invalid Question Test",
                manualQuestions: [
                    {
                        questionText: "Incomplete question",
                        options: [{ key: "A", text: "Opt 1" }],
                        // missing correctOption
                    },
                ],
            },
            token: coordinatorToken,
        });
        assert.strictEqual(invalidQRes.status, 400);
    });

    // 9. Department-based Authorization & Visibility
    let restrictedDeptTestId = null;
    await test("9. Department targeting: Student can only view and start tests matching their department", async () => {
        // Create test for another department: e.g. "Civil Engineering"
        const foreignDept = "Civil Engineering Department XYZ";
        const foreignRes = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: `AutoTest Foreign Dept ${Date.now()}`,
                assignedDepartments: [foreignDept],
                questionIds: [bankQuestionIds[0]],
                durationMinutes: 15,
                status: "published",
            },
            token: coordinatorToken,
        });
        assert.strictEqual(foreignRes.status, 201);
        restrictedDeptTestId = foreignRes.body.data._id;
        createdTestIds.push(restrictedDeptTestId);

        // Student lists tests - should NOT see the foreign department test
        const listRes = await request("/tests/mock-tests", { token: studentToken });
        assert.strictEqual(listRes.status, 200);
        const testList = listRes.body.data;
        const found = testList.find((t) => t._id === restrictedDeptTestId);
        assert.strictEqual(found, undefined, "Student must NOT see test for foreign department");

        // Student tries to start the foreign test directly - should receive 403 Forbidden
        const startRes = await request(`/tests/mock-tests/${restrictedDeptTestId}/start`, {
            method: "POST",
            token: studentToken,
        });
        assert.strictEqual(startRes.status, 403, "Student must receive 403 when launching foreign test");
    });

    // 10. Scheduling: Upcoming test cannot be started before startDate
    let upcomingTestId = null;
    await test("10. Scheduling: Upcoming test is labeled 'upcoming' and cannot be started early", async () => {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: `AutoTest Upcoming ${Date.now()}`,
                assignedDepartments: ["ALL"],
                questionIds: [bankQuestionIds[0]],
                startDate: futureDate.toISOString(),
                durationMinutes: 15,
                status: "published",
            },
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 201);
        upcomingTestId = res.body.data._id;
        createdTestIds.push(upcomingTestId);

        // Check student listing computes scheduleStatus: "upcoming"
        const listRes = await request("/tests/mock-tests", { token: studentToken });
        assert.strictEqual(listRes.status, 200);
        const upcomingTest = listRes.body.data.find((t) => t._id === upcomingTestId);
        assert(upcomingTest, "Upcoming test should appear in student list");
        assert.strictEqual(upcomingTest.scheduleStatus, "upcoming");

        // Attempt to start early -> should fail with 400
        const startRes = await request(`/tests/mock-tests/${upcomingTestId}/start`, {
            method: "POST",
            token: studentToken,
        });
        assert.strictEqual(startRes.status, 400);
        assert(startRes.body.message.toLowerCase().includes("open"));
    });

    // 11. Scheduling: Expired / Closed test cannot be started after deadline
    let closedTestId = null;
    await test("11. Scheduling: Closed test is labeled 'closed' and cannot be started past deadline", async () => {
        const pastStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const pastEnd = new Date(Date.now() - 24 * 60 * 60 * 1000); // ended yesterday
        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: `AutoTest Closed ${Date.now()}`,
                assignedDepartments: ["ALL"],
                questionIds: [bankQuestionIds[0]],
                startDate: pastStart.toISOString(),
                endDate: pastEnd.toISOString(),
                durationMinutes: 15,
                status: "published",
            },
            token: coordinatorToken,
        });
        assert.strictEqual(res.status, 201);
        closedTestId = res.body.data._id;
        createdTestIds.push(closedTestId);

        // Check student listing computes scheduleStatus: "closed"
        const listRes = await request("/tests/mock-tests", { token: studentToken });
        assert.strictEqual(listRes.status, 200);
        const closedTest = listRes.body.data.find((t) => t._id === closedTestId);
        assert(closedTest, "Closed test should appear in student list");
        assert.strictEqual(closedTest.scheduleStatus, "closed");

        // Attempt to start -> should fail with 400
        const startRes = await request(`/tests/mock-tests/${closedTestId}/start`, {
            method: "POST",
            token: studentToken,
        });
        assert.strictEqual(startRes.status, 400);
        assert(startRes.body.message.includes("closed"));
    });

    // 12. Student Complete Test Lifecycle on newly created test
    let testAttemptId = null;
    await test("12. Complete student test lifecycle: start, answer, submit, score, and review", async () => {
        // Start the combined test
        const startRes = await request(`/tests/mock-tests/${combinedTestId}/start`, {
            method: "POST",
            token: studentToken,
        });
        assert.strictEqual(startRes.status, 201, `Could not start test: ${JSON.stringify(startRes.body)}`);
        testAttemptId = startRes.body.data.attemptId;
        const questions = startRes.body.data.questions;
        assert.strictEqual(questions.length, 3, "Should receive 3 questions");
        // Verify answers and explanations are stripped for student
        questions.forEach((q) => {
            assert.strictEqual(q.correctOption, undefined, "Security: correctOption must be stripped");
            assert.strictEqual(q.explanation, undefined, "Security: explanation must be stripped");
        });

        // Submit answers
        const answers = [
            { questionId: questions[0]._id, selectedOption: "A" },
            { questionId: questions[1]._id, selectedOption: "B" },
            { questionId: questions[2]._id, selectedOption: "C" },
        ];
        const submitRes = await request(`/tests/attempts/${testAttemptId}/submit`, {
            method: "POST",
            data: { answers },
            token: studentToken,
        });
        assert.strictEqual(submitRes.status, 200, `Submit failed: ${JSON.stringify(submitRes.body)}`);
        assert.strictEqual(submitRes.body.success, true);
        assert(submitRes.body.data.score !== undefined, "Score must be calculated");

        // Review attempt
        const reviewRes = await request(`/tests/attempts/${testAttemptId}/review`, {
            token: studentToken,
        });
        assert.strictEqual(reviewRes.status, 200);
        assert.strictEqual(reviewRes.body.success, true);
        assert(reviewRes.body.data.questions.length === 3);
    });

    // 13. Safe Archiving / Soft Deletion: Preserves historical attempts
    await test("13. Safe Archiving: Test is removed from student listing but attempts & review are preserved", async () => {
        // Archive the test that has a completed student attempt
        const archiveRes = await request(`/coordinator/mock-tests/${combinedTestId}`, {
            method: "DELETE",
            token: coordinatorToken,
        });
        assert.strictEqual(archiveRes.status, 200);
        assert.strictEqual(archiveRes.body.success, true);

        // Student listing: Test must now be absent
        const listRes = await request("/tests/mock-tests", { token: studentToken });
        assert.strictEqual(listRes.status, 200);
        const inList = listRes.body.data.find((t) => t._id === combinedTestId);
        assert.strictEqual(inList, undefined, "Archived test must not appear in student list");

        // Student attempt review: MUST STILL BE 100% ACCESSIBLE
        const reviewRes = await request(`/tests/attempts/${testAttemptId}/review`, {
            token: studentToken,
        });
        assert.strictEqual(reviewRes.status, 200, "Historical attempt review must be preserved!");
        assert.strictEqual(reviewRes.body.data.attemptId, testAttemptId);

        // Coordinator monitoring: MUST STILL BE ACCESSIBLE FOR AUDIT
        const monitorRes = await request(`/coordinator/mock-tests/${combinedTestId}/monitoring`, {
            token: coordinatorToken,
        });
        assert.strictEqual(monitorRes.status, 200, "Coordinator monitoring must remain accessible for archived test");
    });

    // 14. Edit Test: Updating details and schedules
    await test("14. Edit Test: Coordinator can update title, duration, schedule, and departments", async () => {
        const updateRes = await request(`/coordinator/mock-tests/${qbTestId}`, {
            method: "PUT",
            data: {
                title: "Updated QB Test Title",
                durationMinutes: 45,
                passingScore: 70,
                assignedDepartments: ["ALL"],
            },
            token: coordinatorToken,
        });
        assert.strictEqual(updateRes.status, 200);
        assert.strictEqual(updateRes.body.data.title, "Updated QB Test Title");
        assert.strictEqual(updateRes.body.data.durationMinutes, 45);
        assert.strictEqual(updateRes.body.data.passingScore, 70);
    });

    // 15. Duplicate Prevention: Verify no duplicates in student list
    await test("15. Duplicate Prevention: Student list contains strictly unique test IDs", async () => {
        const listRes = await request("/tests/mock-tests", { token: studentToken });
        assert.strictEqual(listRes.status, 200);
        const tests = listRes.body.data;
        const seen = new Set();
        for (const t of tests) {
            const id = String(t._id);
            assert(!seen.has(id), `Duplicate test ID detected in student list: ${id}`);
            seen.add(id);
        }
    });

    // 16. Cleanup: Remove temporary test records created during automated testing
    await test("16. Cleanup: Clean up temporary test artifacts", async () => {
        if (createdTestIds.length > 0) {
            await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
            const MockTest = (await import("../models/MockTest.js")).default;
            const Question = (await import("../models/Question.js")).default;
            const Attempt = (await import("../models/Attempt.js")).default;

            await MockTest.deleteMany({ _id: { $in: createdTestIds } });
            await Attempt.deleteMany({ mockTest: { $in: createdTestIds } });
            await Question.deleteMany({
                questionText: {
                    $regex: /Which data structure uses LIFO|What does HTTP stand for|What is 15 \* 4|What is the capital of France/i,
                },
            });
            await mongoose.disconnect();
        }
    });

    console.log(`\n==========================================`);
    console.log(`Test Results: ${passed} passed, ${failed} failed.`);
    console.log(`==========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
};

runUpgradeTests().catch((err) => {
    console.error("Test runner encountered error:", err);
    process.exit(1);
});
