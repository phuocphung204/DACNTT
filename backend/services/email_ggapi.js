// gmail.service.js
import { google } from "googleapis";
import { simpleParser } from "mailparser";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL_LINK
);

// oauth2Client.on('tokens', (tokens) => {
//   if (tokens.refresh_token) {
//     console.log("⚠️ Google trả refresh_token mới → BỎ QUA, KHÔNG GHI ĐÈ!");
//     // KHÔNG làm gì cả — không overwrite .env
//   }
//   if (tokens.access_token) {
//     console.log("Google cấp access_token mới → OK");
//     // Quan trọng: KHÔNG setCredentials lại để tránh merge sai
//   }
// });

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

export async function initGmailWatcher() {
  // Đăng ký Pub/Sub watch
  await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: `projects/${process.env.PROJECT_ID}/topics/${process.env.TOPIC_NAME}`,
    },
  });

  // console.log("Gmail watcher initialized");
}

const processedMessageIds = new Set();

export const readUnreadEmails = async (req, res) => {
  try {
    const results = [];
    // Set lưu messageId đã xử lý

    const unreadMessages = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread from:(@gmail.com OR @student.tdtu.edu.vn)",
    });

    if (!unreadMessages.data.messages) return results;

    for (const msg of unreadMessages.data.messages) {
      if (processedMessageIds.has(msg.id)) continue;

      const data = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "raw",
      });

      const raw = Buffer.from(data.data.raw, "base64");
      const parsed = await simpleParser(raw);

      const from = parsed.from?.value?.[0];
      const senderName = from.name;
      const senderEmail = from.address;
      const student_id = senderEmail.split("@")[0];

      // Gọi API nội bộ để tạo request
      const resquest = await axios.post(`http://localhost:${process.env.PORT}/api/requests`, {
        student_email: senderEmail,
        subject: parsed.subject,
        content: parsed.text,
        student_id
      });

      const request_id = resquest.data.dt._id;
      const attachments = parsed.attachments;
      // Gửi attachments sang API
      if (attachments?.length > 0) {
        // console.log(`Uploading ${attachments.length} attachments for request ${request_id}`);
        for (const att of attachments) {
          // console.log("Uploading attachment:", att.filename);
          try {
            const form = new FormData();
            form.append("attachment", att.content, {
              filename: att.filename || "file.bin",
              contentType: att.contentType,
            });

            await axios.post(
              `http://localhost:${process.env.PORT}/api/requests/${request_id}/attachments`,
              form,
              { headers: form.getHeaders() }
            );
          } catch (err) {
            console.error("Failed to upload attachment", att.filename, err.message);
          }
        }
      }

      // Đánh dấu đã đọc
      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id,
        requestBody: { removeLabelIds: ["UNREAD"] }
      });
      // console.log("Messeage id:", msg.id, "marked as read.");
      // Thêm vào set đã xử lý
      processedMessageIds.add(msg.id);
      results.push(resquest.data);
    }
    // console.log(`Emails processed`);
    res.status(200).json({ ec: 200, em: "Emails processed", dt: results });

  } catch (error) {
    res.status(500).json({ ec: 500, em: error.message });
  }
};
