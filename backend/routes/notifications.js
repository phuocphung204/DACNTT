import express from "express";

import { protect } from "../middlewares/auth.js";
import {
  deleteNotification,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  getUnreadNotificationsCount
} from "../controllers/notification-controller.js";

const router = express.Router();

// @route   GET /api/notifications/unread-count
// @access  Private
router.get("/unread-count", protect, getUnreadNotificationsCount);

// @route   GET /api/notifications/my-notifications?cursor=<id>&limit=<number>
// @access  Private
router.get("/my-notifications", protect, getMyNotifications);

// @route   PATCH /api/notifications/:id/read
// @access  Private
router.patch("/:id/read", protect, markNotificationAsRead);

// @route   PATCH /api/notifications/read-all
// @access  Private
router.patch("/read-all", protect, markAllNotificationsAsRead);

// @route   DELETE /api/notifications/:id
// @access  Private
router.delete("/:id", protect, deleteNotification);

export default router;
