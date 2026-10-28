import express from "express";
import {
    getMockTests,
    getMockTestById,
    startPractice,
    startMockTest,
    submitAttempt,
    getAttemptById,
    getAttemptReview,
    getHistory,
    getIncorrectQuestions,
    removeIncorrectQuestion,
    clearRevisionItems,
    createMockTest,
    logIntegrityEvent,
    publishMockTest,
    updateMockTestStatus,
    getMockTestPreview,
} from "../controllers/testController.js";
import { protect, allowRoles, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/mock-tests", optionalAuth, getMockTests);
router.get("/mock-tests/:id", optionalAuth, getMockTestById);
router.get("/", optionalAuth, getMockTests);

// Student actions
router.post("/practice/start", protect, allowRoles("student"), startPractice);
router.post("/mock-tests/:id/start", protect, allowRoles("student"), startMockTest);
router.get("/attempts/:attemptId", protect, getAttemptById);
router.post("/attempts/:attemptId/submit", protect, allowRoles("student"), submitAttempt);
router.post("/attempts/:attemptId/integrity-event", protect, allowRoles("student"), logIntegrityEvent);
router.get("/attempts/:attemptId/review", protect, getAttemptReview);
router.get("/history", protect, allowRoles("student"), getHistory);
router.get("/incorrect", protect, allowRoles("student"), getIncorrectQuestions);
router.delete("/incorrect/all", protect, allowRoles("student"), clearRevisionItems);
router.delete("/incorrect/:questionId", protect, allowRoles("student"), removeIncorrectQuestion);
router.post("/revision/clear-all", protect, allowRoles("student"), clearRevisionItems);

// Coordinator actions
router.post("/mock-tests", protect, allowRoles("coordinator", "admin"), createMockTest);
router.get("/mock-tests/:id/preview", protect, allowRoles("coordinator", "admin"), getMockTestPreview);
router.patch("/mock-tests/:id/publish", protect, allowRoles("coordinator", "admin"), publishMockTest);
router.patch("/mock-tests/:id/status", protect, allowRoles("coordinator", "admin"), updateMockTestStatus);

export default router;
