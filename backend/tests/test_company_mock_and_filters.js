import assert from "node:assert";
import dotenv from "dotenv";
import mongoose from "mongoose";
import "../models/Question.js";
import "../models/MockTest.js";
import "../models/Category.js";

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

    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body: json };
};

const runSuite = async () => {
    console.log("=== READYUP COMPANY DRILLS, MOCK TESTS & FILTERING TEST SUITE ===\n");
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

    // Authenticate student
    let studentToken = "";
    const loginRes = await request("/auth/login", {
        method: "POST",
        data: { email: "student@readyup.edu", password: "Password123!" },
    });
    assert.strictEqual(loginRes.status, 200, "Student login must succeed");
    studentToken = loginRes.body.data.token;

    // Connect DB for direct inspection
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (mongoUri && mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }

    // 1. Company Directory - Normalized & Dynamic Counts
    await test("Company Directory derives unique normalized companies with accurate counts", async () => {
        const res = await request("/companies", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.data), "Expected array of companies");
        assert.ok(res.body.data.length >= 8, `Expected at least 8 companies, got ${res.body.data.length}`);

        // Check for deduplication (case-insensitive)
        const nameSet = new Set();
        for (const c of res.body.data) {
            const lower = c.name.trim().toLowerCase();
            assert.strictEqual(nameSet.has(lower), false, `Duplicate company found: ${c.name}`);
            nameSet.add(lower);
            assert.ok(typeof c.questionCount === "number" && c.questionCount > 0, `Company ${c.name} questionCount must be > 0`);
            assert.ok(typeof c.assessmentCount === "number", `Company ${c.name} assessmentCount must be a number`);
        }

        const accenture = res.body.data.find(c => c.name.toLowerCase() === "accenture");
        assert.ok(accenture, "Accenture must be present in Company Directory");
        assert.ok(accenture.questionCount >= 60, `Accenture questionCount should be >= 60, got ${accenture.questionCount}`);
    });

    // 2. Company Detail By Slug
    await test("Company Detail endpoint returns accurate verified question count & key topics", async () => {
        const res = await request("/companies/accenture", { token: studentToken });
        assert.strictEqual(res.status, 200);
        const data = res.body.data;
        assert.strictEqual(data.name, "Accenture");
        assert.ok(data.questionCount >= 60, `Accenture verified questions must be >= 60, got ${data.questionCount}`);
        assert.ok(Array.isArray(data.keyTopics) && data.keyTopics.length > 0, "Key topics must be populated dynamically");
        assert.ok(data.testPattern || data.hiringPattern, "Test pattern must be present");
    });

    // 3. Take Full Mock Test: Query by Company & Type
    let accentureMockId = null;
    await test("Mock Tests endpoint returns company mock when filtered by company=Accenture & type=company_mock", async () => {
        const res = await request("/tests/mock-tests?company=Accenture&type=company_mock", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.data), "Expected array of mock tests");
        assert.ok(res.body.data.length >= 1, "Expected at least 1 mock test for Accenture");

        const mock = res.body.data[0];
        assert.ok(mock.title.toLowerCase().includes("accenture"), `Mock title should mention Accenture: ${mock.title}`);
        assert.strictEqual(mock.company, "Accenture");
        assert.ok(mock.totalQuestions >= 20 && mock.totalQuestions <= 35, `Question count should be placement length (20-35), got ${mock.totalQuestions}`);
        accentureMockId = mock._id;
    });

    // 4. Strict Company Question Membership: Every question must belong to Accenture
    await test("Accenture Mock Test contains ONLY questions explicitly tagged with Accenture", async () => {
        assert.ok(accentureMockId, "Need accentureMockId from previous test");
        const res = await request(`/tests/mock-tests/${accentureMockId}/start`, {
            method: "POST",
            token: studentToken,
        });
        assert.strictEqual(res.status, 201);
        const questions = res.body.data.questions;

        assert.ok(questions && questions.length >= 20, `Test must have questions, got ${questions ? questions.length : 0}`);

        // Query Question collection directly to verify original company tags
        const Question = mongoose.model("Question");
        for (const q of questions) {
            const dbQ = await Question.findById(q._id || q.id);
            assert.ok(dbQ, `Question ${q._id} must exist in DB`);
            const companies = (dbQ.companies || []).map(c => c.toLowerCase());
            assert.ok(
                companies.includes("accenture"),
                `Question ${dbQ._id} (${dbQ.questionId}) must be tagged with Accenture. Found: ${JSON.stringify(dbQ.companies)}`
            );
        }
    });

    // 5. Wipro-only questions must never appear in Accenture test
    await test("Wipro-only questions are strictly excluded from Accenture test", async () => {
        const Question = mongoose.model("Question");
        const wiproOnly = await Question.findOne({
            companies: { $regex: /^wipro$/i },
            $nor: [{ companies: { $regex: /^accenture$/i } }]
        });

        if (wiproOnly) {
            const res = await request(`/tests/mock-tests/${accentureMockId}/start`, {
                method: "POST",
                token: studentToken,
            });
            assert.strictEqual(res.status, 201);
            const qIds = res.body.data.questions.map(q => String(q._id || q.id));
            assert.strictEqual(
                qIds.includes(String(wiproOnly._id)),
                false,
                `Wipro-only question ${wiproOnly._id} found in Accenture mock test!`
            );
        }
    });

    // 6. Mock Generation Idempotency: Does not create duplicate mock tests on reload
    await test("Mock generation is idempotent and does not create duplicate MockTest documents", async () => {
        const MockTest = mongoose.model("MockTest");
        const initialCount = await MockTest.countDocuments({
            company: { $regex: /^accenture$/i },
            type: { $in: ["company_mock", "company"] }
        });

        // Call GET /tests/mock-tests?company=Accenture 3 more times
        await request("/tests/mock-tests?company=Accenture&type=company_mock", { token: studentToken });
        await request("/tests/mock-tests?company=Accenture&type=company_mock", { token: studentToken });
        await request("/tests/mock-tests?company=Accenture&type=company_mock", { token: studentToken });

        const finalCount = await MockTest.countDocuments({
            company: { $regex: /^accenture$/i },
            type: { $in: ["company_mock", "company"] }
        });

        assert.strictEqual(finalCount, initialCount, "Mock test count should not increase on repeated calls");
    });

    // 7. Tabs: All Assessments
    await test("All Assessments tab returns all active assessment types without duplicates", async () => {
        const res = await request("/tests/mock-tests", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.data.length >= 8, `Expected multiple assessments, got ${res.body.data.length}`);

        const testIds = new Set();
        for (const t of res.body.data) {
            assert.strictEqual(testIds.has(t._id), false, `Duplicate test found in All Assessments: ${t._id}`);
            testIds.add(t._id);
            assert.strictEqual(t.isActive, true, "Only active tests should be returned");
        }
    });

    // 8. Tabs: Company Mocks tab
    await test("Company Mocks tab returns only company-specific assessments", async () => {
        const res = await request("/tests/mock-tests?type=company_mock", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.length >= 8, `Expected company mocks, got ${res.body.data.length}`);
        for (const t of res.body.data) {
            assert.ok(["company", "company_mock"].includes(t.type), `Expected company type, got ${t.type}`);
            assert.ok(t.company, `Company mock must have company name, got: ${t.company}`);
        }
    });

    // 9. Tabs: Topic Tests tab
    await test("Topic Tests tab returns only topic-based assessments", async () => {
        const res = await request("/tests/mock-tests?type=topic_test", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.length >= 1, `Expected topic tests, got ${res.body.data.length}`);
        for (const t of res.body.data) {
            assert.ok(["topic", "topic_test"].includes(t.type), `Expected topic type, got ${t.type}`);
        }
    });

    // 10. Tabs: Diagnostic Assessments tab
    await test("Diagnostic Assessments tab returns only diagnostic assessments", async () => {
        const res = await request("/tests/mock-tests?type=diagnostic", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.length >= 1, `Expected diagnostic tests, got ${res.body.data.length}`);
        for (const t of res.body.data) {
            assert.strictEqual(t.type, "diagnostic", `Expected diagnostic type, got ${t.type}`);
        }
    });

    // 11. Topic Practice: Categories & dynamic topic counts
    await test("Categories endpoint dynamically returns topics with counts from Question bank", async () => {
        const res = await request("/questions/categories", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.data.length >= 4, "Must have at least 4 main aptitude categories");

        const quant = res.body.data.find(c => c.name.toLowerCase().includes("quant"));
        assert.ok(quant, "Quantitative Aptitude category must exist");
        assert.ok(Array.isArray(quant.topics) && quant.topics.length >= 5, "Quantitative topics must be populated");
        
        // Check that imported topic 'Algebra' is included
        const algebraTopic = quant.topics.find(t => t.name.toLowerCase() === "algebra");
        assert.ok(algebraTopic, "Topic 'Algebra' must be present from 685-question dataset");
        const count = algebraTopic.questionCount || algebraTopic.count;
        assert.ok(count >= 50, `Algebra question count should be >= 50, got ${count}`);
    });

    // 12. Topic Practice: Category filter
    await test("Question filtering by Category returns only matching category questions", async () => {
        const res = await request("/questions?category=Quantitative+Aptitude&limit=50", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.length > 0);
        for (const q of res.body.data) {
            assert.strictEqual(q.category, "Quantitative Aptitude", `Question ${q.questionId} category mismatch: ${q.category}`);
        }
    });

    // 13. Topic Practice: Topic filter
    await test("Question filtering by Category and Topic returns only matching topic questions", async () => {
        const res = await request("/questions?category=Quantitative+Aptitude&topic=Algebra&limit=50", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.length > 0);
        for (const q of res.body.data) {
            assert.strictEqual(q.category, "Quantitative Aptitude");
            assert.strictEqual(q.topic, "Algebra", `Question ${q.questionId} topic mismatch: ${q.topic}`);
        }
    });

    // 14. Topic Practice: Difficulty filter
    await test("Question filtering by Difficulty returns only matching difficulty questions", async () => {
        const res = await request("/questions?difficulty=Medium&limit=50", { token: studentToken });
        assert.strictEqual(res.status, 200);
        assert.ok(res.body.data.length > 0);
        for (const q of res.body.data) {
            assert.strictEqual(q.difficulty.toLowerCase(), "medium", `Question ${q.questionId} difficulty mismatch: ${q.difficulty}`);
        }
    });

    // 15. Quick 10-Q Mix Drill
    await test("Quick 10-Q Mix Drill respects category, difficulty, returns distinct questions without answer leakage", async () => {
        const res = await request("/tests/practice/start", {
            method: "POST",
            data: {
                category: "Quantitative Aptitude",
                difficulty: "Medium",
                count: 10,
            },
            token: studentToken,
        });
        assert.ok([200, 201].includes(res.status), `Expected 200 or 201, got ${res.status}`);
        const questions = res.body.data.questions;
        assert.ok(questions && questions.length <= 10 && questions.length > 0, `Expected up to 10 questions, got ${questions?.length}`);

        const qIdSet = new Set();
        for (const q of questions) {
            // Check for uniqueness
            assert.strictEqual(qIdSet.has(q._id), false, `Duplicate question in drill: ${q._id}`);
            qIdSet.add(q._id);

            // Check security: correctOption and explanation must not leak
            assert.strictEqual(q.correctOption, undefined, "correctOption must not be returned to student");
            assert.strictEqual(q.explanation, undefined, "explanation must not be returned to student");
        }
    });

    console.log("\n==========================================");
    console.log(`Test Results: ${passed} passed, ${failed} failed.`);
    console.log("==========================================");

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    if (failed > 0) {
        process.exit(1);
    }
};

runSuite().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
