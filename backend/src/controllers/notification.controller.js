import Notification from "../models/notification.model.js";

/**
 * GET MY NOTIFICATIONS
 */
export const getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
    
  res.json(notifications);
};

/**
 * MARK NOTIFICATION AS READ
 */
export const markAsRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  res.json(notification);
};

/**
 * DELETE NOTIFICATION
 */
export const deleteNotification = async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ message: "Notification deleted" });
};
