import express from "express";
import { io } from "../server.js";

const router = express.Router();

/**
 *  url api: /api/notifications
 */

router.post('/send', (req, res) => {
  const { targetUserId, content } = req.body;

  // Giả lập lưu vào database...
  // const noti = await Notification.create(...)

  // 4. Gửi realtime đến đúng Room của user đó
  // .to() sẽ gửi tin nhắn đến tất cả các thiết bị (tab) mà user đó đang mở
  io.to(`notification_account_${targetUserId}`).emit('new_notification', {
    content: content,
    timestamp: new Date()
  });

  return res.json({ success: true, message: "Đã gửi thông báo" });
});

export default router;