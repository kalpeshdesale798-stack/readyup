import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
    {
        optionId: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false }
);

const questionSchema = new mongoose.Schema(
    {
        questionId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        questionText: {
            type: String,
            required: true,
            trim: true,
        },
        options: {
            type: [optionSchema],
            validate: [
                (val) => val.length >= 2,
                "Question must have at least 2 options",
            ],
        },
        correctOption: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        explanation: {
            type: String,
            default: "",
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        topic: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        subtopic: {
            type: String,
            default: "",
            trim: true,
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
            index: true,
        },
        companies: {
            type: [String],
            default: [],
            index: true,
        },
        source: {
            type: String,
            default: "",
            trim: true,
        },
        year: {
            type: Number,
            default: new Date().getFullYear(),
        },
        isVerified: {
            type: Boolean,
            default: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

questionSchema.index({ category: 1, topic: 1, difficulty: 1, isActive: 1 });
questionSchema.index({ companies: 1, isActive: 1 });

const Question = mongoose.model("Question", questionSchema);

export default Question;
