import { google } from "googleapis";
import { PubSub } from "@google-cloud/pubsub";
import Account from "../models/Account.js";
import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config();

const {
  SANG_CLIENT_ID,
  SANG_CLIENT_SECRET,
  SANG_REDIRECT_URI,
  GOOGLE_APPLICATION_CREDENTIALS,
} = process.env;

if (!SANG_CLIENT_ID || !SANG_CLIENT_SECRET || !SANG_REDIRECT_URI) {
  throw new Error("Missing SANG_CLIENT_ID/SANG_CLIENT_SECRET/SANG_REDIRECT_URI for Gmail OAuth.");
}

if (!GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON).");
}

const serviceAccount = JSON.parse(fs.readFileSync(GOOGLE_APPLICATION_CREDENTIALS, "utf8"));

export const oauth2ClientSang = new google.auth.OAuth2(SANG_CLIENT_ID, SANG_CLIENT_SECRET, SANG_REDIRECT_URI);

export const createAuthClient = (refreshToken) => {
  const client = new google.auth.OAuth2(SANG_CLIENT_ID, SANG_CLIENT_SECRET, SANG_REDIRECT_URI);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
};

// Hàm này gọi khi User vừa Login xong (có token)
export const startWatching = async (authClient) => {
  const gmail = google.gmail({ version: "v1", auth: authClient });

  try {
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        // Thay bằng tên Topic đầy đủ của bạn
        topicName: "projects/myweb-nodejs/topics/gmail-chat",
        labelIds: ["INBOX"] // Chỉ theo dõi Inbox
      }
    });
    console.log("Đã đăng ký watch thành công, hạn dùng 7 ngày:", res.data);
    return res.data;
  } catch (error) {
    console.error("Lỗi khi watch:", error);
    return null;
  }
}

// Đường dẫn đến file json tải ở Bước 2
const pubSubClient = new PubSub({
  projectId: serviceAccount.project_id,
  credentials: serviceAccount,
});

const subscriptionName = "projects/myweb-nodejs/subscriptions/gmail-chat-pull";
const subscription = pubSubClient.subscription(subscriptionName);

export const lastHistoryIds = {}; // Lưu historyId cuối cùng cho mỗi emailAddress

/**
 * Hàm giải mã nội dung body của email từ Base64
 * @param {object} payload - payload của message từ aPI messages.get
 * @returns {string} - Nội dung email đã giải mã
 */
const getEmailBody = (payload) => {
  let body = '';
  if (payload.parts) {
    const part = payload.parts.find(p => p.mimeType === 'text/plain') || payload.parts.find(p => p.mimeType === 'text/html');
    if (part && part.body && part.body.data) {
      body = Buffer.from(part.body.data, 'base64url').toString('utf8');
    }
  } else if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, 'base64url').toString('utf8');
  }
  return body;
}

/**
 * Hàm xử lý tin nhắn đến từ Pub/Sub
 * @param {object} message - Tin nhắn từ Pub/Sub
 */
const messageHandler = async (message) => {
  try {
    // Dữ liệu Pub/Sub gửi đến được mã hóa base64
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const userEmail = data.emailAddress;

    if (!userEmail) {
      console.error("Pub/Sub message is missing 'emailAddress'.");
      message.ack(); // Báo xử lý xong để không nhận lại tin nhắn này
      return;
    }

    console.log(`[Pub / Sub] Received notification for: ${userEmail}`);

    // ===== FIX LỖI "NO ACCESS TOKEN" =====
    // 1. Tìm tài khoản trong DB để lấy refresh_token và historyId
    const account = await Account.findOne({ "email": userEmail });

    const refreshToken = account?.google_info?.gmail_modify?.refresh_token;
    const lastHistoryId = account?.google_info?.watch_res?.historyId;

    if (!refreshToken || !lastHistoryId) {
      console.error(`Account not found, or missing refresh_token / historyId for ${userEmail}.`);
      message.ack();
      return;
    }

    // 2. Tạo auth client và nạp credentials cho đúng tài khoản này
    const authClient = createAuthClient(refreshToken);
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    // ===== FIX LỖI LOGIC HISTORY ID =====
    // 3. Gọi history.list với `startHistoryId` đã lưu từ lần trước
    const historyResponse = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: lastHistoryId,
    });

    const newHistoryId = historyResponse.data.historyId;

    // 4. Xử lý các thay đổi (nếu có)
    if (historyResponse.data.history) {
      console.log(`[Gmail API] Found ${`historyResponse.data.history.length`} history records for ${userEmail}.`);
      for (const historyItem of historyResponse.data.history) {
        if (historyItem.messagesAdded) {
          for (const addedMsg of historyItem.messagesAdded) {
            if (addedMsg.message && addedMsg.message.labelIds.includes('INBOX')) {
              const newMessageId = addedMsg.message.id;
              console.log(` -> New message [${newMessageId}] in INBOX. Fetching details...`);

              // Gọi messages.get để lấy nội dung chi tiết
              const messageResponse = await gmail.users.messages.get({
                userId: 'me',
                id: newMessageId,
                format: 'full',
              });

              const mail = messageResponse.data;
              const subject = mail.payload.headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
              const from = mail.payload.headers.find(h => h.name.toLowerCase() === 'from')?.value || 'No Sender';
              const body = getEmailBody(mail.payload);

              console.log(`   - From: ${from}`);
              console.log(`   - Subject: ${subject}`);
              console.log(`   - Body: ${body.substring(0, 100)}...`);

              // ==> TẠI ĐÂY, BẠN CÓ THỂ LƯU VÀO DB, GỬI NOTIFICATION, V.V...
            }
          }
        }
      }
    } else {
      console.log(`[Gmail API] No new history found for ${userEmail}.`);
    }

    // 5. Cập nhật historyId mới nhất vào DB để dùng cho lần gọi tiếp theo
    // if (account.google_info.watch_res.historyId !== newHistoryId) {
    //   account.google_info.watch_res.historyId = newHistoryId;
    //   await account.save();
    //   console.log(`[DB] Updated historyId to ${newHistoryId} for ${userEmail}.`);
    // }

    message.ack(); // Báo cho Pub/Sub đã xử lý xong
  } catch (error) {
    console.error("[CRITICAL] Error in messageHandler:", error);
    message.ack();
  }
};

// Đăng ký lắng nghe tin nhắn
export const startListening = () => {
  if (!subscriptionName) {
    console.error("GMAIL_PUBSUB_SUBSCRIPTION_NAME environment variable not set. Aborting.");
    return;
  }
  subscription.on('message', messageHandler);
  console.log(`[OK] Listening for Pub / Sub messages on subscription: "${subscriptionName}"...`);
}

export const listenForMessages = async () => {
  console.log("Đang lắng nghe tin nhắn...");

  subscription.on("message", async (message) => {
    try {
      // 1. Giải mã dữ liệu từ Pub/Sub
      const data = JSON.parse(message.data.toString());
      const emailAddress = data.emailAddress; // Email của người nhận (Officer)
      const historyId = data.historyId;

      console.log(`Có biến động tại hộp thư: ${emailAddress}`);

      // 2. Tìm User trong DB dựa vào emailAddress để lấy Refresh Token
      const account = await Account.findOne({ email: emailAddress });
      const authClient = createAuthClient(account.google_info.gmail_modify.refresh_token);

      // (Giả lập authClient đã có token để demo)
      const gmail = google.gmail({ version: "v1", auth: authClient });

      /* 3. GỌI API ĐỂ XEM AI GỬI MAIL?
        Vì Pub/Sub không gửi nội dung, ta phải dùng historyId để hỏi lại Gmail.
      */
      const history = await gmail.users.history.list({
        userId: "me",
        startHistoryId: historyId, // Mốc thời gian thay đổi
        historyTypes: ["messageAdded"]
      });
      console.log("Changes detected:", history);

      const changes = history.data.history;

      if (changes) {
        for (const change of changes) {
          if (change.messagesAdded) {
            for (const msg of change.messagesAdded) {
              // Lấy chi tiết mail để xem người gửi
              const mailDetail = await gmail.users.messages.get({
                userId: "me",
                id: msg.message.id
              });

              // Lấy Header để tìm người gửi
              const headers = mailDetail.data.payload.headers;
              const fromHeader = headers.find(h => h.name === "From");
              const sender = fromHeader ? fromHeader.value : "";

              console.log(`Mail mới từ: ${sender}`);

              // --- LOGIC QUAN TRỌNG: CHECK NGƯỜI GỬI CỤ THỂ ---
              if (sender.includes("boss@company.com")) {
                console.log("!!! BÁO ĐỘNG: Sếp gửi mail !!!");
                // Gọi Socket.io bắn về Frontend ngay lập tức
              }
            }
          }
        }
      }

      // 4. Xác nhận đã xử lý xong (để Google không gửi lại tin này nữa)
      message.ack();

    } catch (error) {
      console.error("Lỗi xử lý:", error);
      message.ack(); // Báo lỗi để Google gửi lại sau
    }
  });
}
