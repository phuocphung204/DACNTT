import express from "express";

import {
  getConversation,
  replyToStudent,
  sendMailToStudent,
} from "../controllers/request-conversation-controller.js";
import { officer, protect, staff_or_officer } from "../middlewares/auth.js";

const router = express.Router();

// Lấy nội dung hội thoại
router.get("/:requestId/conversation", protect, staff_or_officer, getConversation);

// Gửi mail cho sinh viên
router.post("/:requestId/send-mail", protect, officer, sendMailToStudent);

// Reply cho sinh viên 
router.post("/:requestId/reply", protect, officer, replyToStudent);

export default router;
