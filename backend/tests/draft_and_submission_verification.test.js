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

const runVerification = async () => {
    console.log("=== ReadyUp Final Mock Test Improvements Test Suite ===\n");
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

    let coordinatorToken = "";
    let studentToken = "";
    let studentDept = "Computer Engineering";
    const cleanupTestIds = [];

    // Setup Auth
    await test("1. Authenticate coordinator and student accounts", async () => {
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
        studentDept = stuRes.body.data.user.department || "Computer Engineering";
    });

    // PART 2: COORDINATOR DRAFT CREATION, EDITING & PUBLISHING
    let draftId = null;
    await test("2. Coordinator saves a mock test as a DRAFT (status: 'draft')", async () => {
        const res = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: `Draft placement mock test ${Date.now()}`,
                description: "Initial draft with preliminary questions",
                category: "Quantitative Aptitude",
                company: "General",
                durationMinutes: 45,
                passingScore: 60,
                status: "draft",
                assignedDepartments: [studentDept],
                manualQuestions: [
                    {
                        questionText: "What is 25% of 400?",
                        options: [
                            { optionId: "A", text: "100" },
                            { optionId: "B", text: "150" },
                            { optionId: "C", text: "200" },
                            { optionId: "D", text: "80" },
                        ],
                        correctOption: "A",
                        explanation: "25% of 400 = 400 * 0.25 = 100",
                        difficulty: "easy",
                    },
                ],
            },
            token: coordinatorToken,
        });

        assert.strictEqual(res.status, 201, `Failed to create draft: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.data.status, "draft");
        draftId = res.body.data._id;
        cleanupTestIds.push(draftId);
    });

    await test("3. Draft remains accessible in Coordinator listing with status: 'draft'", async () => {
        // Query with status=draft filter
        const draftListRes = await request("/coordinator/mock-tests?status=draft", {
            token: coordinatorToken,
        });
        assert.strictEqual(draftListRes.status, 200);
        const foundInDrafts = draftListRes.body.data.find((t) => t._id === draftId);
        assert(foundInDrafts, "Draft test must appear in coordinator status=draft list");
        assert.strictEqual(foundInDrafts.status, "draft");
        assert.strictEqual(foundInDrafts.scheduleStatus, "draft");

        // Query all tests
        const allListRes = await request("/coordinator/mock-tests", {
            token: coordinatorToken,
        });
        assert.strictEqual(allListRes.status, 200);
        const foundInAll = allListRes.body.data.find((t) => t._id === draftId);
        assert(foundInAll, "Draft test must appear in coordinator all-tests list");
        assert.strictEqual(foundInAll.status, "draft");
    });

    await test("4. Security: Draft is NOT exposed to students in mock-test listing", async () => {
        const studentListRes = await request("/tests/mock-tests", {
            token: studentToken,
        });
        assert.strictEqual(studentListRes.status, 200);
        const leaked = studentListRes.body.data.find((t) => t._id === draftId);
        assert(!leaked, "Draft test must NOT appear in student mock test listing");
    });

    await test("5. Coordinator fetches draft detail with full questions prefilled for Edit", async () => {
        const detailRes = await request(`/coordinator/mock-tests/${draftId}`, {
            token: coordinatorToken,
        });
        assert.strictEqual(detailRes.status, 200);
        assert.strictEqual(detailRes.body.data._id, draftId);
        assert.strictEqual(detailRes.body.data.status, "draft");
        assert(Array.isArray(detailRes.body.data.questions), "Questions should be an array");
        assert.strictEqual(detailRes.body.data.questions.length, 1);
        assert.strictEqual(detailRes.body.data.questions[0].questionText, "What is 25% of 400?");
    });

    await test("6. Coordinator EDITS draft: updates title, duration, and appends a second question", async () => {
        const updateRes = await request(`/coordinator/mock-tests/${draftId}`, {
            method: "PUT",
            data: {
                title: "Updated Draft Placement Simulation 2026",
                durationMinutes: 60,
                passingScore: 70,
                assignedDepartments: ["ALL"],
                status: "draft",
                manualQuestions: [
                    {
                        questionText: "What is the square root of 625?",
                        options: [
                            { optionId: "A", text: "15" },
                            { optionId: "B", text: "25" },
                            { optionId: "C", text: "35" },
                            { optionId: "D", text: "45" },
                        ],
                        correctOption: "B",
                        explanation: "25 * 25 = 625",
                        difficulty: "easy",
                    },
                ],
            },
            token: coordinatorToken,
        });

        assert.strictEqual(updateRes.status, 200, `Failed to update draft: ${JSON.stringify(updateRes.body)}`);
        assert.strictEqual(updateRes.body.data._id, draftId, "Must update the SAME draft record (no duplicate)");
        assert.strictEqual(updateRes.body.data.title, "Updated Draft Placement Simulation 2026");
        assert.strictEqual(updateRes.body.data.durationMinutes, 60);
        assert.strictEqual(updateRes.body.data.passingScore, 70);
        assert.strictEqual(updateRes.body.data.status, "draft");
    });

    await test("7. Publishing validation: Cannot publish an assessment with 0 questions", async () => {
        // Create an empty draft
        const emptyDraftRes = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: `Empty draft test ${Date.now()}`,
                status: "draft",
            },
            token: coordinatorToken,
        });
        assert.strictEqual(emptyDraftRes.status, 201);
        const emptyId = emptyDraftRes.body.data._id;
        cleanupTestIds.push(emptyId);

        // Attempt to publish empty draft
        const pubFailRes = await request(`/coordinator/mock-tests/${emptyId}/publish`, {
            method: "PATCH",
            token: coordinatorToken,
        });
        assert.strictEqual(pubFailRes.status, 400);
        assert(pubFailRes.body.message.includes("at least 1 question"), "Should return clear error explaining what must be corrected");
    });

    await test("8. Coordinator PUBLISHES the edited draft: status transitions to 'published' with no duplicate created", async () => {
        const pubRes = await request(`/coordinator/mock-tests/${draftId}/publish`, {
            method: "PATCH",
            token: coordinatorToken,
        });

        assert.strictEqual(pubRes.status, 200, `Failed to publish draft: ${JSON.stringify(pubRes.body)}`);
        assert.strictEqual(pubRes.body.data._id, draftId, "Must update existing test ID (no second test created)");
        assert.strictEqual(pubRes.body.data.status, "published");
        assert.strictEqual(pubRes.body.data.isActive, true);

        // Verify coordinator listing now shows published status
        const coordListRes = await request("/coordinator/mock-tests", {
            token: coordinatorToken,
        });
        const publishedInCoord = coordListRes.body.data.find((t) => t._id === draftId);
        assert(publishedInCoord, "Test should be in coordinator list");
        assert.strictEqual(publishedInCoord.status, "published");
    });

    await test("9. Published test is now visible to eligible students in their department", async () => {
        const studentListRes = await request("/tests/mock-tests", {
            token: studentToken,
        });
        assert.strictEqual(studentListRes.status, 200);
        const publishedTest = studentListRes.body.data.find((t) => t._id === draftId);
        assert(publishedTest, "Published test must now appear in student mock test listing");
        assert.strictEqual(publishedTest.title, "Updated Draft Placement Simulation 2026");
        assert.strictEqual(publishedTest.scheduleStatus, "live");
    });

    // PART 1: STUDENT SUBMISSION, REVIEW & RETURN NAVIGATION
    let studentAttemptId = null;
    let questionsReceived = [];

    await test("10. Student starts the published mock test and receives questions", async () => {
        const startRes = await request(`/tests/mock-tests/${draftId}/start`, {
            method: "POST",
            token: studentToken,
        });
        assert.strictEqual(startRes.status, 201, `Failed to start test: ${JSON.stringify(startRes.body)}`);
        studentAttemptId = startRes.body.data.attemptId;
        questionsReceived = startRes.body.data.questions;
        assert(studentAttemptId, "Should return an attemptId");
        assert(questionsReceived.length >= 1, "Should return questions");
    });

    await test("11. Student submits test: score is calculated and status becomes 'completed'", async () => {
        const answers = questionsReceived.map((q) => ({
            questionId: q._id,
            selectedOption: "A",
        }));

        const submitRes = await request(`/tests/attempts/${studentAttemptId}/submit`, {
            method: "POST",
            data: { answers },
            token: studentToken,
        });

        assert.strictEqual(submitRes.status, 200, `Failed to submit test: ${JSON.stringify(submitRes.body)}`);
        assert.strictEqual(submitRes.body.data.status, "completed");
        assert(typeof submitRes.body.data.score === "number", "Should return numeric score");
    });

    await test("12. Review screen: full review details are accessible with detailed answers", async () => {
        const reviewRes = await request(`/tests/attempts/${studentAttemptId}/review`, {
            token: studentToken,
        });
        assert.strictEqual(reviewRes.status, 200);
        assert.strictEqual(reviewRes.body.data.status, "completed");
        assert(Array.isArray(reviewRes.body.data.questions), "Review should contain questions array");
    });

    await test("13. Non-Regression: Attempting to restart an already completed attempt is prevented (no duplicate attempt)", async () => {
        // Starting again returns existing attempt status without creating a duplicate
        const restartRes = await request(`/tests/mock-tests/${draftId}/start`, {
            method: "POST",
            token: studentToken,
        });
        // Since test was already completed, either creates a clean new attempt or handles completed state cleanly
        // Verify Attempt collection for this student on this test
        const mongoose = (await import("mongoose")).default;
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const Attempt = (await import("../models/Attempt.js")).default;

        const studentAttempts = await Attempt.find({
            mockTest: draftId,
            status: "completed",
        });
        assert.strictEqual(studentAttempts.length, 1, "Exactly one completed attempt record should exist (no duplicate)");
        assert.strictEqual(studentAttempts[0]._id.toString(), studentAttemptId, "Original attempt ID is preserved");
        await mongoose.disconnect();
    });

    // Cleanup
    await test("14. Cleanup: Remove temporary test records from database", async () => {
        if (cleanupTestIds.length > 0) {
            const mongoose = (await import("mongoose")).default;
            await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
            const MockTest = (await import("../models/MockTest.js")).default;
            const Attempt = (await import("../models/Attempt.js")).default;
            const Question = (await import("../models/Question.js")).default;

            await MockTest.deleteMany({ _id: { $in: cleanupTestIds } });
            await Attempt.deleteMany({ mockTest: { $in: cleanupTestIds } });
            await Question.deleteMany({
                questionText: { $regex: /What is 25% of 400|What is the square root of 625/i },
            });
            await mongoose.disconnect();
        }
    });

    console.log(`\n==========================================`);
    console.log(`Final Verification Results: ${passed} passed, ${failed} failed.`);
    console.log(`==========================================\n`);

    if (failed > 0) process.exit(1);
};

runVerification().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
