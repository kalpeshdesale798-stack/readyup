import Bookmark from "../models/Bookmark.js";
import Question from "../models/Question.js";
import Attempt from "../models/Attempt.js";

export const getBookmarks = async (req, res) => {
    try {
        const bookmarks = await Bookmark.find({ student: req.user._id })
            .populate("question")
            .sort({ createdAt: -1 });

        const formatted = [];
        for (const b of bookmarks) {
            let q = b.question && typeof b.question.toObject === "function"
                ? b.question.toObject()
                : b.question;

            // Fallback: If populate returned null, resolve via questionId or attempt snapshot
            if (!q && b.questionId) {
                const found = await Question.findOne({
                    questionId: new RegExp(`^${b.questionId.trim()}$`, "i")
                });
                if (found) {
                    q = found.toObject();
                } else {
                    const att = await Attempt.findOne({
                        student: req.user._id,
                        "questions.questionId": new RegExp(`^${b.questionId.trim()}$`, "i")
                    });
                    if (att) {
                        const snap = att.questions.find(
                            (x) => x.questionId.toLowerCase() === b.questionId.trim().toLowerCase()
                        );
                        if (snap) {
                            q = snap.toObject ? snap.toObject() : snap;
                        }
                    }
                }
            }

            if (!q) {
                q = {
                    questionId: b.questionId,
                    questionText: "Practice Question",
                    options: [],
                    correctOption: "",
                    explanation: "",
                    category: "General",
                    topic: "Quantitative",
                    difficulty: "medium",
                };
            }

            formatted.push({
                    _id: b._id,
                    bookmarkId: b._id,
                    questionId: q.questionId || b.questionId,
                    questionRef: q._id || b.question,
                    questionText: q.questionText || "Practice Question",
                    options: q.options || [],
                    correctOption: q.correctOption,
                    explanation: q.explanation || "",
                    category: q.category || "",
                    topic: q.topic || "",
                    subtopic: q.subtopic || "",
                    difficulty: q.difficulty || "medium",
                    companies: q.companies || [],
                    notes: b.notes || "",
                    note: b.notes || "",
                    question: q,
                    createdAt: b.createdAt,
                });
        }

        return res.json({
            success: true,
            message: "Bookmarks retrieved successfully",
            data: formatted,
        });
    } catch (error) {
        console.error("getBookmarks error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve bookmarks",
        });
    }
};

export const addBookmark = async (req, res) => {
    try {
        const { questionId, note = "" } = req.body;

        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: "questionId is required",
            });
        }

        const trimmedId = String(questionId).trim();

        // 1. Find question by questionId or _id in Question collection
        const queryConditions = [
            { questionId: trimmedId },
            { questionId: trimmedId.toUpperCase() },
            { questionId: new RegExp(`^${trimmedId}$`, "i") },
        ];
        if (trimmedId.match(/^[0-9a-fA-F]{24}$/)) {
            queryConditions.push({ _id: trimmedId });
        }

        let question = await Question.findOne({ $or: queryConditions });

        // 2. If not found in Question collection, check student's attempts
        if (!question) {
            const attempt = await Attempt.findOne({
                student: req.user._id,
                $or: [
                    { "questions.questionId": trimmedId },
                    { "questions.questionId": trimmedId.toUpperCase() },
                    { "questions.questionId": new RegExp(`^${trimmedId}$`, "i") },
                ]
            });
            if (attempt) {
                const snap = attempt.questions.find(
                    (q) => q.questionId.toLowerCase() === trimmedId.toLowerCase()
                );
                if (snap) {
                    if (snap.questionRef) {
                        question = await Question.findById(snap.questionRef);
                    }
                    if (!question) {
                        // Persist question snapshot into Question collection
                        question = await Question.create({
                            questionId: snap.questionId.toUpperCase(),
                            questionText: snap.questionText,
                            options: snap.options,
                            correctOption: snap.correctOption,
                            explanation: snap.explanation || "",
                            category: snap.category || "General",
                            topic: snap.topic || "General",
                            difficulty: snap.difficulty || "medium",
                            isVerified: true,
                            isActive: true,
                        });
                    }
                }
            }
        }

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found",
            });
        }

        const existing = await Bookmark.findOne({
            student: req.user._id,
            question: question._id,
        });

        if (existing) {
            existing.notes = note ? note.trim() : existing.notes;
            await existing.save();
            return res.json({
                success: true,
                message: "Bookmark updated successfully",
                data: {
                    _id: existing._id,
                    questionId: question.questionId,
                    questionRef: question._id,
                    notes: existing.notes,
                    note: existing.notes,
                    question: question.toObject ? question.toObject() : question,
                    createdAt: existing.createdAt,
                },
            });
        }

        const bookmark = await Bookmark.create({
            student: req.user._id,
            question: question._id,
            questionId: question.questionId,
            notes: note ? note.trim() : "",
        });

        return res.status(201).json({
            success: true,
            message: "Question bookmarked successfully",
            data: {
                _id: bookmark._id,
                questionId: question.questionId,
                questionRef: question._id,
                notes: bookmark.notes,
                note: bookmark.notes,
                question: question.toObject ? question.toObject() : question,
                createdAt: bookmark.createdAt,
            },
        });
    } catch (error) {
        console.error("addBookmark error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to bookmark question",
        });
    }
};

export const removeBookmark = async (req, res) => {
    try {
        const { questionId } = req.params;

        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: "questionId is required",
            });
        }

        const trimmedId = String(questionId).trim();

        const orConditions = [
            { questionId: trimmedId },
            { questionId: trimmedId.toUpperCase() },
            { questionId: new RegExp(`^${trimmedId}$`, "i") },
        ];

        if (trimmedId.match(/^[0-9a-fA-F]{24}$/)) {
            orConditions.push({ _id: trimmedId });
            orConditions.push({ question: trimmedId });
        }

        const question = await Question.findOne({
            $or: [
                { questionId: trimmedId },
                { questionId: trimmedId.toUpperCase() },
                ...(trimmedId.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: trimmedId }] : [])
            ]
        });

        if (question) {
            orConditions.push({ question: question._id });
        }

        await Bookmark.deleteMany({
            student: req.user._id,
            $or: orConditions,
        });

        return res.json({
            success: true,
            message: "Bookmark removed successfully",
            data: null,
        });
    } catch (error) {
        console.error("removeBookmark error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to remove bookmark",
        });
    }
};
