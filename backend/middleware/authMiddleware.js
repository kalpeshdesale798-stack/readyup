import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please log in.",
            });
        }

        const token = authHeader.slice(7);

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "Server authentication is not properly configured.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.sub).select(
            "_id name email role department college graduationYear studentId isActive lastLoginAt"
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User session expired or user no longer exists.",
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Please contact an administrator.",
            });
        }

        req.user = user;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
};

export const allowRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: You do not have permission to access this resource.",
        });
    }

    next();
};

export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ") && process.env.JWT_SECRET) {
            const token = authHeader.slice(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.sub).select(
                "_id name email role department college graduationYear studentId isActive"
            );
            if (user && user.isActive !== false) {
                req.user = user;
            }
        }
    } catch {
        // Continue unauthenticated if token is invalid
    }
    next();
};
