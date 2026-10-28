import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        logo: {
            type: String,
            default: "",
        },
        tagline: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        hiringPattern: {
            testDuration: { type: Number, default: 60 },
            totalQuestions: { type: Number, default: 30 },
            sections: [
                {
                    name: String,
                    questions: Number,
                    timeMinutes: Number,
                },
            ],
        },
        activeDrives: {
            type: Number,
            default: 1,
        },
        averagePackage: {
            type: String,
            default: "6.5 LPA",
        },
        difficulty: {
            type: String,
            default: "Medium",
        },
        topicsFocus: [{ type: String }],
        questionCount: {
            type: Number,
            default: 0,
        },
        isVerified: {
            type: Boolean,
            default: true,
        },
        hasActiveDrive: {
            type: Boolean,
            default: true,
        },
        badge: {
            type: String,
            default: "Verified",
        },
    },
    { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);

export default Company;
