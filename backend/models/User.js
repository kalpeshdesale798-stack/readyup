import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ["student", "coordinator", "admin"],
            default: "student",
            required: true,
        },
        department: {
            type: String,
            default: "Computer Science & Engineering",
            trim: true,
        },
        college: {
            type: String,
            default: "National Institute of Technology",
            trim: true,
        },
        graduationYear: {
            type: Number,
            default: 2026,
        },
        studentId: {
            type: String,
            default: "",
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLoginAt: {
            type: Date,
            default: Date.now,
        },
        dismissedIncorrectQuestions: {
            type: [String],
            default: [],
        },
        resetPasswordToken: {
            type: String,
            select: false,
        },
        resetPasswordExpires: {
            type: Date,
            select: false,
        },
    },
    { timestamps: true }
);

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
