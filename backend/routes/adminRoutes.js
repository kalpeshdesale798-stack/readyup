import express from "express";
import {
    getAdminDashboard,
    getUsers,
    getUserById,
    createUser,
    updateUserRole,
    updateUserStatus,
    getAuditLogs,
} from "../controllers/adminController.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, allowRoles("admin"));

// Preserved test endpoint
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Admin access granted.",
    });
});

router.get("/dashboard", getAdminDashboard);
router.get("/users", getUsers);
router.post("/users", createUser);
router.get("/users/:id", getUserById);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/status", updateUserStatus);
router.get("/audit-logs", getAuditLogs);

export default router;
