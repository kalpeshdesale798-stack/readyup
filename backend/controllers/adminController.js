import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Attempt from "../models/Attempt.js";
import AuditLog from "../models/AuditLog.js";
import { logAuditEvent } from "../utils/auditLogger.js";

export const getAdminDashboard = async (req, res) => {
    try {
        const [
            totalUsers,
            studentsCount,
            coordinatorsCount,
            adminsCount,
            activeCount,
            totalAttempts,
            passedAttempts,
            recentLogs,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "student" }),
            User.countDocuments({ role: "coordinator" }),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ isActive: true }),
            Attempt.countDocuments({ isSubmitted: true }),
            Attempt.countDocuments({ isSubmitted: true, result: "Passed" }),
            AuditLog.find().sort({ createdAt: -1 }).limit(6),
        ]);

        const passRate =
            totalAttempts > 0
                ? Math.round((passedAttempts / totalAttempts) * 100)
                : 0;

        return res.json({
            success: true,
            message: "Admin dashboard retrieved successfully",
            data: {
                metrics: {
                    totalUsers,
                    activeStudents: studentsCount,
                    totalCoordinators: coordinatorsCount,
                    totalAdmins: adminsCount,
                    activeAccounts: activeCount,
                    totalAttempts,
                    platformPassRate: passRate,
                },
                metricCards: [
                    {
                        label: "Total Registered Users",
                        value: totalUsers,
                        subtext: `${activeCount} active platform accounts`,
                        icon: "Users",
                        color: "sky",
                    },
                    {
                        label: "Active Students",
                        value: studentsCount,
                        subtext: "Eligible for campus placement tests",
                        icon: "GraduationCap",
                        color: "teal",
                    },
                    {
                        label: "Test Attempts",
                        value: totalAttempts,
                        subtext: "Completed mock tests & drills",
                        icon: "Activity",
                        color: "amber",
                    },
                    {
                        label: "Platform Pass Rate",
                        value: `${passRate}%`,
                        subtext: `${passedAttempts} passed / ${totalAttempts} attempts`,
                        icon: "TrendingUp",
                        color: "emerald",
                    },
                ],
                roleDistribution: [
                    { role: "student", label: "Students", count: studentsCount },
                    { role: "coordinator", label: "T&P Coordinators", count: coordinatorsCount },
                    { role: "admin", label: "Administrators", count: adminsCount },
                ],
                recentAuditLogs: recentLogs.map((log) => ({
                    _id: log._id,
                    action: log.action,
                    performedBy: log.performedBy,
                    targetType: log.targetType,
                    details: log.details,
                    createdAt: log.createdAt,
                    timestamp: log.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error("getAdminDashboard error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve admin dashboard",
        });
    }
};

export const getUsers = async (req, res) => {
    try {
        const { role, status, search, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (role) filter.role = role.toLowerCase();
        if (status === "active" || req.query.isActive === "true" || req.query.isActive === true) {
            filter.isActive = true;
        } else if (status === "inactive" || req.query.isActive === "false" || req.query.isActive === false) {
            filter.isActive = false;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { studentId: { $regex: search, $options: "i" } },
                { department: { $regex: search, $options: "i" } },
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            User.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            message: "Users retrieved successfully",
            data: users,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("getUsers error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve users",
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.json({
            success: true,
            message: "User retrieved successfully",
            data: user,
        });
    } catch (error) {
        console.error("getUserById error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve user details",
        });
    }
};

export const createUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role = "student",
            department,
            college,
            graduationYear,
            studentId,
        } = req.body;

        if (!name || !email || !password || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password of at least 8 characters are required.",
            });
        }

        if (!["student", "coordinator", "admin"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role specified.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role,
            department: department ? department.trim() : "Computer Science & Engineering",
            college: college ? college.trim() : "National Institute of Technology",
            graduationYear: graduationYear ? Number(graduationYear) : 2026,
            studentId: studentId ? studentId.trim() : "",
            isActive: true,
        });

        await logAuditEvent({
            action: "USER_CREATE",
            user: req.user,
            targetType: "USER",
            targetId: newUser._id,
            details: `Created new ${role} account for ${newUser.email}`,
            ipAddress: req.ip,
        });

        const safeUser = newUser.toObject();
        delete safeUser.password;

        return res.status(201).json({
            success: true,
            message: "User provisioned successfully",
            data: safeUser,
        });
    } catch (error) {
        console.error("createUser error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to provision user",
        });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!["student", "coordinator", "admin"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role specified.",
            });
        }

        // Prevent admin from removing their own admin status if they are the current user
        if (req.user._id.toString() === id && role !== "admin") {
            const adminCount = await User.countDocuments({ role: "admin", isActive: true });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot demote the last remaining active administrator.",
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            id,
            { role },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        await logAuditEvent({
            action: "ROLE_CHANGE",
            user: req.user,
            targetType: "USER",
            targetId: user._id,
            details: `Changed role of ${user.email} to '${role}'`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: `User role updated to ${role} successfully`,
            data: user,
        });
    } catch (error) {
        console.error("updateUserRole error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to update user role",
        });
    }
};

export const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isActive boolean is required",
            });
        }

        // Prevent admin from deactivating self
        if (req.user._id.toString() === id && !isActive) {
            return res.status(400).json({
                success: false,
                message: "You cannot deactivate your own administrative account.",
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        await logAuditEvent({
            action: "STATUS_CHANGE",
            user: req.user,
            targetType: "USER",
            targetId: user._id,
            details: `Account for ${user.email} set to isActive=${isActive}`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: `Account status updated to ${isActive ? "active" : "deactivated"}`,
            data: user,
        });
    } catch (error) {
        console.error("updateUserStatus error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to update account status",
        });
    }
};

const escapeRegex = (string) => {
    return string ? string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
};

export const getAuditLogs = async (req, res) => {
    try {
        const { action, targetType, actor, search, startDate, endDate, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (action && typeof action === "string" && action.trim()) {
            const trimmedAction = action.trim();
            const aliasMap = {
                USER_CREATED: /USER_CREATE/i,
                ROLE_ASSIGNED: /ROLE_CHANGE/i,
                USER_STATUS_CHANGE: /STATUS_CHANGE/i,
                SPREADSHEET_IMPORT_CONFIRMED: /SPREADSHEET_IMPORT/i,
            };
            filter.action = aliasMap[trimmedAction] || new RegExp(`^${escapeRegex(trimmedAction)}$`, "i");
        }

        if (targetType && typeof targetType === "string" && targetType.trim()) {
            const trimmedTarget = targetType.trim();
            const aliasMap = {
                QUESTION_BANK: /QUESTION/i,
            };
            filter.targetType = aliasMap[trimmedTarget] || new RegExp(`^${escapeRegex(trimmedTarget)}$`, "i");
        }

        if (actor && typeof actor === "string" && actor.trim()) {
            filter.performedBy = new RegExp(escapeRegex(actor.trim()), "i");
        }

        // Precise boundary date-range filtering
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                const sDate = new Date(startDate);
                if (!isNaN(sDate.getTime())) {
                    sDate.setHours(0, 0, 0, 0);
                    filter.createdAt.$gte = sDate;
                }
            }
            if (endDate) {
                const eDate = new Date(endDate);
                if (!isNaN(eDate.getTime())) {
                    eDate.setHours(23, 59, 59, 999);
                    filter.createdAt.$lte = eDate;
                }
            }
        }

        // Global search across actor, action, details, targetId, and IP
        if (search && typeof search === "string" && search.trim()) {
            const searchRegex = new RegExp(escapeRegex(search.trim()), "i");
            filter.$or = [
                { action: searchRegex },
                { performedBy: searchRegex },
                { details: searchRegex },
                { targetId: searchRegex },
                { ipAddress: searchRegex }
            ];
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * limitNum;

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            AuditLog.countDocuments(filter),
        ]);

        const formattedLogs = logs.map((l) => {
            const obj = l.toObject ? l.toObject() : l;
            return {
                ...obj,
                timestamp: obj.createdAt,
            };
        });

        return res.json({
            success: true,
            message: "Audit logs retrieved successfully",
            data: formattedLogs,
            totalCount: total,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("getAuditLogs error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve audit logs",
        });
    }
};
