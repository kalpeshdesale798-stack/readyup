import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import User from "../models/User.js";
import MockTest from "../models/MockTest.js";
import Attempt from "../models/Attempt.js";

const check = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    
    const [
        totalStudents,
        activeStudents,
        totalMockTests,
        activeMockTests,
        totalAttempts,
        completedAttempts,
        inProgressAttempts,
        abandonedAttempts,
        mockTestAttemptsTotal,
        mockTestCompleted,
        mockTestInProgress,
        mockTestAbandoned
    ] = await Promise.all([
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "student", isActive: true }),
        MockTest.countDocuments(),
        MockTest.countDocuments({ isActive: true }),
        Attempt.countDocuments(),
        Attempt.countDocuments({ status: "completed" }),
        Attempt.countDocuments({ status: "in-progress" }),
        Attempt.countDocuments({ status: { $in: ["abandoned", "expired"] } }),
        Attempt.countDocuments({ type: "mock-test" }),
        Attempt.countDocuments({ type: "mock-test", status: "completed" }),
        Attempt.countDocuments({ type: "mock-test", status: "in-progress" }),
        Attempt.countDocuments({ type: "mock-test", status: { $in: ["abandoned", "expired"] } }),
    ]);

    console.log(JSON.stringify({
        totalStudents,
        activeStudents,
        totalMockTests,
        activeMockTests,
        totalAttempts,
        completedAttempts,
        inProgressAttempts,
        abandonedAttempts,
        mockTestAttemptsTotal,
        mockTestCompleted,
        mockTestInProgress,
        mockTestAbandoned
    }, null, 2));
    process.exit(0);
};
check();
