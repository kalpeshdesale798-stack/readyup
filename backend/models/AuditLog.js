import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        performedBy: {
            type: String,
            required: true,
            trim: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        targetType: {
            type: String,
            enum: ["AUTH", "USER", "QUESTION", "TEST", "IMPORT"],
            default: "USER",
            index: true,
        },
        targetId: {
            type: String,
            default: "",
        },
        details: {
            type: String,
            default: "",
        },
        ipAddress: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
