import AuditLog from "../models/AuditLog.js";

export const logAuditEvent = async ({
    action,
    user,
    targetType = "USER",
    targetId = "",
    details = "",
    ipAddress = "",
}) => {
    try {
        const performedBy = user ? `${user.name} (${user.email})` : "System";
        const userId = user?._id || null;

        await AuditLog.create({
            action,
            performedBy,
            userId,
            targetType,
            targetId: String(targetId),
            details,
            ipAddress,
        });
    } catch (err) {
        console.error("Failed to write audit log:", err.message);
    }
};
