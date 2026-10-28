import express from "express";
import {
    getCategories,
    getQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    toggleQuestionStatus,
} from "../controllers/questionController.js";
import { protect, allowRoles, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/categories", optionalAuth, getCategories);
router.get("/", optionalAuth, getQuestions);
router.get("/:id", optionalAuth, getQuestionById);

// Coordinator & Admin routes
router.post("/", protect, allowRoles("coordinator", "admin"), createQuestion);
router.put("/:id", protect, allowRoles("coordinator", "admin"), updateQuestion);
router.patch("/:id/status", protect, allowRoles("coordinator", "admin"), toggleQuestionStatus);

export default router;
