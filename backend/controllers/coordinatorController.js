import mongoose from "mongoose";
import ExcelJS from "exceljs";
import Question from "../models/Question.js";
import MockTest from "../models/MockTest.js";
import Attempt from "../models/Attempt.js";
import ImportBatch from "../models/ImportBatch.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import { notifyEligibleStudentsOnTestPublish } from "./testController.js";

export const getCoordinatorDashboard = async (req, res) => {
    try {
        const [
            totalQ,
            activeQ,
            verifiedQ,
            totalTests,
            importHistory,
            totalStudents,
            uniqueStudentAttempts,
            completedAttempts,
            inProgressAttempts,
            allMockAttemptsCount,
            recentAttempts,
        ] = await Promise.all([
            Question.countDocuments(),
            Question.countDocuments({ isActive: true }),
            Question.countDocuments({ isVerified: true }),
            MockTest.countDocuments({ isActive: true }),
            ImportBatch.find().sort({ createdAt: -1 }).limit(5),
            User.countDocuments({ role: "student", isActive: true }),
            Attempt.distinct("student", { type: "mock-test" }),
            Attempt.countDocuments({ type: "mock-test", status: "completed" }),
            Attempt.countDocuments({ type: "mock-test", status: "in-progress" }),
            Attempt.countDocuments({ type: "mock-test" }),
            Attempt.find({ type: "mock-test" })
                .sort({ createdAt: -1 })
                .limit(8)
                .populate("student", "name email studentId department graduationYear")
                .populate("mockTest", "title category company durationMinutes")
                .select("student mockTest title score totalMarks accuracy status result startTime endTime timeSpentSeconds createdAt")
                .lean(),
        ]);

        const uniqueStudentsCount = Array.isArray(uniqueStudentAttempts) ? uniqueStudentAttempts.length : 0;
        const unattemptedStudentsCount = Math.max(0, totalStudents - uniqueStudentsCount);
        const completionRate = allMockAttemptsCount > 0 ? Math.round((completedAttempts / allMockAttemptsCount) * 100) : 0;

        // Average score and accuracy of completed mock-tests
        const avgStats = await Attempt.aggregate([
            { $match: { type: "mock-test", status: "completed" } },
            {
                $group: {
                    _id: null,
                    avgScore: { $avg: "$score" },
                    avgAccuracy: { $avg: "$accuracy" },
                    passedCount: {
                        $sum: { $cond: [{ $eq: ["$result", "Passed"] }, 1, 0] },
                    },
                },
            },
        ]);

        const avgScore = avgStats[0] ? Math.round(avgStats[0].avgScore * 10) / 10 : 0;
        const avgAccuracy = avgStats[0] ? Math.round(avgStats[0].avgAccuracy) : 0;
        const passRate = completedAttempts > 0 && avgStats[0]
            ? Math.round((avgStats[0].passedCount / completedAttempts) * 100)
            : 0;

        const categories = await Question.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
        ]);

        // Retain original metricCards for backward compatibility with existing tests
        const metricCards = [
            {
                label: "Total Questions",
                value: totalQ,
                subtext: `${activeQ} active in live repository`,
                icon: "BookOpen",
                color: "teal",
            },
            {
                label: "Verified Content",
                value: verifiedQ,
                subtext: "Reviewed by placement faculty",
                icon: "CheckCircle2",
                color: "emerald",
            },
            {
                label: "Active Mock Tests",
                value: totalTests,
                subtext: "Available for student simulations",
                icon: "FolderGit2",
                color: "amber",
            },
            {
                label: "Pending Review",
                value: totalQ - verifiedQ,
                subtext: "Requires coordinator validation",
                icon: "FileSpreadsheet",
                color: "rose",
            },
        ];

        // Upgraded database-backed summary cards for the mock-test dashboard
        const summaryCards = [
            {
                label: "Accessible Students",
                value: totalStudents,
                subtext: `${unattemptedStudentsCount} pending mock tests`,
                icon: "Users",
                color: "teal",
            },
            {
                label: "Available Mock Tests",
                value: totalTests,
                subtext: "Active campus simulations",
                icon: "FolderGit2",
                color: "blue",
            },
            {
                label: "Students Attempted",
                value: uniqueStudentsCount,
                subtext: `${Math.round((uniqueStudentsCount / (totalStudents || 1)) * 100)}% participation rate`,
                icon: "CheckCircle2",
                color: "emerald",
            },
            {
                label: "Completed Attempts",
                value: completedAttempts,
                subtext: `${completionRate}% attempt completion rate`,
                icon: "Award",
                color: "amber",
            },
            {
                label: "In-Progress Tests",
                value: inProgressAttempts,
                subtext: "Currently running test sessions",
                icon: "Timer",
                color: "purple",
            },
            {
                label: "Unattempted Students",
                value: unattemptedStudentsCount,
                subtext: "Zero mock test attempts",
                icon: "AlertCircle",
                color: "rose",
            },
            {
                label: "Average Accuracy",
                value: `${avgAccuracy}%`,
                subtext: `Avg score: ${avgScore} pts (${passRate}% pass rate)`,
                icon: "TrendingUp",
                color: "emerald",
            },
            {
                label: "Completion Rate",
                value: `${completionRate}%`,
                subtext: `${completedAttempts} / ${allMockAttemptsCount} attempts`,
                icon: "Activity",
                color: "sky",
            },
        ];

        const formattedHistory = importHistory.map((b) => ({
            importBatchId: b.batchId,
            batchId: b.batchId,
            filename: b.fileName,
            fileName: b.fileName,
            uploadedAt: b.createdAt,
            date: b.createdAt,
            totalRows: b.totalRows,
            insertedCount: b.validCount || 0,
            importedCount: b.validCount || 0,
            status: b.status === "confirmed" ? "Completed" : "Previewed",
            uploaderName: b.uploaderName || "Coordinator",
            uploadedBy: b.uploaderName || "Coordinator",
        }));

        const formattedRecentActivity = recentAttempts.map((att) => ({
            _id: att._id,
            attemptId: att._id,
            studentName: att.student?.name || "Student",
            studentEmail: att.student?.email || "",
            studentId: att.student?.studentId || "",
            department: att.student?.department || "General",
            testTitle: att.title || att.mockTest?.title || "Mock Test",
            mockTestId: att.mockTest?._id || null,
            score: att.score || 0,
            totalMarks: att.totalMarks || 0,
            accuracy: att.accuracy || 0,
            status: att.status,
            result: att.result,
            timeSpentSeconds: att.timeSpentSeconds || 0,
            startTime: att.startTime,
            endTime: att.endTime,
            createdAt: att.createdAt,
        }));

        return res.json({
            success: true,
            message: "Coordinator dashboard retrieved successfully",
            data: {
                metrics: {
                    totalQuestions: totalQ,
                    activeQuestions: activeQ,
                    verifiedQuestions: verifiedQ,
                    needsReview: totalQ - verifiedQ,
                    activeTests: totalTests,
                    pendingImports: 0,
                    // Additional mock-test metrics
                    totalStudents,
                    uniqueStudentsAttempted: uniqueStudentsCount,
                    completedAttempts,
                    inProgressAttempts,
                    totalAttempts: allMockAttemptsCount,
                    unattemptedStudents: unattemptedStudentsCount,
                    averageScore: avgScore,
                    averageAccuracy: avgAccuracy,
                    completionRate,
                    passRate,
                },
                metricCards,
                summaryCards,
                recentActivity: formattedRecentActivity,
                categoryBreakdown: categories.map((c) => ({
                    category: c._id || "Unassigned",
                    count: c.count,
                })),
                recentImports: formattedHistory,
                importHistory: formattedHistory,
            },
        });
    } catch (error) {
        console.error("getCoordinatorDashboard error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve coordinator dashboard",
        });
    }
};

export const getImportTemplate = async (req, res) => {
    try {
        const csvHeader =
            "questionId,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,category,topic,subtopic,difficulty,companies,source,year\n" +
            'QA-TW-001,"A can do a work in 12 days, B in 18 days. If they work together for 4 days, what fraction remains?","4/9","5/9","1/3","2/5",A,"1 - 4*(5/36) = 4/9","Quantitative Aptitude","Time and Work","Combined Work",easy,"TCS, Infosys","TCS NQT 2024",2024\n';

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="readyup_questions_template.csv"'
        );
        return res.send(csvHeader);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to generate template",
        });
    }
};

// Safe parser for spreadsheet rows (handles both Excel and CSV via ExcelJS buffer)
export const previewImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No spreadsheet file uploaded.",
            });
        }

        const buffer = req.file.buffer;
        const fileName = req.file.originalname;
        const isCsv = fileName.toLowerCase().endsWith(".csv");

        const workbook = new ExcelJS.Workbook();
        if (isCsv) {
            // Read CSV stream from buffer
            const stream = await import("stream");
            const readable = stream.Readable.from(buffer);
            await workbook.csv.read(readable);
        } else {
            await workbook.xlsx.load(buffer);
        }

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return res.status(400).json({
                success: false,
                message: "Uploaded spreadsheet is empty or has no readable sheet.",
            });
        }

        const rows = [];
        let headers = [];

        worksheet.eachRow((row, rowNumber) => {
            const values = Array.isArray(row.values) ? row.values.slice(1) : [];
            // Clean values and sanitize formula injection (=, +, -, @ prefix)
            const cleanValues = values.map((val) => {
                let cellText = "";
                if (val && typeof val === "object") {
                    cellText = val.text || val.result || JSON.stringify(val);
                } else if (val !== null && val !== undefined) {
                    cellText = String(val);
                }
                // Strip spreadsheet formula trigger prefixes for security without corrupting legitimate negative numbers
                return cellText.replace(/^=/, "'=").trim();
            });

            if (rowNumber === 1) {
                headers = cleanValues.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
            } else if (cleanValues.some(Boolean)) {
                const rowObj = {};
                headers.forEach((h, idx) => {
                    rowObj[h] = cleanValues[idx] || "";
                });
                rowObj._rowNumber = rowNumber;
                rows.push(rowObj);
            }
        });

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Spreadsheet contains no data rows.",
            });
        }

        // Perform a single batch query for candidate question IDs to avoid O(N) sequential database round trips
        const candidateQuestionIds = rows
            .map((r) => (r.questionid || r.id || `IMP-${r._rowNumber}`).trim().toUpperCase())
            .filter(Boolean);

        const existingDbQuestions = await Question.find(
            { questionId: { $in: candidateQuestionIds } },
            { questionId: 1 }
        ).lean();
        const existingDbIdsSet = new Set(existingDbQuestions.map((q) => q.questionId));

        const validRows = [];
        const validationErrors = [];
        const seenIds = new Set();

        for (const row of rows) {
            const rowNum = row._rowNumber;
            const qId = (row.questionid || row.id || `IMP-${rowNum}`).toUpperCase();
            const qText = row.questiontext || row.question || "";
            const optA = row.optiona || row.a || "";
            const optB = row.optionb || row.b || "";
            const optC = row.optionc || row.c || "";
            const optD = row.optiond || row.d || "";
            const correct = (row.correctoption || row.answer || "").trim().toUpperCase();
            const category = row.category || "Quantitative Aptitude";
            const topic = row.topic || "General";
            const difficulty = (row.difficulty || "medium").toLowerCase();

            const rowErrors = [];

            if (!qText) rowErrors.push("Question text is required");
            if (!optA || !optB) rowErrors.push("Options A and B are required");
            if (!["A", "B", "C", "D"].includes(correct)) {
                rowErrors.push(`Correct option must be A, B, C, or D (got '${correct}')`);
            }
            if (seenIds.has(qId)) {
                rowErrors.push(`Duplicate questionId '${qId}' within this file`);
            } else {
                seenIds.add(qId);
            }

            const isDuplicateInDb = existingDbIdsSet.has(qId);

            const options = [
                { optionId: "A", text: optA },
                { optionId: "B", text: optB },
            ];
            if (optC) options.push({ optionId: "C", text: optC });
            if (optD) options.push({ optionId: "D", text: optD });

            const formattedRow = {
                rowNumber: rowNum,
                questionId: qId,
                questionText: qText,
                options,
                correctOption: correct,
                explanation: row.explanation || "",
                category,
                topic,
                subtopic: row.subtopic || "",
                difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
                companies: row.companies ? row.companies.split(",").map((c) => c.trim()).filter(Boolean) : [],
                source: row.source || "Bulk Import",
                year: row.year ? Number(row.year) : new Date().getFullYear(),
                isDuplicateInDb,
                status: rowErrors.length === 0 ? (isDuplicateInDb ? "Duplicate (Will Update)" : "Valid") : "Invalid",
                errors: rowErrors,
            };

            if (rowErrors.length > 0) {
                validationErrors.push({
                    row: rowNum,
                    rowNumber: rowNum,
                    questionId: qId,
                    field: rowErrors[0].includes("option") ? "correctOption" : (rowErrors[0].includes("Question") ? "questionText" : "general"),
                    error: rowErrors.join(", "),
                    messages: rowErrors,
                });
            } else {
                validRows.push(formattedRow);
            }
        }

        const batchId = `BATCH-${Date.now().toString().slice(-6)}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour lifespan

        const batch = await ImportBatch.create({
            batchId,
            uploadedBy: req.user._id,
            uploaderName: req.user.name,
            fileName,
            fileType: isCsv ? "csv" : "xlsx",
            totalRows: rows.length,
            validCount: validRows.length,
            errorCount: validationErrors.length,
            skippedCount: 0,
            status: "previewed",
            previewRows: validRows,
            errors: validationErrors,
            expiresAt,
        });

        return res.json({
            success: true,
            message: `Spreadsheet parsed. ${validRows.length} valid rows, ${validationErrors.length} errors found.`,
            data: {
                batchId: batch.batchId,
                importBatchId: batch.batchId,
                fileName,
                totalRows: rows.length,
                validRowsCount: validRows.length,
                invalidRowsCount: validationErrors.length,
                rows: validRows.slice(0, 50), // Sample for UI preview
                validRows,
                previewSample: validRows.slice(0, 5),
                errors: validationErrors,
                expiresAt: batch.expiresAt,
            },
        });
    } catch (error) {
        console.error("previewImport error:", error.message);
        return res.status(500).json({
            success: false,
            message: `Failed to process spreadsheet: ${error.message}`,
        });
    }
};

export const confirmImport = async (req, res) => {
    try {
        const batchIdentifier = req.body.importBatchId || req.body.batchId;

        if (!batchIdentifier || typeof batchIdentifier !== "string" || !batchIdentifier.trim()) {
            return res.status(400).json({
                success: false,
                message: "A valid importBatchId or batchId is required.",
                code: "INVALID_BATCH_ID",
            });
        }

        const trimmedId = batchIdentifier.trim();
        const query = mongoose.Types.ObjectId.isValid(trimmedId)
            ? { $or: [{ batchId: trimmedId }, { _id: trimmedId }] }
            : { batchId: trimmedId };

        const batch = await ImportBatch.findOne(query);
        if (!batch) {
            return res.status(404).json({
                success: false,
                message: "Import batch not found. Please upload and preview the spreadsheet again.",
                code: "BATCH_NOT_FOUND",
            });
        }

        // Check if batch is genuinely expired
        if (batch.expiresAt && new Date() > new Date(batch.expiresAt)) {
            return res.status(410).json({
                success: false,
                message: "Import batch has expired. Please upload and preview the spreadsheet again.",
                code: "BATCH_EXPIRED",
                data: {
                    batchId: batch.batchId,
                    importBatchId: batch.batchId,
                    expiredAt: batch.expiresAt,
                },
            });
        }

        // Idempotency: check if already confirmed
        if (batch.status === "confirmed" || batch.status === "completed") {
            return res.status(409).json({
                success: false,
                message: "This import batch has already been confirmed and published.",
                code: "BATCH_ALREADY_CONFIRMED",
                data: {
                    batchId: batch.batchId,
                    importBatchId: batch.batchId,
                    status: batch.status,
                    totalProcessed: batch.validCount || batch.previewRows?.length || 0,
                    insertedCount: batch.validCount || batch.previewRows?.length || 0,
                    updatedCount: 0,
                    skippedCount: batch.skippedCount || 0,
                    failedCount: 0,
                },
            });
        }

        if (!Array.isArray(batch.previewRows) || batch.previewRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Import batch contains no valid preview rows to publish.",
                code: "EMPTY_BATCH",
            });
        }

        // Identify existing questions to accurately calculate inserted vs updated
        const previewQuestionIds = batch.previewRows.map((item) => item.questionId);
        const existingDocs = await Question.find(
            { questionId: { $in: previewQuestionIds } },
            { questionId: 1 }
        ).lean();
        const existingIdSet = new Set(existingDocs.map((doc) => doc.questionId));

        const bulkOps = batch.previewRows.map((item) => ({
            updateOne: {
                filter: { questionId: item.questionId },
                update: {
                    $set: {
                        questionId: item.questionId,
                        questionText: item.questionText,
                        options: item.options,
                        correctOption: item.correctOption,
                        explanation: item.explanation || "",
                        category: item.category,
                        topic: item.topic,
                        subtopic: item.subtopic || "",
                        difficulty: item.difficulty || "medium",
                        companies: Array.isArray(item.companies) ? item.companies : [],
                        source: item.source || "Bulk Import",
                        year: Number(item.year) || new Date().getFullYear(),
                        isVerified: true,
                        isActive: true,
                    },
                },
                upsert: true,
            },
        }));

        let insertedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const failedItems = [];

        try {
            await Question.bulkWrite(bulkOps, { ordered: false });
            for (const item of batch.previewRows) {
                if (existingIdSet.has(item.questionId)) {
                    updatedCount += 1;
                } else {
                    insertedCount += 1;
                }
            }
        } catch (bulkErr) {
            console.error("Bulk write error during import confirmation:", bulkErr.message);
            if (bulkErr.writeErrors && bulkErr.writeErrors.length > 0) {
                const failedIndexes = new Set(bulkErr.writeErrors.map((we) => we.index));
                for (let i = 0; i < batch.previewRows.length; i++) {
                    const item = batch.previewRows[i];
                    if (failedIndexes.has(i)) {
                        failedCount += 1;
                        const errInfo = bulkErr.writeErrors.find((we) => we.index === i);
                        failedItems.push({
                            questionId: item.questionId,
                            error: errInfo?.errmsg || "Write failed",
                        });
                    } else if (existingIdSet.has(item.questionId)) {
                        updatedCount += 1;
                    } else {
                        insertedCount += 1;
                    }
                }
            } else {
                throw bulkErr;
            }
        }

        if (failedCount > 0 && insertedCount + updatedCount === 0) {
            batch.status = "failed";
            await batch.save();
            return res.status(500).json({
                success: false,
                message: `Failed to import questions: All ${failedCount} rows failed schema validation or database writes.`,
                data: {
                    batchId: batch.batchId,
                    importBatchId: batch.batchId,
                    insertedCount: 0,
                    updatedCount: 0,
                    skippedCount: batch.skippedCount || 0,
                    failedCount,
                    failedItems,
                    totalProcessed: 0,
                },
            });
        }

        batch.status = "confirmed";
        batch.validCount = insertedCount + updatedCount;
        await batch.save();

        await logAuditEvent({
            action: "SPREADSHEET_IMPORT",
            user: req.user,
            targetType: "IMPORT",
            targetId: batch.batchId,
            details: `Committed spreadsheet batch: ${insertedCount} inserted, ${updatedCount} updated${failedCount > 0 ? `, ${failedCount} failed` : ""} from ${batch.fileName}`,
            ipAddress: req.ip,
        });

        // Dynamic notifications for imported questions
        if (insertedCount > 0) {
            try {
                const students = await User.find({ role: "student", isActive: true }).select("_id");
                if (students.length > 0) {
                    const sampleTopic = batch.previewRows[0]?.topic || "General";
                    const sampleCategory = batch.previewRows[0]?.category || "";
                    const notifications = students.map((s) => ({
                        user: s._id,
                        title: "New Questions Added",
                        message: `${insertedCount} new question(s) were imported and published to the question bank.`,
                        type: "info",
                        link: sampleCategory ? `/practice?topic=${encodeURIComponent(sampleTopic)}&category=${encodeURIComponent(sampleCategory)}` : "/practice",
                        isRead: false,
                    }));
                    await Notification.insertMany(notifications);
                }
            } catch (notifErr) {
                console.error("Failed to dispatch spreadsheet import notifications:", notifErr.message);
            }
        }

        return res.json({
            success: true,
            message: `Import confirmed successfully. ${insertedCount} new questions added, ${updatedCount} updated${failedCount > 0 ? `, ${failedCount} failed` : ""}.`,
            data: {
                batchId: batch.batchId,
                importBatchId: batch.batchId,
                insertedCount,
                updatedCount,
                skippedCount: batch.skippedCount || 0,
                failedCount,
                failedItems,
                totalProcessed: insertedCount + updatedCount,
            },
        });
    } catch (error) {
        console.error("confirmImport error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to confirm spreadsheet import: " + error.message,
        });
    }
};

export const getImportHistory = async (req, res) => {
    try {
        const history = await ImportBatch.find().sort({ createdAt: -1 }).limit(30);

        return res.json({
            success: true,
            message: "Import history retrieved successfully",
            data: history.map((b) => ({
                importBatchId: b.batchId,
                batchId: b.batchId,
                filename: b.fileName,
                fileName: b.fileName,
                fileType: b.fileType,
                totalRows: b.totalRows,
                insertedCount: b.validCount || 0,
                validCount: b.validCount || 0,
                updatedCount: 0,
                errorCount: b.errorCount || 0,
                status: b.status === "confirmed" ? "published" : b.status,
                uploaderName: b.uploaderName || "Coordinator",
                uploadedBy: b.uploaderName || "Coordinator",
                uploadedAt: b.createdAt,
                createdAt: b.createdAt,
            })),
        });
    } catch (error) {
        console.error("getImportHistory error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve import history",
        });
    }
};

// ==========================================
// MOCK TEST MONITORING & MANAGEMENT
// ==========================================

export const getMockTestMonitoring = async (req, res) => {
    try {
        const { search, category, difficulty, status, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const filter = { isActive: true };
        if (category && category !== "all" && category !== "All" && category !== "undefined" && category !== "null") {
            filter.category = new RegExp(category, "i");
        }
        if (difficulty && difficulty !== "all" && difficulty !== "undefined" && difficulty !== "null") {
            filter.difficulty = difficulty.toLowerCase();
        }
        if (search && search !== "undefined" && search !== "null" && search.trim()) {
            const s = search.trim();
            filter.$or = [
                { title: { $regex: s, $options: "i" } },
                { company: { $regex: s, $options: "i" } },
                { category: { $regex: s, $options: "i" } },
            ];
        }

        const now = new Date();
        if (status === "draft") {
            filter.status = "draft";
        } else if (status === "upcoming") {
            filter.status = { $ne: "draft" };
            filter.startDate = { $gt: now };
        } else if (status === "closed" || status === "expired") {
            filter.status = { $ne: "draft" };
            filter.endDate = { $lt: now };
        } else if (status === "active") {
            filter.status = { $ne: "draft" };
            filter.$and = [
                { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
                { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
            ];
        } else if (status === "completed") {
            const completedMockTestIds = await Attempt.distinct("mockTest", { type: "mock-test", status: "completed" });
            filter._id = { $in: completedMockTestIds };
        } else if (status === "in-progress") {
            const inProgressMockTestIds = await Attempt.distinct("mockTest", { type: "mock-test", status: "in-progress" });
            filter._id = { $in: inProgressMockTestIds };
        }

        const [tests, total] = await Promise.all([
            MockTest.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            MockTest.countDocuments(filter),
        ]);

        const totalActiveStudents = await User.countDocuments({ role: "student", isActive: true });

        // Batch aggregate attempt statistics for all fetched tests
        const testIds = tests.map((t) => t._id);
        const attemptStats = await Attempt.aggregate([
            { $match: { mockTest: { $in: testIds }, type: "mock-test" } },
            {
                $group: {
                    _id: "$mockTest",
                    totalAttempts: { $sum: 1 },
                    completedCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    inProgressCount: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
                    passedCount: { $sum: { $cond: [{ $eq: ["$result", "Passed"] }, 1, 0] } },
                    avgScore: { $avg: { $cond: [{ $eq: ["$status", "completed"] }, "$score", null] } },
                    avgAccuracy: { $avg: { $cond: [{ $eq: ["$status", "completed"] }, "$accuracy", null] } },
                    uniqueStudents: { $addToSet: "$student" },
                },
            },
        ]);

        const statsMap = new Map();
        attemptStats.forEach((st) => {
            statsMap.set(st._id.toString(), {
                totalAttempts: st.totalAttempts,
                completedCount: st.completedCount,
                inProgressCount: st.inProgressCount,
                passedCount: st.passedCount,
                avgScore: st.avgScore ? Math.round(st.avgScore * 10) / 10 : 0,
                avgAccuracy: st.avgAccuracy ? Math.round(st.avgAccuracy) : 0,
                uniqueStudentsCount: st.uniqueStudents ? st.uniqueStudents.length : 0,
            });
        });

        // Compute eligibility and schedule status for each test
        const formattedTests = await Promise.all(
            tests.map(async (test) => {
                const st = statsMap.get(test._id.toString()) || {
                    totalAttempts: 0,
                    completedCount: 0,
                    inProgressCount: 0,
                    passedCount: 0,
                    avgScore: 0,
                    avgAccuracy: 0,
                    uniqueStudentsCount: 0,
                };

                let eligibleCount = totalActiveStudents;
                if (test.assignedStudents && test.assignedStudents.length > 0) {
                    eligibleCount = test.assignedStudents.length;
                } else if (test.assignedBatches && test.assignedBatches.length > 0) {
                    const batchOrDept = test.assignedBatches;
                    const years = batchOrDept.map((b) => parseInt(b, 10)).filter((n) => !isNaN(n));
                    eligibleCount = await User.countDocuments({
                        role: "student",
                        isActive: true,
                        $or: [
                            { department: { $in: batchOrDept } },
                            ...(years.length > 0 ? [{ graduationYear: { $in: years } }] : []),
                        ],
                    });
                }

                const unattemptedCount = Math.max(0, eligibleCount - st.uniqueStudentsCount);

                let scheduleStatus = "active";
                if (test.status === "draft") {
                    scheduleStatus = "draft";
                } else if (test.startDate && now < new Date(test.startDate)) {
                    scheduleStatus = "upcoming";
                } else if (test.endDate && now > new Date(test.endDate)) {
                    scheduleStatus = "closed";
                }

                return {
                    _id: test._id,
                    title: test.title,
                    slug: test.slug,
                    type: test.type,
                    company: test.company || "General",
                    category: test.category || "Mixed",
                    difficulty: test.difficulty || "medium",
                    durationMinutes: test.durationMinutes,
                    totalQuestions: test.totalQuestions,
                    passingScore: test.passingScore || 60,
                    assignedBatches: test.assignedBatches || [],
                    assignedDepartments: (test.assignedDepartments && test.assignedDepartments.length > 0)
                        ? test.assignedDepartments
                        : (test.assignedBatches || []),
                    status: test.status || (test.isActive ? "published" : "archived"),
                    isActive: test.isActive !== false,
                    totalMarks: test.totalMarks || test.totalQuestions || 15,
                    description: test.description || "",
                    assignedStudentsCount: test.assignedStudents?.length || 0,
                    startDate: test.startDate,
                    endDate: test.endDate,
                    isScheduled: Boolean(test.isScheduled),
                    scheduleStatus,
                    eligibleStudentsCount: eligibleCount,
                    uniqueStudentsAttempted: st.uniqueStudentsCount,
                    totalAttempts: st.totalAttempts,
                    completedAttempts: st.completedCount,
                    inProgressAttempts: st.inProgressCount,
                    unattemptedCount,
                    averageScore: st.avgScore,
                    averageAccuracy: st.avgAccuracy,
                    passedCount: st.passedCount,
                    passRate: st.completedCount > 0 ? Math.round((st.passedCount / st.completedCount) * 100) : 0,
                    createdAt: test.createdAt,
                };
            })
        );

        return res.json({
            success: true,
            message: "Mock test monitoring data retrieved successfully",
            data: formattedTests,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("getMockTestMonitoring error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve mock test monitoring data",
        });
    }
};

export const getMockTestDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const test = await MockTest.findById(id)
            .populate("assignedStudents", "name email studentId department")
            .populate("questions");
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        const [totalAttempts, completedCount, inProgressCount, avgStats] = await Promise.all([
            Attempt.countDocuments({ mockTest: test._id, type: "mock-test" }),
            Attempt.countDocuments({ mockTest: test._id, type: "mock-test", status: "completed" }),
            Attempt.countDocuments({ mockTest: test._id, type: "mock-test", status: "in-progress" }),
            Attempt.aggregate([
                { $match: { mockTest: test._id, type: "mock-test", status: "completed" } },
                {
                    $group: {
                        _id: null,
                        avgScore: { $avg: "$score" },
                        avgAccuracy: { $avg: "$accuracy" },
                        passedCount: { $sum: { $cond: [{ $eq: ["$result", "Passed"] }, 1, 0] } },
                    },
                },
            ]),
        ]);

        const uniqueStudents = (await Attempt.distinct("student", { mockTest: test._id, type: "mock-test" })).length;
        const totalActiveStudents = await User.countDocuments({ role: "student", isActive: true });

        let eligibleCount = totalActiveStudents;
        if (test.assignedStudents?.length > 0) {
            eligibleCount = test.assignedStudents.length;
        } else if (test.assignedBatches?.length > 0) {
            const batchOrDept = test.assignedBatches;
            const years = batchOrDept.map((b) => parseInt(b, 10)).filter((n) => !isNaN(n));
            eligibleCount = await User.countDocuments({
                role: "student",
                isActive: true,
                $or: [
                    { department: { $in: batchOrDept } },
                    ...(years.length > 0 ? [{ graduationYear: { $in: years } }] : []),
                ],
            });
        }

        const now = new Date();
        let scheduleStatus = "active";
        if (test.startDate && now < new Date(test.startDate)) {
            scheduleStatus = "upcoming";
        } else if (test.endDate && now > new Date(test.endDate)) {
            scheduleStatus = "closed";
        }

        return res.json({
            success: true,
            message: "Mock test detail retrieved",
            data: {
                ...test.toObject(),
                stats: {
                    totalAttempts,
                    completedAttempts: completedCount,
                    inProgressAttempts: inProgressCount,
                    uniqueStudentsAttempted: uniqueStudents,
                    eligibleStudentsCount: eligibleCount,
                    unattemptedCount: Math.max(0, eligibleCount - uniqueStudents),
                    averageScore: avgStats[0] ? Math.round(avgStats[0].avgScore * 10) / 10 : 0,
                    averageAccuracy: avgStats[0] ? Math.round(avgStats[0].avgAccuracy) : 0,
                    passedCount: avgStats[0]?.passedCount || 0,
                    passRate: completedCount > 0 && avgStats[0] ? Math.round((avgStats[0].passedCount / completedCount) * 100) : 0,
                    scheduleStatus,
                },
            },
        });
    } catch (error) {
        console.error("getMockTestDetail error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve mock test details",
        });
    }
};

export const getMockTestAttempts = async (req, res) => {
    try {
        const { id } = req.params;
        const { search, status, page = 1, limit = 20, dateFrom, dateTo } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const filter = {
            mockTest: new mongoose.Types.ObjectId(id),
            type: "mock-test",
        };

        if (status && status !== "all" && status !== "undefined" && status !== "null") {
            filter.status = status;
        }

        const validDateFrom = dateFrom && dateFrom !== "undefined" && dateFrom !== "null" ? dateFrom : null;
        const validDateTo = dateTo && dateTo !== "undefined" && dateTo !== "null" ? dateTo : null;
        if (validDateFrom || validDateTo) {
            filter.createdAt = {};
            if (validDateFrom) filter.createdAt.$gte = new Date(validDateFrom);
            if (validDateTo) filter.createdAt.$lte = new Date(validDateTo);
        }

        if (search && search !== "undefined" && search !== "null" && search.trim()) {
            const s = search.trim();
            const matchingUsers = await User.find({
                role: "student",
                $or: [
                    { name: { $regex: s, $options: "i" } },
                    { email: { $regex: s, $options: "i" } },
                    { studentId: { $regex: s, $options: "i" } },
                ],
            }).select("_id");
            filter.student = { $in: matchingUsers.map((u) => u._id) };
        }

        const [attempts, total] = await Promise.all([
            Attempt.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate("student", "name email studentId department graduationYear")
                .populate("mockTest", "title passingScore")
                .select("student mockTest title score totalMarks accuracy status result startTime endTime timeSpentSeconds createdAt")
                .lean(),
            Attempt.countDocuments(filter),
        ]);

        // Calculate attempt number for each student for this specific test
        const studentIds = Array.from(new Set(attempts.map((a) => a.student?._id?.toString()).filter(Boolean)));
        const allStudentAttempts = await Attempt.find({
            mockTest: id,
            student: { $in: studentIds },
        })
            .sort({ createdAt: 1 })
            .select("_id student createdAt")
            .lean();

        const studentAttemptCountMap = new Map();
        allStudentAttempts.forEach((att) => {
            const sId = att.student.toString();
            if (!studentAttemptCountMap.has(sId)) {
                studentAttemptCountMap.set(sId, []);
            }
            studentAttemptCountMap.get(sId).push(att._id.toString());
        });

        const formattedAttempts = attempts.map((att) => {
            const sId = att.student?._id?.toString();
            const list = studentAttemptCountMap.get(sId) || [];
            const attemptNumber = list.indexOf(att._id.toString()) + 1 || 1;

            return {
                _id: att._id,
                attemptId: att._id,
                studentId: att.student?.studentId || "N/A",
                studentName: att.student?.name || "Student",
                studentEmail: att.student?.email || "",
                department: att.student?.department || "General",
                graduationYear: att.student?.graduationYear || 2026,
                testTitle: att.title || att.mockTest?.title || "Mock Test",
                score: att.score ?? 0,
                totalMarks: att.totalMarks ?? 0,
                accuracy: att.accuracy ?? 0,
                status: att.status,
                result: att.result,
                attemptNumber,
                startTime: att.startTime,
                submissionTime: att.endTime,
                durationSeconds: att.timeSpentSeconds || 0,
                createdAt: att.createdAt,
            };
        });

        return res.json({
            success: true,
            message: "Mock test attempts retrieved successfully",
            data: formattedAttempts,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("getMockTestAttempts error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve mock test attempts",
        });
    }
};

export const assignMockTest = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            assignedBatches = [],
            assignedStudents = [],
            startDate = null,
            endDate = null,
            isScheduled = false,
        } = req.body;

        const test = await MockTest.findById(id);
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                success: false,
                message: "Start date must be before or equal to deadline (end date).",
            });
        }

        test.assignedBatches = Array.isArray(assignedBatches) ? assignedBatches : [];
        test.assignedStudents = Array.isArray(assignedStudents) ? assignedStudents : [];
        test.startDate = startDate ? new Date(startDate) : null;
        test.endDate = endDate ? new Date(endDate) : null;
        test.isScheduled = Boolean(isScheduled);

        await test.save();

        await logAuditEvent({
            action: "MOCK_TEST_ASSIGN",
            user: req.user,
            targetType: "TEST",
            targetId: test._id,
            details: `Assigned mock test '${test.title}' to ${test.assignedBatches.length} batches and ${test.assignedStudents.length} students (Scheduled: ${test.isScheduled})`,
            ipAddress: req.ip,
        });

        // Notify assigned students if scheduling is active
        if (test.isScheduled) {
            try {
                let targetStudentQuery = { role: "student", isActive: true };
                if (test.assignedStudents.length > 0) {
                    targetStudentQuery = { _id: { $in: test.assignedStudents }, isActive: true };
                } else if (test.assignedBatches.length > 0) {
                    const batchOrDept = test.assignedBatches;
                    const years = batchOrDept.map((b) => parseInt(b, 10)).filter((n) => !isNaN(n));
                    targetStudentQuery = {
                        role: "student",
                        isActive: true,
                        $or: [
                            { department: { $in: batchOrDept } },
                            ...(years.length > 0 ? [{ graduationYear: { $in: years } }] : []),
                        ],
                    };
                }

                const students = await User.find(targetStudentQuery).select("_id");
                if (students.length > 0) {
                    const deadlineStr = test.endDate ? ` Deadline: ${new Date(test.endDate).toLocaleDateString()}` : "";
                    const notifications = students.map((s) => ({
                        user: s._id,
                        title: "New Mock Test Assigned",
                        message: `Coordinator has assigned you '${test.title}'.${deadlineStr}`,
                        type: "info",
                        link: `/tests`,
                        isRead: false,
                    }));
                    await Notification.insertMany(notifications);
                }
            } catch (notifErr) {
                console.error("Failed to dispatch assignment notifications:", notifErr.message);
            }
        }

        return res.json({
            success: true,
            message: "Mock test assigned and scheduled successfully",
            data: {
                testId: test._id,
                title: test.title,
                assignedBatches: test.assignedBatches,
                assignedStudentsCount: test.assignedStudents.length,
                startDate: test.startDate,
                endDate: test.endDate,
                isScheduled: test.isScheduled,
            },
        });
    } catch (error) {
        console.error("assignMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to assign mock test",
        });
    }
};

// ==========================================
// STUDENT MANAGEMENT & PERFORMANCE
// ==========================================

export const getCoordinatorStudents = async (req, res) => {
    try {
        const { search, department, graduationYear, page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const filter = { role: "student" };

        if (department && department !== "all" && department !== "All" && department !== "undefined" && department !== "null") {
            filter.department = new RegExp(department, "i");
        }
        if (graduationYear && graduationYear !== "all" && graduationYear !== "undefined" && graduationYear !== "null") {
            const yearNum = parseInt(graduationYear, 10);
            if (!isNaN(yearNum)) filter.graduationYear = yearNum;
        }
        if (search && search !== "undefined" && search !== "null" && search.trim()) {
            const s = search.trim();
            filter.$or = [
                { name: { $regex: s, $options: "i" } },
                { email: { $regex: s, $options: "i" } },
                { studentId: { $regex: s, $options: "i" } },
                { department: { $regex: s, $options: "i" } },
            ];
        }

        const [students, total] = await Promise.all([
            User.find(filter)
                .select("name email studentId department graduationYear college isActive lastLoginAt createdAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            User.countDocuments(filter),
        ]);

        const studentIds = students.map((s) => s._id);

        // Batch aggregate mock-test performance for fetched students
        const stats = await Attempt.aggregate([
            { $match: { student: { $in: studentIds }, type: "mock-test" } },
            {
                $group: {
                    _id: "$student",
                    testsAttempted: { $sum: 1 },
                    testsCompleted: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    passedCount: { $sum: { $cond: [{ $eq: ["$result", "Passed"] }, 1, 0] } },
                    avgAccuracy: { $avg: { $cond: [{ $eq: ["$status", "completed"] }, "$accuracy", null] } },
                    lastAttemptDate: { $max: "$createdAt" },
                },
            },
        ]);

        const statsMap = new Map();
        stats.forEach((st) => {
            statsMap.set(st._id.toString(), {
                testsAttempted: st.testsAttempted,
                testsCompleted: st.testsCompleted,
                passedCount: st.passedCount,
                avgAccuracy: st.avgAccuracy ? Math.round(st.avgAccuracy) : 0,
                lastAttemptDate: st.lastAttemptDate,
            });
        });

        const formattedStudents = students.map((s) => {
            const st = statsMap.get(s._id.toString()) || {
                testsAttempted: 0,
                testsCompleted: 0,
                passedCount: 0,
                avgAccuracy: 0,
                lastAttemptDate: null,
            };

            return {
                _id: s._id,
                name: s.name,
                email: s.email,
                studentId: s.studentId || "N/A",
                department: s.department || "General",
                graduationYear: s.graduationYear || 2026,
                college: s.college || "ReadyUp Campus",
                isActive: s.isActive,
                lastLoginAt: s.lastLoginAt,
                testsAttempted: st.testsAttempted,
                testsCompleted: st.testsCompleted,
                passedCount: st.passedCount,
                avgAccuracy: st.avgAccuracy,
                lastAttemptDate: st.lastAttemptDate,
            };
        });

        return res.json({
            success: true,
            message: "Coordinator students retrieved successfully",
            data: formattedStudents,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("getCoordinatorStudents error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve student directory",
        });
    }
};

export const getStudentPerformanceDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await User.findById(id).select("-password").lean();
        if (!student || student.role !== "student") {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        const attempts = await Attempt.find({ student: student._id })
            .sort({ createdAt: -1 })
            .populate("mockTest", "title category durationMinutes totalQuestions")
            .lean();

        // Calculate chronological score and accuracy progression
        const progression = attempts
            .filter((a) => a.status === "completed")
            .reverse()
            .map((a) => ({
                attemptId: a._id,
                title: a.title,
                score: a.score,
                totalMarks: a.totalMarks,
                accuracy: a.accuracy,
                date: a.createdAt,
            }));

        // Topic breakdown across student's attempts
        const topicMap = new Map();
        attempts.forEach((att) => {
            if (Array.isArray(att.questions)) {
                att.questions.forEach((q) => {
                    const topic = q.topic || "General";
                    if (!topicMap.has(topic)) {
                        topicMap.set(topic, { topic, category: q.category || "General", total: 0, correct: 0, answered: 0 });
                    }
                    const item = topicMap.get(topic);
                    item.total += 1;
                    if (q.userAnswer) {
                        item.answered += 1;
                        if (q.isCorrect) item.correct += 1;
                    }
                });
            }
        });

        const topicBreakdown = Array.from(topicMap.values()).map((t) => ({
            ...t,
            accuracy: t.answered > 0 ? Math.round((t.correct / t.answered) * 100) : 0,
        }));

        const strongTopics = topicBreakdown.filter((t) => t.accuracy >= 70 && t.total >= 3);
        const weakTopics = topicBreakdown.filter((t) => t.accuracy < 50 && t.total >= 3);

        const completedAttempts = attempts.filter((a) => a.status === "completed");
        const totalAccuracySum = completedAttempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0);
        const avgAccuracy = completedAttempts.length > 0 ? Math.round(totalAccuracySum / completedAttempts.length) : 0;
        const passedCount = completedAttempts.filter((a) => a.result === "Passed").length;

        return res.json({
            success: true,
            message: "Student performance detail retrieved",
            data: {
                student: {
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    studentId: student.studentId || "N/A",
                    department: student.department,
                    graduationYear: student.graduationYear,
                    college: student.college,
                    isActive: student.isActive,
                    createdAt: student.createdAt,
                },
                summary: {
                    totalAttempts: attempts.length,
                    completedAttempts: completedAttempts.length,
                    passedCount,
                    passRate: completedAttempts.length > 0 ? Math.round((passedCount / completedAttempts.length) * 100) : 0,
                    avgAccuracy,
                },
                progression,
                topicBreakdown,
                strongTopics,
                weakTopics,
                attempts: attempts.map((a) => ({
                    _id: a._id,
                    attemptId: a._id,
                    title: a.title,
                    type: a.type,
                    mockTestId: a.mockTest?._id || null,
                    score: a.score,
                    totalMarks: a.totalMarks,
                    accuracy: a.accuracy,
                    status: a.status,
                    result: a.result,
                    durationSeconds: a.timeSpentSeconds || 0,
                    startTime: a.startTime,
                    endTime: a.endTime,
                    createdAt: a.createdAt,
                })),
            },
        });
    } catch (error) {
        console.error("getStudentPerformanceDetail error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve student performance details",
        });
    }
};

// ==========================================
// PERFORMANCE INSIGHTS & REPORTS
// ==========================================

export const getCoordinatorAnalytics = async (req, res) => {
    try {
        // 1. Topic-wise accuracy aggregation across completed attempts
        const topicAgg = await Attempt.aggregate([
            { $match: { type: "mock-test", status: "completed" } },
            { $unwind: "$questions" },
            {
                $group: {
                    _id: { topic: "$questions.topic", category: "$questions.category" },
                    totalQuestions: { $sum: 1 },
                    answeredCount: { $sum: { $cond: [{ $ne: ["$questions.userAnswer", null] }, 1, 0] } },
                    correctCount: { $sum: { $cond: ["$questions.isCorrect", 1, 0] } },
                },
            },
            { $sort: { correctCount: -1 } },
        ]);

        const topics = topicAgg
            .filter((t) => t._id.topic && t._id.topic !== "General")
            .map((t) => {
                const acc = t.answeredCount > 0 ? Math.round((t.correctCount / t.answeredCount) * 100) : 0;
                return {
                    topic: t._id.topic,
                    category: t._id.category || "Mixed Aptitude",
                    totalQuestions: t.totalQuestions,
                    answeredCount: t.answeredCount,
                    correctCount: t.correctCount,
                    accuracy: acc,
                    status: acc >= 70 ? "strong" : acc < 50 ? "weak" : "moderate",
                };
            });

        const strongTopics = topics.filter((t) => t.status === "strong").slice(0, 8);
        const weakTopics = topics.filter((t) => t.status === "weak").slice(0, 8);

        // 2. Identify Students Needing Academic Support
        // Students with completed mock-test attempts whose average accuracy is < 50%
        const atRiskStudentsAgg = await Attempt.aggregate([
            { $match: { type: "mock-test", status: "completed" } },
            {
                $group: {
                    _id: "$student",
                    completedTests: { $sum: 1 },
                    avgAccuracy: { $avg: "$accuracy" },
                    failedCount: { $sum: { $cond: [{ $ne: ["$result", "Passed"] }, 1, 0] } },
                },
            },
            {
                $match: {
                    $or: [
                        { avgAccuracy: { $lt: 55 } },
                        { failedCount: { $gte: 2 } },
                    ],
                },
            },
            { $sort: { avgAccuracy: 1 } },
            { $limit: 15 },
        ]);

        const atRiskUserIds = atRiskStudentsAgg.map((a) => a._id);
        const atRiskUsers = await User.find({ _id: { $in: atRiskUserIds } })
            .select("name email studentId department graduationYear")
            .lean();

        const userMap = new Map(atRiskUsers.map((u) => [u._id.toString(), u]));

        const atRiskStudents = atRiskStudentsAgg.map((item) => {
            const user = userMap.get(item._id.toString());
            return {
                _id: item._id,
                name: user?.name || "Student",
                email: user?.email || "",
                studentId: user?.studentId || "N/A",
                department: user?.department || "General",
                graduationYear: user?.graduationYear || 2026,
                completedTests: item.completedTests,
                avgAccuracy: Math.round(item.avgAccuracy || 0),
                failedCount: item.failedCount,
            };
        });

        // 3. Test-wise comparison stats
        const testComparison = await MockTest.find({ isActive: true })
            .select("title category company durationMinutes totalQuestions attemptsCount averageScore")
            .limit(10)
            .lean();

        return res.json({
            success: true,
            message: "Coordinator analytics retrieved successfully",
            data: {
                topicAccuracy: topics,
                strongTopics,
                weakTopics,
                atRiskStudents,
                testComparison,
            },
        });
    } catch (error) {
        console.error("getCoordinatorAnalytics error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve coordinator analytics",
        });
    }
};

export const exportResultsCsv = async (req, res) => {
    try {
        const { testId, status, department, dateFrom, dateTo } = req.query;

        const filter = { type: "mock-test" };
        if (testId && testId !== "all" && testId !== "All" && testId !== "undefined" && testId !== "null" && mongoose.Types.ObjectId.isValid(testId)) {
            filter.mockTest = new mongoose.Types.ObjectId(testId);
        }
        if (status && status !== "all" && status !== "undefined" && status !== "null") {
            filter.status = status;
        }
        const validDateFrom = dateFrom && dateFrom !== "undefined" && dateFrom !== "null" ? dateFrom : null;
        const validDateTo = dateTo && dateTo !== "undefined" && dateTo !== "null" ? dateTo : null;
        if (validDateFrom || validDateTo) {
            filter.createdAt = {};
            if (validDateFrom) filter.createdAt.$gte = new Date(validDateFrom);
            if (validDateTo) filter.createdAt.$lte = new Date(validDateTo);
        }

        if (department && department !== "all" && department !== "All" && department !== "undefined" && department !== "null") {
            const matchingUsers = await User.find({
                role: "student",
                department: new RegExp(department, "i"),
            }).select("_id");
            filter.student = { $in: matchingUsers.map((u) => u._id) };
        }

        const attempts = await Attempt.find(filter)
            .sort({ createdAt: -1 })
            .limit(1000)
            .populate("student", "name email studentId department graduationYear")
            .populate("mockTest", "title category")
            .lean();

        // CSV Header compliant with RFC 4180
        const headers = [
            "Attempt ID",
            "Student Name",
            "Student Email",
            "Student ID",
            "Department",
            "Graduation Year",
            "Mock Test Title",
            "Status",
            "Score",
            "Total Marks",
            "Accuracy (%)",
            "Result",
            "Time Spent (Seconds)",
            "Start Time",
            "Submission Time",
        ];

        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val);
            return `"${str.replace(/"/g, '""')}"`;
        };

        const rows = attempts.map((a) => [
            escapeCsv(a._id),
            escapeCsv(a.student?.name || "N/A"),
            escapeCsv(a.student?.email || "N/A"),
            escapeCsv(a.student?.studentId || "N/A"),
            escapeCsv(a.student?.department || "N/A"),
            escapeCsv(a.student?.graduationYear || "N/A"),
            escapeCsv(a.title || a.mockTest?.title || "Mock Test"),
            escapeCsv(a.status),
            escapeCsv(a.score ?? 0),
            escapeCsv(a.totalMarks ?? 0),
            escapeCsv(a.accuracy ?? 0),
            escapeCsv(a.result || "N/A"),
            escapeCsv(a.timeSpentSeconds || 0),
            escapeCsv(a.startTime ? new Date(a.startTime).toISOString() : ""),
            escapeCsv(a.endTime ? new Date(a.endTime).toISOString() : ""),
        ]);

        const csvContent = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="readyup_coordinator_report_${Date.now()}.csv"`
        );

        return res.send(csvContent);
    } catch (error) {
        console.error("exportResultsCsv error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to generate CSV export",
        });
    }
};

// ==========================================
// UNIFIED MOCK TEST CREATION & MANAGEMENT
// ==========================================

export const getCoordinatorDepartments = async (req, res) => {
    try {
        const dbDepts = await User.distinct("department", { isActive: true });
        const defaultDepts = [
            "Computer Science & Engineering",
            "Information Technology",
            "Electronics & Communication Engineering",
            "Electrical Engineering",
            "Mechanical Engineering",
            "Civil Engineering",
            "Computer Engineering",
            "Central Administration",
            "Training & Placement Cell",
        ];

        // Deduplicate and normalize
        const deptSet = new Set();
        defaultDepts.forEach((d) => deptSet.add(d.trim()));
        (dbDepts || []).forEach((d) => {
            if (d && typeof d === "string" && d.trim()) {
                deptSet.add(d.trim());
            }
        });

        const sortedDepts = Array.from(deptSet).sort((a, b) => a.localeCompare(b));
        const finalDepts = [
            "All Departments",
            ...sortedDepts.filter((d) => d.toLowerCase() !== "all departments" && d.toLowerCase() !== "all"),
        ];

        return res.json({
            success: true,
            message: "Departments retrieved successfully",
            data: finalDepts,
        });
    } catch (error) {
        console.error("getCoordinatorDepartments error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve departments",
        });
    }
};

export const createMockTest = async (req, res) => {
    try {
        const {
            title,
            description = "",
            category = "Mixed Aptitude",
            company = "General",
            type = "company_mock",
            durationMinutes = 60,
            passingScore = 60,
            assignedDepartments = [],
            assignedBatches = [],
            startDate = null,
            endDate = null,
            isScheduled = false,
            status = "published",
            questions = [],
            questionIds = [],
            manualQuestions = [],
            csvQuestions = [],
            saveQuestionsToBank = true,
        } = req.body;

        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Test title is required.",
            });
        }

        const trimmedTitle = title.trim();

        const effectiveStartDate = startDate || req.body.startTime || null;
        const effectiveEndDate = endDate || req.body.deadline || null;

        // Validate schedule dates
        if (effectiveStartDate && effectiveEndDate && new Date(effectiveStartDate) > new Date(effectiveEndDate)) {
            return res.status(400).json({
                success: false,
                message: "Start date must be before or equal to deadline (end date).",
            });
        }

        // Consolidate all question inputs (consolidated wizard array or separated arrays)
        const rawQuestionsList = [];
        if (Array.isArray(questions) && questions.length > 0) {
            rawQuestionsList.push(...questions);
        }
        if (Array.isArray(questionIds) && questionIds.length > 0) {
            rawQuestionsList.push(...questionIds);
        }
        if (Array.isArray(manualQuestions) && manualQuestions.length > 0) {
            rawQuestionsList.push(...manualQuestions);
        }
        if (Array.isArray(csvQuestions) && csvQuestions.length > 0) {
            rawQuestionsList.push(...csvQuestions);
        }

        const isDraft = status === "draft";
        if (rawQuestionsList.length === 0 && !isDraft) {
            return res.status(400).json({
                success: false,
                message: "A mock test must contain at least 1 valid question.",
            });
        }

        // Process questions: can be an array of Question ObjectIds (string or ObjectId)
        // or question objects { questionText, options, correctOption, explanation, ... }
        const resolvedQuestionIds = [];
        const seenQuestionIds = new Set();
        let totalCalculatedMarks = 0;

        for (let i = 0; i < rawQuestionsList.length; i++) {
            const item = rawQuestionsList[i];

            // Case 1: ID reference to existing Question
            if (typeof item === "string" || (item && item._id && !item.questionText)) {
                const qId = typeof item === "string" ? item : item._id;
                if (!mongoose.Types.ObjectId.isValid(qId)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid question ID at position ${i + 1}: ${qId}`,
                    });
                }
                const existingQ = await Question.findById(qId);
                if (!existingQ) {
                    return res.status(404).json({
                        success: false,
                        message: `Question not found in repository: ${qId}`,
                    });
                }

                const strId = String(existingQ._id);
                if (seenQuestionIds.has(strId)) {
                    return res.status(400).json({
                        success: false,
                        message: `Duplicate question detected in test blueprint: "${existingQ.questionText.slice(0, 40)}..."`,
                    });
                }
                seenQuestionIds.add(strId);
                resolvedQuestionIds.push(existingQ._id);
                totalCalculatedMarks += (item.marks ? Number(item.marks) : 1);
            } else if (typeof item === "object" && item !== null) {
                // Case 2: New question object (from Manual Entry or CSV Upload)
                const qText = (item.questionText || item.question || "").trim();
                if (!qText) {
                    return res.status(400).json({
                        success: false,
                        message: `Question text is required for question #${i + 1}`,
                    });
                }

                const rawOptions = item.options || [];
                let formattedOptions = [];
                if (Array.isArray(rawOptions) && rawOptions.length >= 2) {
                    formattedOptions = rawOptions.map((opt, oIdx) => {
                        const optLetter = String.fromCharCode(65 + oIdx);
                        const optText = typeof opt === "object" ? (opt.text || opt.optionText || "") : String(opt);
                        const optId = typeof opt === "object" && opt.optionId ? opt.optionId.toUpperCase() : optLetter;
                        return { optionId: optId, text: String(optText).trim() };
                    });
                } else if (item.optionA && item.optionB) {
                    formattedOptions = [
                        { optionId: "A", text: String(item.optionA).trim() },
                        { optionId: "B", text: String(item.optionB).trim() },
                    ];
                    if (item.optionC) formattedOptions.push({ optionId: "C", text: String(item.optionC).trim() });
                    if (item.optionD) formattedOptions.push({ optionId: "D", text: String(item.optionD).trim() });
                }

                if (formattedOptions.length < 2) {
                    return res.status(400).json({
                        success: false,
                        message: `Question #${i + 1} must have at least 2 options.`,
                    });
                }

                const correct = (item.correctOption || item.answer || "A").trim().toUpperCase();
                const validOptionIds = formattedOptions.map((o) => o.optionId);
                if (!validOptionIds.includes(correct)) {
                    return res.status(400).json({
                        success: false,
                        message: `Question #${i + 1} has invalid correctOption '${correct}'. Options are: ${validOptionIds.join(", ")}`,
                    });
                }

                // Check if existing question by questionId or duplicate
                let questionDoc = null;
                const candidateQuestionId = (item.questionId || `Q-${Date.now().toString(36)}-${i + 1}`).trim().toUpperCase();

                // If this question already has an existing ID or exists in DB
                if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
                    questionDoc = await Question.findById(item._id);
                } else if (candidateQuestionId) {
                    questionDoc = await Question.findOne({ questionId: candidateQuestionId });
                }

                if (!questionDoc) {
                    // Create new Question record in MongoDB
                    questionDoc = await Question.create({
                        questionId: candidateQuestionId,
                        questionText: qText,
                        options: formattedOptions,
                        correctOption: correct,
                        explanation: (item.explanation || "").trim(),
                        category: item.category || category || "Quantitative Aptitude",
                        topic: item.topic || "General",
                        subtopic: item.subtopic || "",
                        difficulty: ["easy", "medium", "hard"].includes((item.difficulty || "").toLowerCase())
                            ? item.difficulty.toLowerCase()
                            : "medium",
                        companies: item.companies
                            ? (Array.isArray(item.companies) ? item.companies : String(item.companies).split(",").map((c) => c.trim()).filter(Boolean))
                            : (company && company !== "General" ? [company] : []),
                        source: item.source || (item.questionSource === "csv" ? "CSV Upload" : "Coordinator Manual Entry"),
                        year: item.year ? Number(item.year) : new Date().getFullYear(),
                        isVerified: true,
                        isActive: saveQuestionsToBank !== false,
                    });
                }

                const strId = String(questionDoc._id);
                if (seenQuestionIds.has(strId)) {
                    return res.status(400).json({
                        success: false,
                        message: `Duplicate question detected in test blueprint: "${qText.slice(0, 40)}..."`,
                    });
                }
                seenQuestionIds.add(strId);
                resolvedQuestionIds.push(questionDoc._id);
                totalCalculatedMarks += (item.marks ? Number(item.marks) : 1);
            }
        }

        // Generate clean unique slug
        const baseSlug = trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        let slug = baseSlug;
        const slugExists = await MockTest.findOne({ slug });
        if (slugExists) {
            slug = `${baseSlug}-${Date.now().toString(36)}`;
        }

        // Normalize departments
        const mergedDepts = Array.from(new Set([
            ...(Array.isArray(assignedDepartments) ? assignedDepartments : []),
            ...(Array.isArray(assignedBatches) ? assignedBatches : []),
        ].map((d) => String(d).trim()).filter(Boolean)));

        const newTest = await MockTest.create({
            title: trimmedTitle,
            slug,
            description: (description || "").trim(),
            category: category || "Mixed Aptitude",
            company: (company || "General").trim(),
            type: ["company", "company_mock", "grand", "topic", "topic_test", "diagnostic"].includes(type)
                ? type
                : (company && company !== "General" ? "company_mock" : "topic_test"),
            durationMinutes: Number(durationMinutes) || 30,
            totalQuestions: resolvedQuestionIds.length,
            totalMarks: req.body.totalMarks ? Number(req.body.totalMarks) : (totalCalculatedMarks || resolvedQuestionIds.length),
            passingScore: Number(passingScore) || 60,
            questions: resolvedQuestionIds,
            assignedDepartments: mergedDepts,
            assignedBatches: mergedDepts,
            startDate: effectiveStartDate ? new Date(effectiveStartDate) : null,
            endDate: effectiveEndDate ? new Date(effectiveEndDate) : null,
            startTime: effectiveStartDate ? new Date(effectiveStartDate) : null,
            deadline: effectiveEndDate ? new Date(effectiveEndDate) : null,
            isScheduled: Boolean(isScheduled),
            status: ["draft", "preview", "published", "archived"].includes(status) ? status : "published",
            isActive: status !== "archived",
            createdBy: req.user._id,
        });

        await logAuditEvent({
            action: "MOCK_TEST_CREATE",
            user: req.user,
            targetType: "TEST",
            targetId: newTest._id,
            details: `Coordinator created mock test '${newTest.title}' with ${resolvedQuestionIds.length} questions (Status: ${newTest.status}, Departments: ${mergedDepts.join(", ") || "All"})`,
            ipAddress: req.ip,
        });

        if (newTest.status === "published") {
            await notifyEligibleStudentsOnTestPublish(newTest);
        }

        return res.status(201).json({
            success: true,
            message: `Mock test '${newTest.title}' created successfully!`,
            data: newTest,
        });
    } catch (error) {
        console.error("createMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: `Failed to create mock test: ${error.message}`,
        });
    }
};

export const updateMockTest = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }
        const test = await MockTest.findById(id);
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        const {
            title,
            description,
            category,
            company,
            durationMinutes,
            passingScore,
            assignedDepartments,
            assignedBatches,
            startDate,
            endDate,
            isScheduled,
            status,
            questions,
        } = req.body;

        if (title !== undefined) test.title = String(title).trim();
        if (description !== undefined) test.description = String(description).trim();
        if (category !== undefined) test.category = category;
        if (company !== undefined) test.company = company;
        if (durationMinutes !== undefined) test.durationMinutes = Number(durationMinutes);
        if (passingScore !== undefined) test.passingScore = Number(passingScore);
        if (req.body.totalMarks !== undefined) test.totalMarks = Number(req.body.totalMarks);
        if (req.body.instructions !== undefined) {
            test.instructions = Array.isArray(req.body.instructions) ? req.body.instructions : [req.body.instructions];
        }

        if (assignedDepartments !== undefined || assignedBatches !== undefined) {
            const mergedDepts = Array.from(new Set([
                ...(Array.isArray(assignedDepartments) ? assignedDepartments : (test.assignedDepartments || [])),
                ...(Array.isArray(assignedBatches) ? assignedBatches : (test.assignedBatches || [])),
            ].map((d) => String(d).trim()).filter(Boolean)));
            test.assignedDepartments = mergedDepts;
            test.assignedBatches = mergedDepts;
        }

        const reqStart = startDate !== undefined ? startDate : req.body.startTime;
        const reqEnd = endDate !== undefined ? endDate : req.body.deadline;
        if (reqStart !== undefined) {
            test.startDate = reqStart ? new Date(reqStart) : null;
            test.startTime = test.startDate;
        }
        if (reqEnd !== undefined) {
            test.endDate = reqEnd ? new Date(reqEnd) : null;
            test.deadline = test.endDate;
        }
        if (isScheduled !== undefined) test.isScheduled = Boolean(isScheduled);
        const wasPublished = test.status === "published";
        if (status !== undefined) {
            test.status = status;
            test.isActive = status !== "archived";
        }

        const effectiveStart = test.startDate || test.startTime;
        const effectiveEnd = test.endDate || test.deadline;
        if (effectiveStart && effectiveEnd && new Date(effectiveStart) > new Date(effectiveEnd)) {
            return res.status(400).json({
                success: false,
                message: "Start date must be before or equal to deadline (end date).",
            });
        }

        // Process updated questions (supports ObjectId strings, questionBankIds, manual, and CSV question objects)
        const rawQuestionsList = [
            ...(Array.isArray(questions) ? questions : []),
            ...(Array.isArray(req.body.csvQuestions) ? req.body.csvQuestions : []),
            ...(Array.isArray(req.body.manualQuestions) ? req.body.manualQuestions : []),
            ...(Array.isArray(req.body.questionBankIds) ? req.body.questionBankIds : []),
        ];

        if (rawQuestionsList.length > 0) {
            const resolvedQuestionIds = [];
            const seenQuestionIds = new Set();
            let totalCalculatedMarks = 0;

            for (let i = 0; i < rawQuestionsList.length; i++) {
                const item = rawQuestionsList[i];
                if (!item) continue;

                // Case 1: ID reference or ObjectId string
                if (typeof item === "string" || (item && item._id && !item.questionText)) {
                    const qId = typeof item === "string" ? item : item._id;
                    if (mongoose.Types.ObjectId.isValid(qId)) {
                        const strId = String(qId);
                        if (!seenQuestionIds.has(strId)) {
                            seenQuestionIds.add(strId);
                            resolvedQuestionIds.push(new mongoose.Types.ObjectId(strId));
                            totalCalculatedMarks += (item.marks ? Number(item.marks) : 1);
                        }
                    }
                } else if (typeof item === "object") {
                    // Case 2: Full question object (from manual entry, CSV, or loaded existing test)
                    const qText = (item.questionText || item.question || "").trim();
                    if (!qText) continue;

                    let questionDoc = null;
                    if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
                        questionDoc = await Question.findById(item._id);
                    }
                    if (!questionDoc && item.questionId) {
                        questionDoc = await Question.findOne({ questionId: String(item.questionId).trim().toUpperCase() });
                    }

                    if (!questionDoc) {
                        const rawOptions = item.options || [];
                        let formattedOptions = [];
                        if (Array.isArray(rawOptions) && rawOptions.length >= 2) {
                            formattedOptions = rawOptions.map((opt, oIdx) => {
                                const optLetter = String.fromCharCode(65 + oIdx);
                                const optText = typeof opt === "object" ? (opt.text || opt.optionText || "") : String(opt);
                                const optId = typeof opt === "object" && opt.optionId ? opt.optionId.toUpperCase() : optLetter;
                                return { optionId: optId, text: String(optText).trim() };
                            });
                        } else if (item.optionA && item.optionB) {
                            formattedOptions = [
                                { optionId: "A", text: String(item.optionA).trim() },
                                { optionId: "B", text: String(item.optionB).trim() },
                            ];
                            if (item.optionC) formattedOptions.push({ optionId: "C", text: String(item.optionC).trim() });
                            if (item.optionD) formattedOptions.push({ optionId: "D", text: String(item.optionD).trim() });
                        }

                        const correct = (item.correctOption || item.answer || "A").trim().toUpperCase();
                        questionDoc = await Question.create({
                            questionId: (item.questionId || `Q-${Date.now().toString(36)}-${i + 1}`).trim().toUpperCase(),
                            questionText: qText,
                            options: formattedOptions,
                            correctOption: correct,
                            explanation: (item.explanation || "").trim(),
                            category: item.category || test.category || "Quantitative Aptitude",
                            topic: item.topic || "General",
                            subtopic: item.subtopic || "",
                            difficulty: ["easy", "medium", "hard"].includes((item.difficulty || "").toLowerCase()) ? item.difficulty.toLowerCase() : "medium",
                            companies: test.company && test.company !== "General" ? [test.company] : [],
                            source: item.source || "Coordinator Manual Entry",
                            year: new Date().getFullYear(),
                            isVerified: true,
                            isActive: true,
                        });
                    }

                    const strId = String(questionDoc._id);
                    if (!seenQuestionIds.has(strId)) {
                        seenQuestionIds.add(strId);
                        resolvedQuestionIds.push(questionDoc._id);
                        totalCalculatedMarks += (item.marks ? Number(item.marks) : 1);
                    }
                }
            }

            if (resolvedQuestionIds.length > 0) {
                test.questions = resolvedQuestionIds;
                test.totalQuestions = resolvedQuestionIds.length;
                test.totalMarks = req.body.totalMarks ? Number(req.body.totalMarks) : (totalCalculatedMarks || resolvedQuestionIds.length);
            }
        }

        // Validate question count if publishing
        if (test.status === "published") {
            const qCount = (test.questions && test.questions.length) || 0;
            if (qCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot publish: Assessment must contain at least 1 question.",
                });
            }
        }

        await test.save();

        if (test.status === "published" && !wasPublished) {
            await notifyEligibleStudentsOnTestPublish(test);
        }

        await logAuditEvent({
            action: "MOCK_TEST_UPDATE",
            user: req.user,
            targetType: "TEST",
            targetId: test._id,
            details: `Coordinator updated mock test '${test.title}' (Status: ${test.status})`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: "Mock test updated successfully",
            data: test,
        });
    } catch (error) {
        console.error("updateMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: `Failed to update mock test: ${error.message}`,
        });
    }
};

export const archiveMockTest = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }
        const test = await MockTest.findById(id);
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        // Count historical attempts
        const attemptsCount = await Attempt.countDocuments({ mockTest: test._id });

        // Safe soft-delete / archive
        test.isActive = false;
        test.status = "archived";
        await test.save();

        await logAuditEvent({
            action: "MOCK_TEST_ARCHIVE",
            user: req.user,
            targetType: "TEST",
            targetId: test._id,
            details: `Coordinator safely archived mock test '${test.title}' with ${attemptsCount} historical attempts preserved.`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: `Mock test '${test.title}' safely archived. ${attemptsCount} student attempt records preserved.`,
            data: {
                testId: test._id,
                title: test.title,
                status: "archived",
                isActive: false,
                attemptsPreserved: attemptsCount,
            },
        });
    } catch (error) {
        console.error("archiveMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: `Failed to archive mock test: ${error.message}`,
        });
    }
};

