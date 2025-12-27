import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

import { handleLogin, resetPassword, handleResetPassword } from "../controllers/authController.js";
import { oauth2ClientSang } from "../services/gmail-chat.js";

const router = express.Router();

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post("/login", handleLogin); // đã check ok

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post("/reset-password", resetPassword); // đã check ok

// @desc    Reset password
// @route   POST /api/auth/reset-password/confirm
// @access  Public
router.post("/reset-password/confirm", handleResetPassword); // đã check ok

// OAuth2 setup for Google
// Lấy GMAIL_REFRESH_TOKEN

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL_LINK
);

router.get("/link/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.modify"],
    prompt: "consent"
  });
  // console.log("Open this URL in browser to authorize:", url);
  res.redirect(url);
});

router.get("/link/sang/google", (req, res) => {
  const url = oauth2ClientSang.generateAuthUrl({
    access_type: "offline",
    scope: [
      // 1. Quyền để lấy thông tin cơ bản (Bắt buộc để biết user là ai)
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",

      // 2. Quyền để Gửi email (Theo yêu cầu của bạn)
      "https://www.googleapis.com/auth/gmail.send",

      // 3. Quyền để đăng ký Watch & Đọc nội dung mail mới
      // Bạn cần quyền đọc để:
      // a) Gọi hàm watch() thành công.
      // b) Khi Pub/Sub báo về, bạn phải có quyền này mới đọc được nội dung mail đó là gì.
      "https://www.googleapis.com/auth/gmail.readonly",

      // 4. Quyền để Sửa đổi nhãn (Gỡ nhãn UNREAD) - QUAN TRỌNG ĐỂ FIX LỖI 403
      "https://www.googleapis.com/auth/gmail.modify"
    ],
    prompt: "consent",
    include_granted_scopes: true
  });
  // console.log("Open this URL in browser to authorize:", url);
  res.redirect(url);
});

router.get("/google-link-account/callback", async (req, res) => {
  try {
    if (req.query.error) return res.status(400).send(`OAuth error: ${req.query.error}`);
    const code = req.query.code;
    if (!code) return res.status(400).send("No code returned from Google");
    const { tokens } = await oauth2Client.getToken(code);
    // console.log("Refresh Tokens", tokens.refresh_token);
    return res.json({
      message: "Lấy token xong — copy refresh_token vào .env GMAIL_REFRESH_TOKEN",
      refresh_token: tokens.refresh_token,
      tokens
    });
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(500).send("Callback processing error: " + err.message);
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    if (req.query.error) return res.status(400).send(`OAuth error: ${req.query.error}`);
    const code = req.query.code;
    if (!code) return res.status(400).send("No code returned from Google");
    const data = await oauth2ClientSang.getToken(code);
    const { tokens } = data;
    // console.log("Refresh Tokens", tokens.refresh_token);
    return res.json({
      message: "Lấy token xong — copy refresh_token vào .env GMAIL_REFRESH_TOKEN",
      refresh_token: tokens.refresh_token,
      tokens,
      data
    });
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(500).send("Callback processing error: " + err.message);
  }
});

export default router;