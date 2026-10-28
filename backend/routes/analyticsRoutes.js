import express from "express";
import { getStudentDashboard } from "../controllers/analyticsController.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", protect, allowRoles("student"), getStudentDashboard);

export default router;
