import mongoose from "mongoose";

const attemptQuestionSnapshotSchema = new mongoose.Schema(
    {
        questionRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
        },
        questionId: {
            type: String,
            required: true,
        },
        questionText: {
            type: String,
            required: true,
        },
        options: [
            {
                optionId: String,
                text: String,
            },
        ],
        correctOption: {
            type: String,
            required: true,
        },
        explanation: {
            type: String,
            default: "",
        },
        category: {
            type: String,
            default: "",
        },
        topic: {
            type: String,
            default: "",
        },
        difficulty: {
            type: String,
            default: "medium",
        },
        userAnswer: {
            type: String,
            default: null,
        },
        isCorrect: {
            type: Boolean,
            default: false,
        },
        timeSpentSeconds: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

const attemptSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["practice", "mock-test"],
            default: "practice",
            index: true,
        },
        mockTest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MockTest",
            default: null,
        },
        title: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            default: "",
        },
        topic: {
            type: String,
            default: "",
        },
        difficulty: {
            type: String,
            default: "",
        },
        durationMinutes: {
            type: Number,
            default: 30,
        },
        totalQuestions: {
            type: Number,
            required: true,
        },
        questions: [attemptQuestionSnapshotSchema],
        score: {
            type: Number,
            default: 0,
        },
        totalMarks: {
            type: Number,
            default: 0,
        },
        accuracy: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["in-progress", "completed", "abandoned", "expired"],
            default: "in-progress",
            index: true,
        },
        result: {
            type: String,
            enum: ["Passed", "Needs Review", "Failed", "Incomplete"],
            default: "Needs Review",
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: {
            type: Date,
            default: null,
        },
        timeSpentSeconds: {
            type: Number,
            default: 0,
        },
        isSubmitted: {
            type: Boolean,
            default: false,
            index: true,
        },
        tabSwitches: {
            type: Number,
            default: 0,
        },
        integrityEvents: [
            {
                eventType: { type: String, default: "tab_switch" },
                warningCount: { type: Number, default: 1 },
                timestamp: { type: Date, default: Date.now },
                details: { type: String, default: "" },
            },
        ],
    },
    { timestamps: true }
);

attemptSchema.index({ student: 1, createdAt: -1 });
attemptSchema.index({ student: 1, type: 1, status: 1 });

const Attempt = mongoose.model("Attempt", attemptSchema);

export default Attempt;
