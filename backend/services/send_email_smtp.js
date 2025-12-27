import dotenv from "dotenv";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { google } from "googleapis";
import { createAuthClient } from "./gmail-chat.js";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendMail = async ({ from, refreshToken, to, subject, text, html }) => {
  try {
    const oauth2Client = createAuthClient(refreshToken);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Cấu hình nội dung mail
    const mailOptions = {
      from: from,
      to: to,
      subject: subject,
      text: text,
      html: html,
    };
    const composer = new MailComposer(mailOptions);
    const compile = await composer.compile().build();

    // Mã hóa Base64URL (Yêu cầu bắt buộc của Gmail API)
    const rawParams = Buffer.from(compile)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 2. Gửi qua Gmail API trực tiếp
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawParams,
      },
    });

    console.log(`[Gmail API] Sent email to ${to} | ID: ${res.data.id}`);

    // 3. Lấy lại Message-ID thực tế từ Gmail (Vì Gmail có thể ghi đè ID tự tạo)
    const messageDetails = await gmail.users.messages.get({
      userId: "me",
      id: res.data.id,
      format: "metadata",
      metadataHeaders: ["Message-ID"],
    });
    const actualMessageId = messageDetails.data.payload.headers.find(
      (h) => h.name.toLowerCase() === "message-id"
    )?.value;

    return { ...res.data, messageId: actualMessageId };

  } catch (error) {
    console.error("[Gmail API] Send Error:", error.message);
    throw error;
  }
};

export const replyToMail = async ({
  from,
  refreshToken,
  to,
  subject,
  text,
  html,
  inReplyTo,
  references,
  threadId
}) => {
  try {
    const oauth2Client = createAuthClient(refreshToken);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // 1. Xử lý Subject: Đảm bảo có tiền tố "Re:"
    const formattedSubject = subject.toLowerCase().startsWith('re:')
      ? subject
      : `Re: ${subject}`;

    // 2. Cấu hình nội dung mail
    const mailOptions = {
      from: from,
      to: to,
      subject: formattedSubject,
      text: text,
      html: html,
      // Đưa các header kỹ thuật vào đây cho tường minh
      headers: {
        'In-Reply-To': inReplyTo,
        'References': references
      }
    };

    // Lưu ý: MailComposer của nodemailer xử lý tốt object headers
    const composer = new MailComposer(mailOptions);
    const compile = await composer.compile().build();

    // 3. Mã hóa Base64URL (Chuẩn)
    const rawParams = Buffer.from(compile)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const requestBody = {
      raw: rawParams,
    };

    // 4. Quan trọng: Gắn threadId để Gmail gom nhóm trong thư mục Sent của bạn
    if (threadId) {
      requestBody.threadId = threadId;
    }

    // 5. Gửi request
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: requestBody,
    });

    console.log(`[Gmail API] Reply sent to ${to} | ID: ${res.data.id} | Thread: ${res.data.threadId}`);

    // Lấy lại Message-ID thực tế từ Gmail
    const messageDetails = await gmail.users.messages.get({
      userId: "me",
      id: res.data.id,
      format: "metadata",
      metadataHeaders: ["Message-ID"],
    });
    const actualMessageId = messageDetails.data.payload.headers.find(
      (h) => h.name.toLowerCase() === "message-id"
    )?.value;

    return { ...res.data, messageId: actualMessageId };

  } catch (error) {
    console.error("[Gmail API] Reply Error:", error.message);
    // Có thể log thêm error.response.data để debug lỗi từ Google trả về
    if (error.response) {
      console.error("Google Error Details:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

export default transporter;