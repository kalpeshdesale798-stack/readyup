import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(30),
            Notification.countDocuments({ user: userId, isRead: false }),
        ]);

        return res.json({
            success: true,
            message: "Notifications retrieved successfully",
            data: {
                notifications,
                unreadCount,
            },
        });
    } catch (error) {
        console.error("getNotifications error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve notifications",
        });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, user: userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found or unauthorized",
            });
        }

        const unreadCount = await Notification.countDocuments({
            user: userId,
            isRead: false,
        });

        return res.json({
            success: true,
            message: "Notification marked as read",
            data: {
                notification,
                unreadCount,
            },
        });
    } catch (error) {
        console.error("markAsRead error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
        });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { user: userId, isRead: false },
            { isRead: true }
        );

        return res.json({
            success: true,
            message: "All notifications marked as read",
            data: {
                unreadCount: 0,
            },
        });
    } catch (error) {
        console.error("markAllAsRead error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read",
        });
    }
};
