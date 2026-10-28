import Company from "../models/Company.js";
import MockTest from "../models/MockTest.js";
import Question from "../models/Question.js";
import User from "../models/User.js";

export const globalSearch = async (req, res) => {
    try {
        const query = (req.query.q || req.query.query || "").trim();

        const role = req.user?.role || "student";
        const isStudent = role === "student";
        const isCoordinator = role === "coordinator";
        const isAdmin = role === "admin";
        const isPrivileged = ["coordinator", "admin"].includes(role);

        if (!query || query.length < 2) {
            return res.json({
                success: true,
                message: "Search query must be at least 2 characters",
                data: {
                    topics: [],
                    companies: [],
                    mockTests: [],
                    questions: [],
                    users: [],
                    coordinatorPages: [],
                },
            });
        }

        const reg = new RegExp(query, "i");

        // Run parallel queries across database entities
        const [companies, mockTests, questions, matchingTopics, users] = await Promise.all([
            // 1. Companies
            Company.find({
                $or: [{ name: reg }, { description: reg }, { slug: reg }],
            }).limit(5),

            // 2. Mock Tests - ONLY for students! Coordinators/admins must never see student mock tests
            isStudent
                ? MockTest.find({
                      isActive: true,
                      $or: [{ title: reg }, { company: reg }, { category: reg }],
                  }).limit(5)
                : Promise.resolve([]),

            // 3. Questions
            Question.find({
                isActive: true,
                $or: [{ questionId: reg }, { questionText: reg }, { topic: reg }, { companies: reg }],
            })
                .select(isPrivileged ? "" : "-correctOption -explanation")
                .limit(5),

            // 4. Distinct Topics
            Question.distinct("topic", {
                topic: reg,
                isActive: true,
            }),

            // 5. Admin-only: Users
            isAdmin
                ? User.find({
                      $or: [{ name: reg }, { email: reg }, { studentId: reg }],
                  })
                      .select("_id name email role department studentId isActive")
                      .limit(5)
                : Promise.resolve([]),
        ]);

        // Authorized coordinator resources if coordinator
        const coordinatorPages = [];
        if (isCoordinator) {
            if (/import|sheet|excel|csv|upload/i.test(query)) {
                coordinatorPages.push({
                    title: "Spreadsheet Import Tool",
                    description: "Upload and validate bulk question spreadsheets",
                    path: "/coordinator/import",
                    type: "page",
                });
            }
            if (/history|batch|log/i.test(query)) {
                coordinatorPages.push({
                    title: "Import History",
                    description: "View past spreadsheet uploads and batch status",
                    path: "/coordinator/history",
                    type: "page",
                });
            }
            if (/question|bank|manage|add/i.test(query)) {
                coordinatorPages.push({
                    title: "Question Bank Management",
                    description: "Browse, filter, and create new practice questions",
                    path: "/coordinator/questions",
                    type: "page",
                });
            }
        }

        return res.json({
            success: true,
            message: "Search completed successfully",
            data: {
                topics: matchingTopics.slice(0, 5).map((t) => ({
                    title: t,
                    path: isCoordinator
                        ? `/coordinator/questions?search=${encodeURIComponent(t)}`
                        : `/practice?topic=${encodeURIComponent(t)}`,
                    type: "topic",
                })),
                companies: companies.map((c) => ({
                    _id: c._id,
                    name: c.name,
                    slug: c.slug,
                    tagline: c.tagline,
                    path: isCoordinator
                        ? `/coordinator/questions?search=${encodeURIComponent(c.name)}`
                        : `/companies/${c.slug}`,
                    type: "company",
                })),
                mockTests: mockTests.map((t) => ({
                    _id: t._id,
                    title: t.title,
                    company: t.company,
                    durationMinutes: t.durationMinutes,
                    path: "/tests",
                    type: "mockTest",
                })),
                questions: questions.map((q) => ({
                    _id: q._id,
                    questionId: q.questionId,
                    questionText: q.questionText,
                    topic: q.topic,
                    category: q.category,
                    difficulty: q.difficulty,
                    path: isPrivileged
                        ? `/coordinator/questions?search=${encodeURIComponent(q.questionId)}`
                        : `/practice?topic=${encodeURIComponent(q.topic)}`,
                    type: "question",
                })),
                users: users.map((u) => ({
                    _id: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    studentId: u.studentId,
                    path: `/admin/users?search=${encodeURIComponent(u.email || u.name)}`,
                    type: "user",
                })),
                coordinatorPages,
            },
        });
    } catch (error) {
        console.error("globalSearch error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Search failed. Please try again.",
        });
    }
};
