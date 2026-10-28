import express from "express";
import multer from "multer";
import {
    getCoordinatorDashboard,
    getImportTemplate,
    previewImport,
    confirmImport,
    getImportHistory,
    getMockTestMonitoring,
    getMockTestDetail,
    getMockTestAttempts,
    assignMockTest,
    getCoordinatorStudents,
    getStudentPerformanceDetail,
    getCoordinatorAnalytics,
    exportResultsCsv,
    getCoordinatorDepartments,
    createMockTest,
    updateMockTest,
    archiveMockTest,
} from "../controllers/coordinatorController.js";
import { publishMockTest } from "../controllers/testController.js";
import { protect, allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
        const allowedExtensions = [".xlsx", ".xls", ".csv"];
        const isAllowed = allowedExtensions.some((ext) =>
            file.originalname.toLowerCase().endsWith(ext)
        );
        if (isAllowed) {
            cb(null, true);
        } else {
            cb(new Error("Only .csv, .xlsx, and .xls spreadsheet files are supported."));
        }
    },
});

router.use(protect, allowRoles("coordinator", "admin"));

// Dashboard Overview
router.get("/dashboard", getCoordinatorDashboard);

// Departments Directory
router.get("/departments", getCoordinatorDepartments);

// Mock Test Monitoring, Creation & Management
router.get("/mock-tests", getMockTestMonitoring);
router.post("/mock-tests", createMockTest);
router.get("/mock-tests/:id", getMockTestDetail);
router.get("/mock-tests/:id/monitoring", getMockTestDetail);
router.put("/mock-tests/:id", updateMockTest);
router.patch("/mock-tests/:id/publish", publishMockTest);
router.post("/mock-tests/:id/publish", publishMockTest);
router.delete("/mock-tests/:id", archiveMockTest);
router.patch("/mock-tests/:id/archive", archiveMockTest);
router.get("/mock-tests/:id/attempts", getMockTestAttempts);
router.patch("/mock-tests/:id/assign", assignMockTest);

// Student Management & Performance
router.get("/students", getCoordinatorStudents);
router.get("/students/:id", getStudentPerformanceDetail);

// Performance Insights & Reports
router.get("/analytics", getCoordinatorAnalytics);
router.get("/reports/export", exportResultsCsv);

// Spreadsheet Import Workflow
router.get("/import/template", getImportTemplate);
router.post("/import/preview", upload.single("file"), previewImport);
router.post("/import/confirm", confirmImport);
router.get("/import/history", getImportHistory);

export default router;
