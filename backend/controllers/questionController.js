import mongoose from "mongoose";
import Question from "../models/Question.js";
import Category from "../models/Category.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/auditLogger.js";

const buildQuestionFilter = (id) => {
    if (!id) return { _id: null };
    const strId = String(id).trim();
    if (mongoose.Types.ObjectId.isValid(strId)) {
        return { $or: [{ _id: strId }, { questionId: strId.toUpperCase() }] };
    }
    return { questionId: strId.toUpperCase() };
};

export const getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });

        // Aggregate all distinct topics, counts, and subtopics from Question collection
        const questionAgg = await Question.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: { category: "$category", topic: "$topic" },
                    count: { $sum: 1 },
                    subtopics: { $addToSet: "$subtopic" },
                },
            },
        ]);

        const catTopicMap = {};
        for (const item of questionAgg) {
            const catName = item._id.category || "General";
            const topicName = item._id.topic || "General";
            if (!catTopicMap[catName]) catTopicMap[catName] = [];
            catTopicMap[catName].push({
                name: topicName,
                questionCount: item.count,
                subtopics: (item.subtopics || []).filter(Boolean),
            });
        }

        // Merge dynamic topics with Category documents
        const enrichedCategories = categories.map((cat) => {
            const catObj = cat.toObject();
            const dynamicTopics = catTopicMap[catObj.name] || [];
            const existingTopicMap = new Map();

            (catObj.topics || []).forEach((t) => {
                existingTopicMap.set(t.name.toLowerCase(), t);
            });

            const mergedTopics = [];

            // Add or update existing topics with real counts
            for (const t of catObj.topics || []) {
                const found = dynamicTopics.find(
                    (dt) => dt.name.toLowerCase() === t.name.toLowerCase()
                );
                const qCount = found ? found.questionCount : 0;
                mergedTopics.push({
                    ...t,
                    questionCount: qCount,
                    count: qCount,
                    subtopics: (t.subtopics && t.subtopics.length > 0)
                        ? t.subtopics
                        : (found?.subtopics && found.subtopics.length > 0 ? found.subtopics : ["General Practice"]),
                });
            }

            // Append newly discovered topics from the Question collection
            for (const dt of dynamicTopics) {
                if (!existingTopicMap.has(dt.name.toLowerCase())) {
                    mergedTopics.push({
                        _id: `top_${dt.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
                        name: dt.name,
                        questionCount: dt.questionCount,
                        count: dt.questionCount,
                        subtopics: dt.subtopics.length > 0 ? dt.subtopics : ["General Practice"],
                    });
                }
            }

            // Sort topics by question count descending
            mergedTopics.sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0));

            const totalQ = mergedTopics.reduce((sum, t) => sum + (t.questionCount || 0), 0);
            catObj.topics = mergedTopics;
            catObj.questionCount = totalQ;
            return catObj;
        });

        return res.json({
            success: true,
            message: "Categories retrieved successfully",
            data: enrichedCategories,
        });
    } catch (error) {
        console.error("getCategories error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve categories",
        });
    }
};

export const getQuestions = async (req, res) => {
    try {
        const {
            category,
            topic,
            subtopic,
            difficulty,
            company,
            search,
            page = 1,
            limit = 20,
            status,
        } = req.query;

        const isPrivileged = req.user && ["coordinator", "admin"].includes(req.user.role);

        const filter = {};

        // Normal students only see active questions
        if (!isPrivileged) {
            filter.isActive = true;
        } else if (status === "active") {
            filter.isActive = true;
        } else if (status === "inactive") {
            filter.isActive = false;
        }

        if (category) filter.category = new RegExp(`^${category}$`, "i");
        if (topic) filter.topic = new RegExp(`^${topic}$`, "i");
        if (subtopic) filter.subtopic = new RegExp(`^${subtopic}$`, "i");
        if (difficulty) filter.difficulty = difficulty.toLowerCase();
        if (company) filter.companies = new RegExp(company, "i");

        if (search) {
            filter.$or = [
                { questionText: { $regex: search, $options: "i" } },
                { questionId: { $regex: search, $options: "i" } },
                { topic: { $regex: search, $options: "i" } },
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        let projection = "";
        // CRITICAL SECURITY: Never leak answers or explanations to students in listings!
        if (!isPrivileged) {
            projection = "-correctOption -explanation";
        }

        const [questions, total] = await Promise.all([
            Question.find(filter)
                .select(projection)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Question.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limitNum) || 1;

        return res.json({
            success: true,
            message: "Questions retrieved successfully",
            data: questions,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
            },
        });
    } catch (error) {
        console.error("getQuestions error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve questions",
        });
    }
};

export const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const isPrivileged = req.user && ["coordinator", "admin"].includes(req.user.role);

        let query = Question.findOne(buildQuestionFilter(id));
        if (!isPrivileged) {
            query = query.select("-correctOption -explanation");
        }

        const question = await query;
        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found",
            });
        }

        return res.json({
            success: true,
            message: "Question retrieved successfully",
            data: question,
        });
    } catch (error) {
        console.error("getQuestionById error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve question",
        });
    }
};

export const createQuestion = async (req, res) => {
    try {
        const {
            questionId,
            questionText,
            options,
            correctOption,
            explanation,
            category,
            topic,
            subtopic,
            difficulty,
            companies,
            source,
            year,
        } = req.body;

        if (!questionText || !category || !topic || !correctOption) {
            return res.status(400).json({
                success: false,
                message: "Question text, category, topic, and correct option are required",
            });
        }

        if (!Array.isArray(options) || options.length < 2) {
            return res.status(400).json({
                success: false,
                message: "A question must have at least 2 options",
            });
        }

        const validOptionIds = options.map((o) => o.optionId.toUpperCase());
        if (!validOptionIds.includes(correctOption.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Correct option '${correctOption}' must match one of the available option IDs (${validOptionIds.join(", ")})`,
            });
        }

        const generatedId =
            questionId ||
            `Q-${topic.substring(0, 2).toUpperCase()}-${Date.now().toString().slice(-4)}`;

        const existing = await Question.findOne({ questionId: generatedId.toUpperCase() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Question with ID ${generatedId} already exists.`,
            });
        }

        const formattedCompanies = Array.isArray(companies)
            ? companies
            : typeof companies === "string"
            ? companies.split(",").map((c) => c.trim()).filter(Boolean)
            : [];

        const question = await Question.create({
            questionId: generatedId.toUpperCase(),
            questionText: questionText.trim(),
            options: options.map((opt) => ({
                optionId: opt.optionId.toUpperCase(),
                text: opt.text.trim(),
            })),
            correctOption: correctOption.toUpperCase().trim(),
            explanation: explanation ? explanation.trim() : "",
            category: category.trim(),
            topic: topic.trim(),
            subtopic: subtopic ? subtopic.trim() : "",
            difficulty: difficulty ? difficulty.toLowerCase() : "medium",
            companies: formattedCompanies,
            source: source ? source.trim() : "",
            year: year ? Number(year) : new Date().getFullYear(),
            isVerified: true,
            isActive: true,
        });

        await logAuditEvent({
            action: "QUESTION_CREATE",
            user: req.user,
            targetType: "QUESTION",
            targetId: question._id,
            details: `Created question ${question.questionId}: ${question.questionText.slice(0, 50)}...`,
            ipAddress: req.ip,
        });

        // Dynamic student notifications for newly added questions
        try {
            const students = await User.find({ role: "student", isActive: true }).select("_id");
            if (students.length > 0) {
                const notifications = students.map((s) => ({
                    user: s._id,
                    title: "New Question Added",
                    message: `A new ${question.difficulty || "practice"} question was added in ${question.topic}${question.companies?.length ? ` (${question.companies.join(", ")})` : ""}.`,
                    type: "info",
                    link: `/practice?topic=${encodeURIComponent(question.topic)}&category=${encodeURIComponent(question.category)}`,
                    isRead: false,
                }));
                await Notification.insertMany(notifications);
            }
        } catch (notifErr) {
            console.error("Failed to dispatch new-question notifications to students:", notifErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Question created successfully",
            data: question,
        });
    } catch (error) {
        console.error("createQuestion error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to create question",
        });
    }
};

export const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (updateData.options && updateData.correctOption) {
            const validOptionIds = updateData.options.map((o) => o.optionId.toUpperCase());
            if (!validOptionIds.includes(updateData.correctOption.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    message: "Correct option must be one of the option IDs",
                });
            }
        }

        if (updateData.companies && typeof updateData.companies === "string") {
            updateData.companies = updateData.companies.split(",").map((c) => c.trim()).filter(Boolean);
        }

        const question = await Question.findOneAndUpdate(buildQuestionFilter(id), updateData, {
            new: true,
            runValidators: true,
        });

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found",
            });
        }

        await logAuditEvent({
            action: "QUESTION_UPDATE",
            user: req.user,
            targetType: "QUESTION",
            targetId: question._id,
            details: `Updated question ${question.questionId}`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: "Question updated successfully",
            data: question,
        });
    } catch (error) {
        console.error("updateQuestion error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to update question",
        });
    }
};

export const toggleQuestionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isActive boolean is required",
            });
        }

        const question = await Question.findOneAndUpdate(
            buildQuestionFilter(id),
            { isActive },
            { new: true }
        );

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found",
            });
        }

        await logAuditEvent({
            action: "QUESTION_STATUS_CHANGE",
            user: req.user,
            targetType: "QUESTION",
            targetId: question._id,
            details: `Question ${question.questionId} set to isActive=${isActive}`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: `Question status updated to ${isActive ? "active" : "inactive"}`,
            data: question,
        });
    } catch (error) {
        console.error("toggleQuestionStatus error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to update question status",
        });
    }
};
