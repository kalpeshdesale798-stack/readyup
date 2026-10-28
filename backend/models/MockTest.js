import mongoose from "mongoose";

const mockTestSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["company", "company_mock", "grand", "topic", "topic_test", "diagnostic"],
            default: "company_mock",
            index: true,
        },
        description: {
            type: String,
            default: "",
        },
        company: {
            type: String,
            default: "",
            trim: true,
        },
        durationMinutes: {
            type: Number,
            required: true,
            default: 30,
        },
        totalQuestions: {
            type: Number,
            required: true,
            default: 15,
        },
        passingScore: {
            type: Number,
            default: 60,
        },
        category: {
            type: String,
            default: "Mixed",
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },
        questions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Question",
            },
        ],
        attemptsCount: {
            type: Number,
            default: 0,
        },
        averageScore: {
            type: Number,
            default: 0,
        },
        assignedBatches: {
            type: [String],
            default: [],
        },
        assignedDepartments: {
            type: [String],
            default: [],
        },
        totalMarks: {
            type: Number,
            default: 0,
        },
        instructions: {
            type: [String],
            default: [],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assignedStudents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        startDate: {
            type: Date,
            default: null,
        },
        endDate: {
            type: Date,
            default: null,
        },
        startTime: {
            type: Date,
            default: null,
        },
        deadline: {
            type: Date,
            default: null,
        },
        isScheduled: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["draft", "preview", "published", "archived"],
            default: "published",
            index: true,
        },
        publishedNotificationSent: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

mockTestSchema.pre("save", function () {
    if (this.startDate && !this.startTime) this.startTime = this.startDate;
    if (this.startTime && !this.startDate) this.startDate = this.startTime;
    if (this.endDate && !this.deadline) this.deadline = this.endDate;
    if (this.deadline && !this.endDate) this.endDate = this.deadline;
});

const MockTest = mongoose.model("MockTest", mockTestSchema);

export default MockTest;

