import mongoose from "mongoose";
import { socketStore } from "../services/socket.js";
import Notification from "../models/Notification.js";
import { SOCKET_EVENTS } from "../_variables.js";

export const createNotification = async ({ sender, recipient_id, type, entity_id, data }) => {
  // Tạo hoặc cập nhật thông báo
  const filter = {
    recipient_id: recipient_id,
    entity_id: entity_id,
    type: type,
    is_read: false
  };
  const update = {
    $inc: {
      action_count: 1
    },
    $setOnInsert: {
      recipient_id: recipient_id,
      entity_id: entity_id
    },
    $set: {
      type: type,
      is_read: false,
      data: data
    },
    $push: {
      senders: {
        $each: [sender],
        $position: 0,
        $slice: 5 // Giới hạn chỉ giữ 5 sender gần nhất
      }
    },
  };
  const notificationDoc = await Notification.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true, // Trả về document mới nhất sau khi update
    setDefaultsOnInsert: true
  });

  return notificationDoc;
}
export const countUnreadNotificationsForRecipient = async (recipient_id) => {
  const count = await Notification.countDocuments({
    recipient_id: recipient_id,
    is_read: false,
  });
  return count;
}

export const sendNotification = async (targetUserId, payload) => {
  const io = socketStore.getIO();
  const newPayload = {
    notification: payload,
    unread_count: await countUnreadNotificationsForRecipient(targetUserId)
  };
  io.to(`account_room_${targetUserId}`).emit(SOCKET_EVENTS.NEW_NOTIFICATION, newPayload);
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ec: 400, em: "Invalid notification id" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient_id: req.account._id },
      { $set: { is_read: true } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ ec: 404, em: "Notification not found" });
    }

    return res.status(200).json({ ec: 200, em: "Notification marked as read", dt: notification });
  } catch (error) {
    return res.status(500).json({ ec: 500, em: error.message });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient_id: req.account._id, is_read: false },
      { $set: { is_read: true } }
    );

    return res.status(200).json({
      ec: 200,
      em: "All notifications marked as read",
      dt: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    return res.status(500).json({ ec: 500, em: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ec: 400, em: "Invalid notification id" });
    }

    const deletion = await Notification.deleteOne({ _id: id, recipient_id: req.account._id });
    if (deletion.deletedCount === 0) {
      return res.status(404).json({ ec: 404, em: "Notification not found" });
    }

    return res.status(200).json({ ec: 200, em: "Notification deleted successfully" });
  } catch (error) {
    return res.status(500).json({ ec: 500, em: error.message });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const { cursor, limit = 10 } = req.query;
    const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 10, 50));

    const query = { recipient_id: req.account._id };
    if (cursor) {
      if (!mongoose.Types.ObjectId.isValid(cursor)) {
        return res.status(400).json({ ec: 400, em: "Invalid cursor" });
      }
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const notifications = await Notification.find(query)
      .sort({ _id: -1 })
      .limit(parsedLimit + 1)
      .lean();

    const has_next = notifications.length > parsedLimit;
    const sliced = has_next ? notifications.slice(0, parsedLimit) : notifications;
    const next_cursor = has_next ? sliced[sliced.length - 1]._id : null;

    return res.status(200).json({
      ec: 200,
      em: "Notifications retrieved successfully",
      dt: {
        notifications: sliced,
        next_cursor,
        has_next
      }
    });
  } catch (error) {
    return res.status(500).json({ ec: 500, em: error.message });
  }
};

export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const count = await countUnreadNotificationsForRecipient(req.account._id);

    return res.status(200).json({
      ec: 200,
      em: "Unread notifications count retrieved successfully",
      dt: { count }
    });
  } catch (error) {
    return res.status(500).json({ ec: 500, em: error.message });
  }
};

