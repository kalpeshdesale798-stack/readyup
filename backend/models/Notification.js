import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["info", "success", "warning", "reminder"],
            default: "info",
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        link: {
            type: String,
            default: "",
        },
        testId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MockTest",
            default: null,
            index: true,
        },
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
