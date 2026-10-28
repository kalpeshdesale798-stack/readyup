import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import bookmarkRoutes from "./routes/bookmarkRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import coordinatorRoutes from "./routes/coordinatorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";

dotenv.config();

// Validate required environment variables at startup safely
const validateEnv = () => {
    const required = ["MONGO_URI", "JWT_SECRET"];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error(
            `[FATAL CONFIG ERROR] Missing required environment variables: ${missing.join(", ")}. Please configure backend/.env before running.`
        );
        process.exit(1);
    }
};

validateEnv();

const app = express();

// Security headers
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// Dynamic CORS configuration
const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (such as mobile apps, Postman, curl, or server-to-server)
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
                callback(null, true);
            } else if (process.env.NODE_ENV !== "production") {
                callback(null, true); // Permissive for local college development
            } else {
                callback(new Error(`CORS policy rejection: Origin ${origin} is not authorized.`));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// System Health Checks
app.get("/", (req, res) => {
    res.send("ReadyUp backend is running!");
});

const healthPayload = () => ({
    status: "healthy",
    service: "ReadyUp Aptitude Backend API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
});

app.get("/health", (req, res) => {
    res.status(200).json(healthPayload());
});

app.get("/api/health", (req, res) => {
    res.status(200).json(healthPayload());
});

app.get("/api/v1/health", (req, res) => {
    res.status(200).json(healthPayload());
});

// Main API V1 Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/bookmarks", bookmarkRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/coordinator", coordinatorRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/search", searchRoutes);

// 404 Route Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found on this server.`,
    });
});

// Centralized Error Handler (prevents leaking internal details in production)
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err.message);
    const status = err.status || 500;
    const isProd = process.env.NODE_ENV === "production";
    res.status(status).json({
        success: false,
        message: isProd && status === 500
            ? "An internal server error occurred. Please contact the administrator."
            : err.message || "Internal server error occurred.",
        errors: err.errors || [],
    });
});

let serverInstance = null;

const startServer = async () => {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    serverInstance = app.listen(PORT, () => {
        console.log(`ReadyUp server running on port ${PORT}`);
    });

    // Graceful shutdown
    const handleShutdown = async (signal) => {
        console.log(`\nReceived ${signal}. Gracefully shutting down ReadyUp server...`);
        if (serverInstance) {
            serverInstance.close(() => {
                console.log("HTTP server closed.");
            });
        }
        try {
            await mongoose.connection.close();
            console.log("MongoDB connection closed cleanly.");
            process.exit(0);
        } catch (closeErr) {
            console.error("Error closing MongoDB connection:", closeErr.message);
            process.exit(1);
        }
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
};

// Start server when run directly
if (process.env.NODE_ENV !== "test") {
    startServer();
}

export default app;
