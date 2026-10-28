import mongoose from "mongoose";
import MockTest from "../models/MockTest.js";
import Question from "../models/Question.js";
import Attempt from "../models/Attempt.js";
import Bookmark from "../models/Bookmark.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { logAuditEvent } from "../utils/auditLogger.js";

const escapeRegex = (string) => {
    return string ? string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
};

// Helper: Ensure a company has a verified full-length placement simulation mock test
export const ensureCompanyMockTest = async (companyName) => {
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) return null;
    const trimmed = companyName.trim();
    const slug = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-national-mock-test`;

    const escapedName = escapeRegex(trimmed);
    let existing = await MockTest.findOne({
        $or: [
            { slug },
            { company: new RegExp(`^${escapedName}$`, "i"), type: { $in: ["company", "company_mock"] } }
        ]
    });

    // Eligible active questions strictly tagged for this company
    const eligibleQuestions = await Question.find({
        companies: new RegExp(`^${escapedName}$`, "i"),
        isActive: true,
    }).select("_id category topic difficulty");

    if (eligibleQuestions.length === 0) {
        return null;
    }

    // Target full-length count: balanced across categories up to 30 (or actual available count)
    const targetCount = Math.min(30, eligibleQuestions.length);

    if (existing) {
        // If existing test has 0 questions or outdated question count, sync with real eligible questions
        if (!existing.questions || existing.questions.length === 0) {
            existing.questions = eligibleQuestions.slice(0, targetCount).map((q) => q._id);
            existing.totalQuestions = existing.questions.length;
            existing.totalMarks = existing.questions.length;
            existing.passingScore = 60;
            existing.type = "company_mock";
            await existing.save();
        }
        return existing;
    }

    // Select questions balanced across categories for a representative campus exam blueprint
    const categoriesMap = {};
    for (const q of eligibleQuestions) {
        const cat = q.category || "General";
        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push(q);
    }

    const selectedQuestionIds = [];
    const usedIds = new Set();
    const catKeys = Object.keys(categoriesMap);
    let added = true;

    while (selectedQuestionIds.length < targetCount && added) {
        added = false;
        for (const cat of catKeys) {
            const list = categoriesMap[cat];
            if (list && list.length > 0 && selectedQuestionIds.length < targetCount) {
                const nextQ = list.shift();
                if (!usedIds.has(String(nextQ._id))) {
                    usedIds.add(String(nextQ._id));
                    selectedQuestionIds.push(nextQ._id);
                    added = true;
                }
            }
        }
    }

    // If still need more to reach targetCount, fill with remaining eligible questions
    if (selectedQuestionIds.length < targetCount) {
        for (const q of eligibleQuestions) {
            if (!usedIds.has(String(q._id)) && selectedQuestionIds.length < targetCount) {
                usedIds.add(String(q._id));
                selectedQuestionIds.push(q._id);
            }
        }
    }

    const newTest = await MockTest.create({
        title: `${trimmed} National Qualifier Placement Simulation`,
        slug,
        type: "company_mock",
        company: trimmed,
        durationMinutes: 60,
        totalQuestions: selectedQuestionIds.length,
        totalMarks: selectedQuestionIds.length,
        passingScore: 60,
        category: "Mixed Aptitude",
        difficulty: "medium",
        questions: selectedQuestionIds,
        description: `Comprehensive 60-minute placement simulation covering verified hiring pattern and question types for ${trimmed}.`,
        instructions: [
            `This assessment consists of ${selectedQuestionIds.length} verified questions strictly tagged for ${trimmed}.`,
            "Each question carries 1 mark. There is no negative marking.",
            "Authoritative server countdown timer begins immediately upon test launch.",
            "Submit all answers before countdown expires to view detailed analytics and performance score."
        ],
        isActive: true,
    });

    return newTest;
};

// Helper: Ensure company mock tests exist for all companies that have active questions in MongoDB
export const ensureAllCompanyMockTests = async () => {
    try {
        const distinctCompanies = await Question.distinct("companies", { isActive: true });
        if (Array.isArray(distinctCompanies)) {
            for (const c of distinctCompanies) {
                if (c && typeof c === "string" && c.trim()) {
                    await ensureCompanyMockTest(c.trim());
                }
            }
        }
    } catch (err) {
        console.error("ensureAllCompanyMockTests error:", err.message);
    }
};

// Helper: Ensure Diagnostic and Topic tests exist in MockTest collection
export const ensureDiagnosticAndTopicTests = async () => {
    try {
        // 1. Diagnostic Assessment
        const existingDiag = await MockTest.findOne({ type: "diagnostic", isActive: true });
        if (!existingDiag) {
            const diagQuestions = await Question.find({ isActive: true })
                .select("_id")
                .limit(25);
            if (diagQuestions.length > 0) {
                await MockTest.create({
                    title: "ReadyUp All-India Placement Diagnostic Assessment",
                    slug: "readyup-all-india-diagnostic-assessment",
                    type: "diagnostic",
                    company: "General",
                    durationMinutes: 45,
                    totalQuestions: diagQuestions.length,
                    totalMarks: diagQuestions.length,
                    passingScore: 60,
                    category: "Mixed Aptitude",
                    difficulty: "medium",
                    questions: diagQuestions.map((q) => q._id),
                    description: "Authoritative diagnostic benchmark assessing readiness across Quantitative, Logical, and Verbal aptitude domains.",
                    instructions: [
                        `Diagnostic evaluation featuring ${diagQuestions.length} standardized questions.`,
                        "Calculators are not permitted.",
                        "Identifies strength and weakness domains to customize practice drills."
                    ],
                    isActive: true,
                });
            }
        }

        // 2. Ensure existing Quantitative Speed Drill has real questions linked
        const quantTest = await MockTest.findOne({ slug: "quantitative-aptitude-speed-drill" });
        if (quantTest && (!quantTest.questions || quantTest.questions.length === 0)) {
            const quantQs = await Question.find({ category: "Quantitative Aptitude", isActive: true })
                .select("_id")
                .limit(15);
            if (quantQs.length > 0) {
                quantTest.questions = quantQs.map((q) => q._id);
                quantTest.totalQuestions = quantQs.length;
                quantTest.totalMarks = quantQs.length;
                quantTest.type = "topic_test";
                await quantTest.save();
            }
        }

        // 3. Ensure Logical Reasoning Topic Sprint
        const existingLogical = await MockTest.findOne({ slug: "logical-reasoning-analytical-sprint" });
        if (!existingLogical) {
            const lrQs = await Question.find({ category: "Logical Reasoning", isActive: true })
                .select("_id")
                .limit(15);
            if (lrQs.length > 0) {
                await MockTest.create({
                    title: "Logical Reasoning & Analytical Ability Sprint",
                    slug: "logical-reasoning-analytical-sprint",
                    type: "topic_test",
                    company: "General",
                    durationMinutes: 25,
                    totalQuestions: lrQs.length,
                    totalMarks: lrQs.length,
                    passingScore: 60,
                    category: "Logical Reasoning",
                    difficulty: "medium",
                    questions: lrQs.map((q) => q._id),
                    description: "Speed sprint covering Number Series, Coding-Decoding, and Syllogisms.",
                    instructions: [
                        "15 analytical questions testing pattern recognition and logical deduction.",
                        "Timer enforces rapid problem-solving speed."
                    ],
                    isActive: true,
                });
            }
        }

        // 4. Ensure Verbal Ability Topic Sprint
        const existingVerbal = await MockTest.findOne({ slug: "verbal-ability-grammar-sprint" });
        if (!existingVerbal) {
            const vaQs = await Question.find({ category: "Verbal Ability", isActive: true })
                .select("_id")
                .limit(15);
            if (vaQs.length > 0) {
                await MockTest.create({
                    title: "Verbal Ability & Grammar Accuracy Sprint",
                    slug: "verbal-ability-grammar-sprint",
                    type: "topic_test",
                    company: "General",
                    durationMinutes: 20,
                    totalQuestions: vaQs.length,
                    totalMarks: vaQs.length,
                    passingScore: 60,
                    category: "Verbal Ability",
                    difficulty: "medium",
                    questions: vaQs.map((q) => q._id),
                    description: "Placement verbal assessment testing grammar, vocabulary, and sentence ordering.",
                    instructions: [
                        "15 verbal ability questions commonly tested in campus hiring exams.",
                        "20 minutes allocated."
                    ],
                    isActive: true,
                });
            }
        }
    } catch (err) {
        console.error("ensureDiagnosticAndTopicTests error:", err.message);
    }
};

export const isStudentEligibleForTest = (student, test) => {
    if (!student || student.role !== "student") return true;

    // Direct student assignment
    if (Array.isArray(test.assignedStudents) && test.assignedStudents.length > 0) {
        const studentIdStr = String(student._id);
        const hasDirectAssignment = test.assignedStudents.some(
            (sId) => String(sId._id || sId) === studentIdStr
        );
        if (hasDirectAssignment) return true;
    }

    const assignedDepts = [
        ...(Array.isArray(test.assignedDepartments) ? test.assignedDepartments : []),
        ...(Array.isArray(test.assignedBatches) ? test.assignedBatches : []),
    ]
        .map((d) => String(d).trim().toLowerCase())
        .filter(Boolean);

    // If no specific departments or batches are restricted, open to all (legacy tests and open mocks)
    if (assignedDepts.length === 0) return true;

    // If explicit "all" or "all departments" is present
    if (assignedDepts.includes("all") || assignedDepts.includes("all departments")) return true;

    // Check student department & graduation year
    const studentDept = (student.department || "").trim().toLowerCase();
    const studentGradYear = String(student.graduationYear || "");

    const matchesDept = assignedDepts.some((dept) => {
        if (!dept) return false;
        return (
            dept === studentDept ||
            (studentDept && (studentDept.includes(dept) || dept.includes(studentDept))) ||
            (studentGradYear && dept === studentGradYear)
        );
    });

    return matchesDept;
};

export const getMockTests = async (req, res) => {
    try {
        const { type, category, difficulty, company } = req.query;

        // Idempotently ensure company mocks and category assessments are available
        await ensureAllCompanyMockTests();
        await ensureDiagnosticAndTopicTests();

        const filter = { isActive: true };

        // Exclude drafts and archived tests for students and unauthenticated views
        const isPrivileged = req.user && ["coordinator", "admin"].includes(req.user.role);
        if (!isPrivileged) {
            filter.status = { $nin: ["draft", "archived"] };
        }

        // Handle tabs and assessment types safely, including legacy values
        if (type && type !== "all") {
            if (type === "company_mock" || type === "company") {
                filter.type = { $in: ["company", "company_mock"] };
            } else if (type === "topic_test" || type === "topic") {
                filter.type = { $in: ["topic", "topic_test", "grand"] };
                if (!company) {
                    filter.company = { $in: ["", null, "General"] };
                }
            } else if (type === "diagnostic") {
                filter.type = "diagnostic";
            } else {
                filter.type = type;
            }
        }

        // Strict company filtering when requested
        if (company && typeof company === "string" && company.trim()) {
            filter.company = new RegExp(`^${escapeRegex(company.trim())}$`, "i");
        }

        if (category) filter.category = new RegExp(category, "i");
        if (difficulty) filter.difficulty = difficulty.toLowerCase();

        let tests = await MockTest.find(filter)
            .select("-questions")
            .sort({ createdAt: -1 });

        // Department-based filtering for students
        if (req.user && req.user.role === "student") {
            tests = tests.filter((t) => isStudentEligibleForTest(req.user, t));
        }

        // Fetch student's existing attempt status if authenticated student
        let attemptMap = new Map();
        if (req.user && req.user.role === "student" && tests.length > 0) {
            const testIds = tests.map((t) => t._id);
            const studentAttempts = await Attempt.find({
                student: req.user._id,
                type: "mock-test",
                mockTest: { $in: testIds },
            })
                .select("mockTest status result score totalMarks")
                .lean();

            studentAttempts.forEach((att) => {
                const testIdKey = String(att.mockTest);
                const existing = attemptMap.get(testIdKey);
                if (!existing || att.status === "completed") {
                    attemptMap.set(testIdKey, att);
                }
            });
        }

        const now = new Date();
        const formatted = tests.map((t) => {
            const obj = t.toObject();
            // Normalize type representation for the frontend tabs
            if (obj.type === "company") obj.type = "company_mock";
            if (obj.type === "topic" || obj.type === "grand") obj.type = "topic_test";
            obj.totalMarks = obj.totalMarks || obj.totalQuestions || 15;
            obj.passingMarks = Math.round((obj.totalMarks * (obj.passingScore || 60)) / 100);

            // Compute schedule state
            const effectiveStart = obj.startDate || obj.startTime || null;
            const effectiveEnd = obj.endDate || obj.deadline || null;
            let scheduleStatus = "live";
            if (obj.status === "draft") {
                scheduleStatus = "draft";
            } else if (effectiveStart && now < new Date(effectiveStart)) {
                scheduleStatus = "upcoming";
            } else if (effectiveEnd && now > new Date(effectiveEnd)) {
                scheduleStatus = "closed";
            }
            obj.startDate = effectiveStart;
            obj.endDate = effectiveEnd;
            obj.startTime = effectiveStart;
            obj.deadline = effectiveEnd;
            obj.scheduleStatus = scheduleStatus;

            // Attach user's attempt status if student
            const userAtt = attemptMap.get(String(obj._id));
            if (userAtt) {
                obj.userAttempt = {
                    attemptId: userAtt._id,
                    status: userAtt.status,
                    result: userAtt.result,
                    score: userAtt.score,
                };
            }

            return obj;
        });

        return res.json({
            success: true,
            message: "Mock tests retrieved successfully",
            data: formatted,
        });
    } catch (error) {
        console.error("getMockTests error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve mock tests",
        });
    }
};

export const getMockTestById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }
        const test = await MockTest.findById(id).select("-questions");

        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        const isPrivileged = req.user && ["coordinator", "admin"].includes(req.user.role);
        if (!isPrivileged) {
            if (!test.isActive || ["draft", "archived"].includes(test.status)) {
                return res.status(404).json({
                    success: false,
                    message: "Mock test not found or is no longer available.",
                });
            }
            if (req.user && !isStudentEligibleForTest(req.user, test)) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to view this mock test.",
                });
            }
        }

        const obj = test.toObject();
        obj.totalMarks = obj.totalMarks || obj.totalQuestions || 15;
        obj.passingMarks = Math.round((obj.totalMarks * (obj.passingScore || 60)) / 100);

        const now = new Date();
        const effectiveStart = obj.startDate || obj.startTime || null;
        const effectiveEnd = obj.endDate || obj.deadline || null;
        let scheduleStatus = "live";
        if (obj.status === "draft") {
            scheduleStatus = "draft";
        } else if (effectiveStart && now < new Date(effectiveStart)) {
            scheduleStatus = "upcoming";
        } else if (effectiveEnd && now > new Date(effectiveEnd)) {
            scheduleStatus = "closed";
        }
        obj.startDate = effectiveStart;
        obj.endDate = effectiveEnd;
        obj.startTime = effectiveStart;
        obj.deadline = effectiveEnd;
        obj.scheduleStatus = scheduleStatus;

        return res.json({
            success: true,
            message: "Mock test retrieved successfully",
            data: obj,
        });
    } catch (error) {
        console.error("getMockTestById error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve mock test",
        });
    }
};

export const startPractice = async (req, res) => {
    try {
        const {
            category,
            topic,
            subtopic,
            difficulty,
            company,
            count = 10,
            questionIds,
            isRevision,
        } = req.body;

        let questions = [];

        // If specific revision question IDs are provided, retrieve those questions
        if (Array.isArray(questionIds) && questionIds.length > 0) {
            const rawIds = questionIds.map((id) => String(id).trim()).filter(Boolean);
            const objectIds = rawIds.filter((id) => id.match(/^[0-9a-fA-F]{24}$/));

            questions = await Question.find({
                $or: [
                    { questionId: { $in: rawIds } },
                    { questionId: { $in: rawIds.map((id) => id.toUpperCase()) } },
                    { _id: { $in: objectIds } },
                ],
                isActive: true,
            });

            // Backfill from student attempt snapshots if any revision question was from an assessment snapshot
            if (questions.length < rawIds.length) {
                const foundIds = new Set([
                    ...questions.map((q) => q.questionId?.toUpperCase()),
                    ...questions.map((q) => q._id.toString()),
                ]);
                const missingIds = rawIds.filter((id) => !foundIds.has(id.toUpperCase()) && !foundIds.has(id));
                if (missingIds.length > 0) {
                    const attempts = await Attempt.find({ student: req.user._id, isSubmitted: true }).sort({ createdAt: -1 });
                    for (const att of attempts) {
                        for (const q of att.questions) {
                            const qIdUpper = q.questionId?.toUpperCase();
                            const qRefStr = q.questionRef?.toString();
                            if (
                                (missingIds.some((m) => m.toUpperCase() === qIdUpper) || (qRefStr && missingIds.includes(qRefStr))) &&
                                !foundIds.has(qIdUpper)
                            ) {
                                foundIds.add(qIdUpper);
                                questions.push({
                                    _id: q.questionRef || q._id,
                                    questionId: q.questionId,
                                    questionText: q.questionText,
                                    options: q.options,
                                    correctOption: q.correctOption,
                                    explanation: q.explanation || "",
                                    category: q.category || "General",
                                    topic: q.topic || "General",
                                    difficulty: q.difficulty || "medium",
                                    isActive: true,
                                });
                            }
                        }
                    }
                }
            }
        } else {
            const filter = { isActive: true };
            if (category && category !== "All") filter.category = new RegExp(`^${escapeRegex(category.trim())}$`, "i");
            if (topic && topic !== "All Topics (Mixed)") filter.topic = new RegExp(`^${escapeRegex(topic.trim())}$`, "i");
            if (subtopic) filter.subtopic = new RegExp(`^${escapeRegex(subtopic.trim())}$`, "i");
            if (difficulty && difficulty !== "all") filter.difficulty = difficulty.toLowerCase().trim();
            if (company && typeof company === "string" && company.trim()) {
                filter.companies = new RegExp(`^${escapeRegex(company.trim())}$`, "i");
            }

            const limitCount = Math.max(1, Math.min(50, parseInt(count, 10) || 10));

            // Random or latest sample of matching questions
            questions = await Question.aggregate([
                { $match: filter },
                { $sample: { size: limitCount } },
            ]);
        }

        if (!questions || questions.length === 0) {
            const filterDesc = [company, category, topic, difficulty].filter(Boolean).join(" / ");
            return res.status(404).json({
                success: false,
                message: isRevision
                    ? "No questions are currently eligible for revision practice."
                    : (filterDesc
                        ? `No questions currently match your selected filters (${filterDesc}).`
                        : "No questions currently available for this selection."),
            });
        }

        const title = isRevision
            ? "Revision Practice Drill"
            : (topic
                ? `${topic} Practice Drill`
                : category
                    ? `${category} Practice Session`
                    : "Mixed Aptitude Practice");

        // Snapshot question objects so updates to questions collection don't alter test history
        const questionSnapshots = questions.map((q) => ({
            questionRef: q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
            userAnswer: null,
            isCorrect: false,
            timeSpentSeconds: 0,
        }));

        const durationMinutes = Math.max(5, Math.round(questions.length * 1.5));

        const attempt = await Attempt.create({
            student: req.user._id,
            type: "practice",
            title,
            category: category || "Mixed",
            topic: topic || "Mixed Topics",
            difficulty: difficulty || "Mixed",
            durationMinutes,
            totalQuestions: questions.length,
            questions: questionSnapshots,
            totalMarks: questions.length,
            status: "in-progress",
            startTime: new Date(),
        });

        // Strip correct answers and explanations before sending to client
        const safeQuestions = questions.map((q) => ({
            _id: q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
        }));

        return res.status(201).json({
            success: true,
            message: "Practice session initialized successfully",
            data: {
                attemptId: attempt._id,
                title: attempt.title,
                type: attempt.type,
                durationMinutes: attempt.durationMinutes,
                totalQuestions: attempt.totalQuestions,
                startTime: attempt.startTime,
                questions: safeQuestions,
            },
        });
    } catch (error) {
        console.error("startPractice error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to initialize practice drill",
        });
    }
};

export const startMockTest = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }
        const test = await MockTest.findById(id).populate({
            path: "questions",
            match: { isActive: true },
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        if (!test.isActive || ["draft", "archived"].includes(test.status)) {
            return res.status(403).json({
                success: false,
                message: "This mock test is currently not available for attempts.",
            });
        }

        if (req.user && !isStudentEligibleForTest(req.user, test)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to attempt this mock test for your department.",
            });
        }

        const now = new Date();
        const effectiveStart = test.startDate || test.startTime;
        const effectiveEnd = test.endDate || test.deadline;
        if (effectiveStart && now < new Date(effectiveStart)) {
            return res.status(400).json({
                success: false,
                message: `This mock test is scheduled to open on ${new Date(effectiveStart).toLocaleString()}. Please return when the assessment is live.`,
            });
        }

        if (effectiveEnd && now > new Date(effectiveEnd)) {
            return res.status(400).json({
                success: false,
                message: `This mock test closed on ${new Date(effectiveEnd).toLocaleString()}. New attempts cannot be started.`,
            });
        }

        // Resume existing in-progress attempt if not expired
        const existingAttempt = await Attempt.findOne({
            student: req.user._id,
            mockTest: test._id,
            status: "in-progress",
        });

        if (existingAttempt) {
            const elapsedSec = Math.floor((now.getTime() - new Date(existingAttempt.startTime).getTime()) / 1000);
            const totalSec = (existingAttempt.durationMinutes || test.durationMinutes || 30) * 60;
            if (elapsedSec < totalSec) {
                const safeQuestions = (existingAttempt.questions || []).map((q) => ({
                    _id: q.questionRef || q._id,
                    questionId: q.questionId,
                    questionText: q.questionText,
                    options: q.options,
                    category: q.category,
                    topic: q.topic,
                    difficulty: q.difficulty,
                }));
                return res.status(200).json({
                    success: true,
                    message: "Mock test resumed. Timer is now running.",
                    data: {
                        attemptId: existingAttempt._id,
                        mockTestId: test._id,
                        title: existingAttempt.title || test.title,
                        type: "mock-test",
                        durationMinutes: existingAttempt.durationMinutes || test.durationMinutes,
                        totalQuestions: existingAttempt.totalQuestions,
                        startTime: existingAttempt.startTime,
                        remainingSeconds: Math.max(0, totalSec - elapsedSec),
                        questions: safeQuestions,
                        resumed: true,
                    },
                });
            } else {
                existingAttempt.status = "expired";
                await existingAttempt.save();
            }
        }

        let testQuestions = (test.questions || []).filter(Boolean);
        if (testQuestions.length === 0) {
            // Find questions matching test category / company
            const qFilter = { isActive: true };
            if (test.company && test.company.toLowerCase() !== "general") {
                qFilter.companies = new RegExp(escapeRegex(test.company), "i");
            }
            if (test.category && !["mixed", "mixed aptitude"].includes(test.category.toLowerCase())) {
                qFilter.category = new RegExp(escapeRegex(test.category), "i");
            }
            testQuestions = await Question.find(qFilter).limit(test.totalQuestions || 15);

            if (testQuestions.length === 0 && qFilter.companies) {
                const catFilter = { isActive: true };
                if (qFilter.category) catFilter.category = qFilter.category;
                testQuestions = await Question.find(catFilter).limit(test.totalQuestions || 15);
            }

            if (testQuestions.length === 0) {
                testQuestions = await Question.find({ isActive: true }).limit(test.totalQuestions || 15);
            }
        }

        if (testQuestions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "This mock test currently has no active questions configured. Please contact your coordinator.",
            });
        }

        const questionSnapshots = testQuestions.map((q) => ({
            questionRef: q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
            userAnswer: null,
            isCorrect: false,
            timeSpentSeconds: 0,
        }));

        const attempt = await Attempt.create({
            student: req.user._id,
            type: "mock-test",
            mockTest: test._id,
            title: test.title,
            category: test.category,
            difficulty: test.difficulty,
            durationMinutes: test.durationMinutes,
            totalQuestions: questionSnapshots.length,
            questions: questionSnapshots,
            totalMarks: questionSnapshots.length,
            status: "in-progress",
            startTime: new Date(),
        });

        // Strip correctOption and explanation
        const safeQuestions = testQuestions.map((q) => ({
            _id: q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
        }));

        return res.status(201).json({
            success: true,
            message: "Mock test started. Timer is now running.",
            data: {
                attemptId: attempt._id,
                mockTestId: test._id,
                title: test.title,
                type: "mock-test",
                durationMinutes: test.durationMinutes,
                totalQuestions: attempt.totalQuestions,
                startTime: attempt.startTime,
                questions: safeQuestions,
            },
        });
    } catch (error) {
        console.error("startMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to start mock test",
        });
    }
};

export const submitAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { answers = {} } = req.body;

        const attempt = await Attempt.findById(attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Test attempt not found",
            });
        }

        // Ownership isolation
        if (attempt.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not own this attempt.",
            });
        }

        // Prevent resubmission of expired or already submitted attempts
        if (attempt.isSubmitted || attempt.status === "completed" || attempt.status === "expired") {
            return res.status(409).json({
                success: false,
                message: attempt.status === "expired"
                    ? "This test attempt has expired and can no longer be submitted."
                    : "This test attempt has already been submitted.",
                data: {
                    attemptId: attempt._id,
                    status: attempt.status,
                    score: attempt.score,
                    totalMarks: attempt.totalMarks,
                    accuracy: attempt.accuracy,
                    result: attempt.result,
                },
            });
        }

        const now = new Date();
        const elapsedSec = Math.max(1, Math.round((now.getTime() - new Date(attempt.startTime).getTime()) / 1000));
        const maxAllowedSec = attempt.durationMinutes * 60 + 120; // Duration plus 2-minute network grace period

        // Server-enforced test expiration
        if (elapsedSec > maxAllowedSec) {
            const expiredAttempt = await Attempt.findOneAndUpdate(
                { _id: attemptId, isSubmitted: false, status: "in-progress" },
                {
                    $set: {
                        status: "expired",
                        result: "Failed",
                        isSubmitted: true,
                        score: 0,
                        accuracy: 0,
                        endTime: now,
                        timeSpentSeconds: maxAllowedSec,
                    },
                },
                { returnDocument: "after" }
            );

            if (!expiredAttempt) {
                const existing = await Attempt.findById(attemptId);
                return res.status(409).json({
                    success: false,
                    message: "This test attempt has already been submitted.",
                    data: {
                        attemptId: existing._id,
                        status: existing.status,
                        score: existing.score,
                    },
                });
            }

            return res.status(400).json({
                success: false,
                message: "Test duration has expired. Late submissions cannot be accepted.",
                data: {
                    attemptId: expiredAttempt._id,
                    status: "expired",
                    score: 0,
                    totalMarks: expiredAttempt.totalMarks,
                    accuracy: 0,
                    result: "Failed",
                    timeSpentSeconds: maxAllowedSec,
                    submittedAt: now,
                },
            });
        }

        // Format answers dictionary: accepts array of [{ questionId, selectedOption/answer/userAnswer }] or object { [questionId]: "A" | { selectedOption: "A" } }
        const answerMap = {};
        if (Array.isArray(answers)) {
            answers.forEach((item) => {
                if (!item || typeof item !== "object") return;
                const rawChoice = item.selectedOption ?? item.answer ?? item.userAnswer ?? item.selectedAnswer ?? item.choice ?? null;
                const normChoice = typeof rawChoice === "string" ? rawChoice.trim().toUpperCase() : rawChoice;
                if (item.questionId) {
                    const strId = String(item.questionId).trim();
                    answerMap[strId] = normChoice;
                    answerMap[strId.toUpperCase()] = normChoice;
                }
                if (item.questionRef) answerMap[item.questionRef.toString()] = normChoice;
                if (item._id) answerMap[item._id.toString()] = normChoice;
            });
        } else if (typeof answers === "object" && answers !== null) {
            Object.entries(answers).forEach(([key, val]) => {
                let normChoice = null;
                if (typeof val === "string") {
                    normChoice = val.trim().toUpperCase();
                } else if (val && typeof val === "object") {
                    const subChoice = val.selectedOption ?? val.answer ?? val.userAnswer ?? val.selectedAnswer ?? val.choice ?? null;
                    if (typeof subChoice === "string") normChoice = subChoice.trim().toUpperCase();
                    else normChoice = subChoice;
                }
                const strKey = String(key).trim();
                answerMap[strKey] = normChoice;
                answerMap[strKey.toUpperCase()] = normChoice;
            });
        }

        let correctCount = 0;
        let answeredCount = 0;

        attempt.questions.forEach((q) => {
            const rawChoice =
                (q.questionId && answerMap[q.questionId]) ||
                (q.questionId && answerMap[q.questionId.trim().toUpperCase()]) ||
                (q.questionRef && answerMap[q.questionRef.toString()]) ||
                (q._id && answerMap[q._id.toString()]) ||
                null;

            let userChoice = null;
            if (typeof rawChoice === "string") {
                userChoice = rawChoice.trim().toUpperCase();
            } else if (rawChoice && typeof rawChoice === "object") {
                const sub = rawChoice.selectedOption ?? rawChoice.answer ?? rawChoice.userAnswer ?? null;
                if (typeof sub === "string") userChoice = sub.trim().toUpperCase();
            }

            q.userAnswer = userChoice;

            const expected = (q.correctOption || "").trim().toUpperCase();
            if (userChoice) {
                answeredCount += 1;
                if (userChoice === expected) {
                    q.isCorrect = true;
                    correctCount += 1;
                } else {
                    q.isCorrect = false;
                }
            } else {
                q.isCorrect = false;
            }
        });

        const totalQ = attempt.questions.length || 1;
        const accuracy = Math.round((correctCount / totalQ) * 100);
        const score = correctCount;
        const passingPct = 60;
        const resultStatus = accuracy >= passingPct ? "Passed" : "Needs Review";

        // Concurrency-safe atomic transition
        const submittedAttempt = await Attempt.findOneAndUpdate(
            { _id: attemptId, isSubmitted: false, status: "in-progress" },
            {
                $set: {
                    questions: attempt.questions,
                    score,
                    totalMarks: totalQ,
                    accuracy,
                    result: resultStatus,
                    status: "completed",
                    isSubmitted: true,
                    endTime: now,
                    timeSpentSeconds: elapsedSec,
                },
            },
            { returnDocument: "after" }
        );

        if (!submittedAttempt) {
            const existing = await Attempt.findById(attemptId);
            return res.status(409).json({
                success: false,
                message: existing.status === "expired"
                    ? "This test attempt has expired and can no longer be submitted."
                    : "This test attempt has already been submitted.",
                data: {
                    attemptId: existing._id,
                    status: existing.status,
                    score: existing.score,
                },
            });
        }

        // If student answers questions incorrectly in this new attempt, ensure any prior dismissal is cleared so they reappear for revision
        const newlyMissedIds = attempt.questions
            .filter((q) => q.userAnswer && !q.isCorrect)
            .map((q) => q.questionId)
            .filter(Boolean);

        if (newlyMissedIds.length > 0) {
            try {
                const user = await User.findById(req.user._id).select("dismissedIncorrectQuestions");
                if (user?.dismissedIncorrectQuestions?.length > 0) {
                    const missedLowerSet = new Set(newlyMissedIds.map((id) => id.trim().toLowerCase()));
                    const remaining = user.dismissedIncorrectQuestions.filter((entry) => {
                        const rawId = entry.split("|")[0].trim().toLowerCase();
                        return !missedLowerSet.has(rawId);
                    });
                    if (remaining.length !== user.dismissedIncorrectQuestions.length) {
                        user.dismissedIncorrectQuestions = remaining;
                        await user.save();
                    }
                }
            } catch (clearDismissErr) {
                console.error("Error clearing prior dismissal for newly missed questions:", clearDismissErr.message);
            }
        }

        // Increment mock test stats if mock test
        if (submittedAttempt.mockTest) {
            await MockTest.findByIdAndUpdate(submittedAttempt.mockTest, {
                $inc: { attemptsCount: 1 },
            }).catch(() => null);
        }

        // Auto-save questions marked for review to student bookmarks
        if (Array.isArray(answers)) {
            for (const item of answers) {
                if (item && item.markedForReview && item.questionId) {
                    try {
                        const trimmedQId = String(item.questionId).trim();
                        const qSnap = attempt.questions.find(
                            (x) => x.questionId && x.questionId.toLowerCase() === trimmedQId.toLowerCase()
                        );
                        let questionRef = qSnap?.questionRef;
                        if (!questionRef) {
                            const foundQ = await Question.findOne({
                                $or: [
                                    { questionId: trimmedQId },
                                    { questionId: trimmedQId.toUpperCase() },
                                    { questionId: new RegExp(`^${trimmedQId}$`, "i") },
                                    ...(trimmedQId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: trimmedQId }] : []),
                                ],
                            });
                            if (foundQ) {
                                questionRef = foundQ._id;
                            } else if (qSnap) {
                                const newQ = await Question.create({
                                    questionId: qSnap.questionId.toUpperCase(),
                                    questionText: qSnap.questionText,
                                    options: qSnap.options,
                                    correctOption: qSnap.correctOption,
                                    explanation: qSnap.explanation || "",
                                    category: qSnap.category || "General",
                                    topic: qSnap.topic || "General",
                                    difficulty: qSnap.difficulty || "medium",
                                    isVerified: true,
                                    isActive: true,
                                });
                                questionRef = newQ._id;
                            }
                        }
                        if (questionRef) {
                            await Bookmark.findOneAndUpdate(
                                { student: req.user._id, question: questionRef },
                                {
                                    $setOnInsert: {
                                        student: req.user._id,
                                        question: questionRef,
                                        questionId: qSnap?.questionId || trimmedQId,
                                        notes: "Marked for Review",
                                    },
                                },
                                { upsert: true }
                            );
                        }
                    } catch (bookmarkErr) {
                        console.error("Auto-bookmark marked question error:", bookmarkErr.message);
                    }
                }
            }
        }

        // Revision Center cleanup: remove only successfully corrected questions from active revision eligibility
        const correctedQuestions = attempt.questions.filter((q) => q.isCorrect === true);
        if (correctedQuestions.length > 0) {
            try {
                const nowIso = new Date().toISOString();
                const user = await User.findById(req.user._id).select("dismissedIncorrectQuestions");
                if (user) {
                    const existingDismissed = user.dismissedIncorrectQuestions || [];
                    const newlyCorrectedEntries = correctedQuestions
                        .filter((q) => q.questionId)
                        .map((q) => `${String(q.questionId).trim()}|${nowIso}`);
                    user.dismissedIncorrectQuestions = [...existingDismissed, ...newlyCorrectedEntries];
                    await user.save();
                }

                // If corrected question was bookmarked and NOT re-marked for review in this attempt, remove bookmark
                for (const cq of correctedQuestions) {
                    const wasMarkedAgain = Array.isArray(answers) && answers.some(
                        (a) => a && a.markedForReview && (
                            (a.questionId && cq.questionId && a.questionId.toLowerCase() === cq.questionId.toLowerCase()) ||
                            (a.questionRef && cq.questionRef && a.questionRef.toString() === cq.questionRef.toString())
                        )
                    );
                    if (!wasMarkedAgain) {
                        const deleteQuery = { student: req.user._id };
                        const orClauses = [];
                        if (cq.questionRef) orClauses.push({ question: cq.questionRef });
                        if (cq.questionId) orClauses.push({ questionId: cq.questionId });
                        if (orClauses.length > 0) {
                            deleteQuery.$or = orClauses;
                            await Bookmark.deleteMany(deleteQuery);
                        }
                    }
                }
            } catch (revisionCleanErr) {
                console.error("Error updating revision list for corrected questions:", revisionCleanErr.message);
            }
        }

        return res.json({
            success: true,
            message: "Test submitted and scored successfully",
            data: {
                attemptId: submittedAttempt._id,
                title: submittedAttempt.title,
                type: submittedAttempt.type,
                status: submittedAttempt.status,
                score: submittedAttempt.score,
                totalMarks: submittedAttempt.totalMarks,
                accuracy: submittedAttempt.accuracy,
                correctCount,
                wrongCount: answeredCount - correctCount,
                unansweredCount: totalQ - answeredCount,
                timeSpentSeconds: submittedAttempt.timeSpentSeconds,
                result: submittedAttempt.result,
                submittedAt: submittedAttempt.endTime,
            },
        });
    } catch (error) {
        console.error("submitAttempt error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to submit attempt",
        });
    }
};

export const getAttemptReview = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const attempt = await Attempt.findById(attemptId);

        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Test attempt not found",
            });
        }

        const isOwner = attempt.student.toString() === req.user._id.toString();
        const isPrivileged = ["coordinator", "admin"].includes(req.user.role);

        if (!isOwner && !isPrivileged) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You cannot access review for another student's test.",
            });
        }

        return res.json({
            success: true,
            message: "Review retrieved successfully",
            data: {
                attemptId: attempt._id,
                title: attempt.title,
                type: attempt.type,
                status: attempt.status,
                isSubmitted: attempt.isSubmitted,
                score: attempt.score,
                totalMarks: attempt.totalMarks,
                accuracy: attempt.accuracy,
                result: attempt.result,
                timeSpentSeconds: attempt.timeSpentSeconds,
                durationMinutes: attempt.durationMinutes,
                createdAt: attempt.createdAt,
                endTime: attempt.endTime,
                questions: attempt.questions,
            },
        });
    } catch (error) {
        console.error("getAttemptReview error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve attempt review",
        });
    }
};

export const getHistory = async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;
        const filter = {
            student: req.user._id,
            isSubmitted: true,
        };

        if (type) filter.type = type;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [attempts, total] = await Promise.all([
            Attempt.find(filter)
                .select("-questions")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Attempt.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            message: "History retrieved successfully",
            data: attempts,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("getHistory error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve test history",
        });
    }
};

export const getIncorrectQuestions = async (req, res) => {
    try {
        const parsedLimit = parseInt(req.query.limit, 10);
        const maxLimit = !isNaN(parsedLimit) && parsedLimit > 0 ? Math.min(200, parsedLimit) : 100;

        // Fetch student's dismissed questions from user profile
        const user = await User.findById(req.user._id).select("dismissedIncorrectQuestions updatedAt");
        const dismissedEntries = user?.dismissedIncorrectQuestions || [];

        // Build dismissal timestamp map (questionId/questionRef lowercase -> dismissedAt timestamp)
        const dismissedMap = new Map();
        for (const entry of dismissedEntries) {
            if (!entry) continue;
            const str = String(entry).trim();
            if (str.includes("|")) {
                const [idPart, timePart] = str.split("|");
                const parsedTime = new Date(timePart).getTime();
                dismissedMap.set(idPart.toLowerCase(), !isNaN(parsedTime) ? parsedTime : 0);
            } else {
                const legacyTime = user.updatedAt ? new Date(user.updatedAt).getTime() : 0;
                dismissedMap.set(str.toLowerCase(), legacyTime);
            }
        }

        // Aggregate across student's submitted attempts
        const attempts = await Attempt.find({
            student: req.user._id,
            isSubmitted: true,
        }).sort({ createdAt: -1 });

        const seenKeys = new Set();
        const incorrectList = [];

        for (const att of attempts) {
            const attemptTime = new Date(att.createdAt).getTime();

            for (const q of att.questions) {
                const qId = q.questionId ? String(q.questionId).trim() : "";
                const qIdLower = qId.toLowerCase();
                const qRefStr = q.questionRef ? q.questionRef.toString() : "";
                const qRefLower = qRefStr.toLowerCase();

                // Unique key for deduplication across attempts (1 revision card per question)
                const dedupeKey = qId ? qId.toUpperCase() : qRefStr;
                if (!dedupeKey) continue;

                // Only consider answered questions that are incorrect
                const isAnswered = Boolean(q.userAnswer && String(q.userAnswer).trim());
                if (!isAnswered || q.isCorrect) continue;

                if (seenKeys.has(dedupeKey)) continue;

                // Check dismissal: if dismissed and attempt occurred BEFORE or AT dismissal, keep dismissed
                // If attempt occurred AFTER dismissal, student made a new mistake and it must reappear
                const dismTimeQId = dismissedMap.has(qIdLower) ? dismissedMap.get(qIdLower) : null;
                const dismTimeQRef = qRefLower && dismissedMap.has(qRefLower) ? dismissedMap.get(qRefLower) : null;

                if (dismTimeQId !== null && attemptTime <= dismTimeQId) {
                    continue;
                }
                if (dismTimeQRef !== null && attemptTime <= dismTimeQRef) {
                    continue;
                }

                seenKeys.add(dedupeKey);

                incorrectList.push({
                    _id: q.questionRef || q.questionId,
                    questionId: q.questionId,
                    questionText: q.questionText,
                    options: q.options || [],
                    correctOption: q.correctOption,
                    explanation: q.explanation || "",
                    category: q.category || "General",
                    topic: q.topic || "General",
                    difficulty: q.difficulty || "medium",
                    attemptedAnswer: q.userAnswer,
                    lastAttemptedDate: att.createdAt,
                });

                if (incorrectList.length >= maxLimit) break;
            }
            if (incorrectList.length >= maxLimit) break;
        }

        // Missing metadata backfill: if options or explanation are missing from the attempt snapshot,
        // populate them from the Question model in MongoDB
        const missingMetaItems = incorrectList.filter(
            (item) => !item.options || item.options.length === 0 || !item.explanation || !item.questionText
        );
        if (missingMetaItems.length > 0) {
            try {
                const qIdsToFetch = missingMetaItems.map((m) => m.questionId).filter(Boolean);
                const qRefsToFetch = missingMetaItems
                    .map((m) => m._id)
                    .filter((id) => id && String(id).match(/^[0-9a-fA-F]{24}$/));

                const dbQuestions = await Question.find({
                    $or: [
                        { questionId: { $in: qIdsToFetch } },
                        { _id: { $in: qRefsToFetch } },
                    ],
                });

                const dbQMap = new Map();
                dbQuestions.forEach((dbQ) => {
                    if (dbQ.questionId) dbQMap.set(dbQ.questionId.toUpperCase(), dbQ);
                    dbQMap.set(dbQ._id.toString(), dbQ);
                });

                missingMetaItems.forEach((item) => {
                    const match = dbQMap.get(item.questionId?.toUpperCase()) || dbQMap.get(item._id?.toString());
                    if (match) {
                        if (!item.questionText || item.questionText === "Practice Question") item.questionText = match.questionText;
                        if (!item.options || item.options.length === 0) item.options = match.options;
                        if (!item.explanation) item.explanation = match.explanation;
                        if (!item.category) item.category = match.category;
                        if (!item.topic) item.topic = match.topic;
                        if (!item.difficulty) item.difficulty = match.difficulty;
                    }
                });
            } catch (fillErr) {
                console.error("Backfill missing question metadata error:", fillErr.message);
            }
        }

        return res.json({
            success: true,
            message: "Incorrect questions retrieved successfully",
            data: incorrectList,
        });
    } catch (error) {
        console.error("getIncorrectQuestions error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve incorrect questions",
        });
    }
};

export const removeIncorrectQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: "questionId parameter is required",
            });
        }

        const trimmedId = String(questionId).trim();
        const nowIso = new Date().toISOString();
        const timestampedEntry = `${trimmedId}|${nowIso}`;

        // Safely persist to student's dismissed list
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: {
                dismissedIncorrectQuestions: timestampedEntry,
            },
        });

        return res.json({
            success: true,
            message: "Question removed from revision centre",
            data: { questionId: trimmedId },
        });
    } catch (error) {
        console.error("removeIncorrectQuestion error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to remove question from revision centre",
        });
    }
};

export const clearRevisionItems = async (req, res) => {
    try {
        const studentId = req.user._id;

        // 1. Delete all active bookmarks for this student
        await Bookmark.deleteMany({ student: studentId });

        // 2. Dismiss all currently unresolved incorrect questions for this student
        const attempts = await Attempt.find({
            student: studentId,
            isSubmitted: true,
        }).select("questions");

        const nowIso = new Date().toISOString();
        const incorrectIds = new Set();
        for (const att of attempts) {
            for (const q of att.questions) {
                if (q.userAnswer && !q.isCorrect && q.questionId) {
                    incorrectIds.add(String(q.questionId).trim());
                }
            }
        }

        const user = await User.findById(studentId);
        if (user) {
            const existingDismissed = user.dismissedIncorrectQuestions || [];
            const newEntries = Array.from(incorrectIds).map((id) => `${id}|${nowIso}`);
            user.dismissedIncorrectQuestions = [...existingDismissed, ...newEntries];
            await user.save();
        }

        return res.json({
            success: true,
            message: "All active revision items cleared successfully",
            data: {
                clearedAt: nowIso,
            },
        });
    } catch (error) {
        console.error("clearRevisionItems error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to clear revision items",
        });
    }
};

export const createMockTest = async (req, res) => {
    try {
        const {
            title,
            slug,
            type = "grand",
            description,
            company,
            durationMinutes = 60,
            totalQuestions = 30,
            passingScore = 60,
            category = "Mixed",
            difficulty = "medium",
            questions = [],
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Mock test title is required",
            });
        }

        const generatedSlug =
            slug ||
            title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        const existing = await MockTest.findOne({ slug: generatedSlug });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Mock test with slug '${generatedSlug}' already exists`,
            });
        }

        const newTest = await MockTest.create({
            title: title.trim(),
            slug: generatedSlug,
            type,
            description: description || "",
            company: company || "",
            durationMinutes: Number(durationMinutes),
            totalQuestions: Number(totalQuestions),
            passingScore: Number(passingScore),
            category,
            difficulty,
            questions,
            isActive: true,
        });

        await logAuditEvent({
            action: "MOCK_TEST_CREATE",
            user: req.user,
            targetType: "TEST",
            targetId: newTest._id,
            details: `Created mock test: ${newTest.title}`,
            ipAddress: req.ip,
        });

        return res.status(201).json({
            success: true,
            message: "Mock test created successfully",
            data: newTest,
        });
    } catch (error) {
        console.error("createMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to create mock test",
        });
    }
};

export const getAttemptById = async (req, res) => {
    try {
        const { attemptId } = req.params;
        if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
            return res.status(404).json({
                success: false,
                message: "Test attempt not found",
            });
        }

        const attempt = await Attempt.findById(attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Test attempt not found",
            });
        }

        // Ownership isolation
        const isOwner = attempt.student.toString() === req.user._id.toString();
        const isPrivileged = req.user && ["coordinator", "admin"].includes(req.user.role);
        if (!isOwner && !isPrivileged) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized attempt access",
            });
        }

        const safeQuestions = (attempt.questions || []).map((q) => ({
            _id: q.questionRef || q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
        }));

        const now = new Date();
        const elapsedSec = Math.floor((now.getTime() - new Date(attempt.startTime).getTime()) / 1000);
        const totalSec = (attempt.durationMinutes || 30) * 60;
        const remainingSeconds = Math.max(0, totalSec - elapsedSec);

        return res.json({
            success: true,
            message: "Attempt session retrieved successfully",
            data: {
                attemptId: attempt._id,
                mockTestId: attempt.mockTest,
                title: attempt.title,
                type: attempt.type,
                status: attempt.status,
                durationMinutes: attempt.durationMinutes,
                totalQuestions: attempt.totalQuestions,
                startTime: attempt.startTime,
                remainingSeconds,
                questions: safeQuestions,
                answers: (attempt.questions || []).reduce((acc, q) => {
                    if (q.userAnswer) {
                        acc[q.questionId] = { selectedOption: q.userAnswer, markedForReview: false };
                    }
                    return acc;
                }, {}),
            },
        });
    } catch (error) {
        console.error("getAttemptById error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve attempt session",
        });
    }
};

export const logIntegrityEvent = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { eventType = "tab_switch", warningCount, details } = req.body;

        const attempt = await Attempt.findById(attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found",
            });
        }

        // Ownership isolation
        if (attempt.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized attempt modification",
            });
        }

        if (attempt.status !== "in-progress") {
            return res.status(400).json({
                success: false,
                message: "Cannot log integrity event on completed or inactive attempt",
            });
        }

        attempt.tabSwitches = (attempt.tabSwitches || 0) + 1;
        const count = typeof warningCount === "number" ? warningCount : attempt.tabSwitches;

        if (!Array.isArray(attempt.integrityEvents)) {
            attempt.integrityEvents = [];
        }

        attempt.integrityEvents.push({
            eventType,
            warningCount: count,
            timestamp: new Date(),
            details: details || `Tab switch warning #${count} recorded`,
        });

        await attempt.save();

        return res.json({
            success: true,
            message: "Integrity event recorded successfully",
            data: {
                tabSwitches: attempt.tabSwitches,
                warningCount: count,
            },
        });
    } catch (error) {
        console.error("logIntegrityEvent error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to record integrity event",
        });
    }
};

// Helper: Notify eligible students when a mock test is published
export const notifyEligibleStudentsOnTestPublish = async (test) => {
    try {
        if (!test || test.status !== "published" || !test.isActive) {
            return;
        }

        // Prevent duplicate notifications when a request is retried or test was already notified
        if (test.publishedNotificationSent) {
            return;
        }

        // Fetch all active students
        const activeStudents = await User.find({ role: "student", isActive: true });
        if (!activeStudents || activeStudents.length === 0) {
            return;
        }

        // Filter students strictly matching test department and eligibility permissions
        const eligibleStudents = activeStudents.filter((s) => isStudentEligibleForTest(s, test));
        if (eligibleStudents.length === 0) {
            test.publishedNotificationSent = true;
            await MockTest.updateOne({ _id: test._id }, { publishedNotificationSent: true });
            return;
        }

        // Deduplication against existing notifications for this test
        const existingNotifs = await Notification.find({ testId: test._id }).select("user");
        const alreadyNotifiedUserIds = new Set(existingNotifs.map((n) => String(n.user)));

        const now = new Date();
        const effectiveStart = test.startDate || test.startTime;
        const isUpcoming = effectiveStart && new Date(effectiveStart) > now;

        let title = "New Mock Test Published";
        let message = "";
        let notifType = "info";

        if (isUpcoming) {
            title = "Upcoming Mock Test Scheduled";
            notifType = "reminder";
            const timeStr = new Date(effectiveStart).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
            message = `'${test.title}' has been scheduled for your department. Starts on ${timeStr}.`;
        } else {
            const deadlineStr = (test.endDate || test.deadline)
                ? ` Deadline: ${new Date(test.endDate || test.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
                : "";
            message = `'${test.title}' is now live and available to attempt.${deadlineStr}`;
        }

        const notificationsToInsert = eligibleStudents
            .filter((s) => !alreadyNotifiedUserIds.has(String(s._id)))
            .map((s) => ({
                user: s._id,
                testId: test._id,
                title,
                message,
                type: notifType,
                link: `/tests?testId=${test._id}`,
                isRead: false,
            }));

        if (notificationsToInsert.length > 0) {
            await Notification.insertMany(notificationsToInsert);
        }

        // Mark test so editing or publishing retries will never re-notify
        test.publishedNotificationSent = true;
        await MockTest.updateOne({ _id: test._id }, { publishedNotificationSent: true });
    } catch (err) {
        console.error("notifyEligibleStudentsOnTestPublish error:", err.message);
    }
};

export const publishMockTest = async (req, res) => {
    try {
        const { id } = req.params;
        const test = await MockTest.findById(id);

        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        if (!test.title || !test.title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Cannot publish: Assessment title is required.",
            });
        }

        if (!test.durationMinutes || test.durationMinutes < 1) {
            return res.status(400).json({
                success: false,
                message: "Cannot publish: Assessment duration must be at least 1 minute.",
            });
        }

        const questionCount = (test.questions && test.questions.length) || test.totalQuestions || 0;
        if (questionCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot publish: Assessment must contain at least 1 question.",
            });
        }

        const effectiveStart = test.startDate || test.startTime;
        const effectiveEnd = test.endDate || test.deadline;
        if (effectiveStart && effectiveEnd && new Date(effectiveStart) > new Date(effectiveEnd)) {
            return res.status(400).json({
                success: false,
                message: "Cannot publish: Start date cannot be after deadline.",
            });
        }

        if ((!test.assignedDepartments || test.assignedDepartments.length === 0) && (!test.assignedBatches || test.assignedBatches.length === 0)) {
            test.assignedDepartments = ["ALL"];
            test.assignedBatches = ["ALL"];
        }

        test.status = "published";
        test.isActive = true;
        await test.save();

        // Dispatch publication notifications to eligible students (with deduplication)
        await notifyEligibleStudentsOnTestPublish(test);

        await logAuditEvent({
            action: "MOCK_TEST_PUBLISH",
            user: req.user,
            targetType: "TEST",
            targetId: test._id,
            details: `Published assessment: ${test.title}`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: `Assessment "${test.title}" is now published and available to students.`,
            data: test,
        });
    } catch (error) {
        console.error("publishMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to publish assessment",
        });
    }
};

export const updateMockTestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["draft", "preview", "published", "archived"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const test = await MockTest.findById(id);
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        if (status === "published") {
            const questionCount = (test.questions && test.questions.length) || test.totalQuestions || 0;
            if (questionCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot publish an assessment with 0 questions.",
                });
            }
        }

        const wasPublished = test.status === "published";
        test.status = status;
        test.isActive = status !== "archived";
        await test.save();

        if (status === "published" && !wasPublished) {
            await notifyEligibleStudentsOnTestPublish(test);
        }

        await logAuditEvent({
            action: "MOCK_TEST_STATUS_UPDATE",
            user: req.user,
            targetType: "TEST",
            targetId: test._id,
            details: `Updated mock test "${test.title}" status to ${status}`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: `Assessment status updated to ${status}`,
            data: test,
        });
    } catch (error) {
        console.error("updateMockTestStatus error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to update assessment status",
        });
    }
};

export const getMockTestPreview = async (req, res) => {
    try {
        const { id } = req.params;
        const test = await MockTest.findById(id).populate({
            path: "questions",
            select: "questionId questionText options correctOption explanation category topic difficulty",
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        return res.json({
            success: true,
            message: "Preview data retrieved successfully",
            data: {
                ...test.toObject(),
                isPreview: true,
            },
        });
    } catch (error) {
        console.error("getMockTestPreview error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve preview data",
        });
    }
};

