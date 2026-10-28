
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

// Validate required environment variables
const validateEnv = () => {
    const required = ["MONGO_URI", "JWT_SECRET"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.error(
            `[FATAL CONFIG ERROR] Missing required environment variables: ${missing.join(", ")}`
        );
        process.exit(1);
    }
};

validateEnv();

const app = express();

// Trust proxy when running behind a hosting provider such as Render
app.set("trust proxy", 1);

// Security headers
app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
    })
);

// CORS configuration
// Configure CLIENT_ORIGIN in Render with your Vercel frontend URL.
const configuredOrigins = (
    process.env.CLIENT_ORIGIN ||
    "http://localhost:5173,http://localhost:5174,http://localhost:3000,https://readyup-six.vercel.app"
)
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        // Requests without an Origin header (e.g. curl or server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/+$/, "");

        if (allowedOrigins.has(normalizedOrigin)) {
            return callback(null, true);
        }

        console.warn(`CORS blocked origin: ${origin}`);
        return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
};

// Register CORS before routes so browser preflight requests are handled.
app.use(cors(corsOptions));

// Request parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Root route
app.get("/", (req, res) => {
    res.status(200).send("ReadyUp backend is running!");
});

// Health checks
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

// API V1 routes
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found on this server.`,
    });
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err.message);

    if (res.headersSent) {
        return next(err);
    }

    const status = err.status || 500;
    const isProduction = process.env.NODE_ENV === "production";

    res.status(status).json({
        success: false,
        message:
            isProduction && status === 500
                ? "An internal server error occurred. Please contact the administrator."
                : err.message || "Internal server error occurred.",
        errors: err.errors || [],
    });
});

let serverInstance = null;
let shuttingDown = false;

// Start server after database connection
const startServer = async () => {
    try {
        await connectDB();

        const PORT = process.env.PORT || 5000;

        serverInstance = app.listen(PORT, () => {
            console.log(`ReadyUp server running on port ${PORT}`);
            console.log("Allowed frontend origins:", [...allowedOrigins]);
        });
    } catch (error) {
        console.error("Failed to start ReadyUp server:", error.message);
        process.exit(1);
    }
};

// Graceful shutdown
const handleShutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(
        `\nReceived ${signal}. Gracefully shutting down ReadyUp server...`
    );

    try {
        if (serverInstance) {
            await new Promise((resolve, reject) => {
                serverInstance.close((error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            console.log("HTTP server closed.");
        }

        await mongoose.connection.close();
        console.log("MongoDB connection closed cleanly.");
        process.exit(0);
    } catch (error) {
        console.error("Error during shutdown:", error.message);
        process.exit(1);
    }
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// Start server outside test environment
if (process.env.NODE_ENV !== "test") {
    startServer();
}

export default app;
