import { google } from "googleapis";
import { PubSub } from "@google-cloud/pubsub";
import Account from "../models/Account.js";
import RequestConversation from "../models/RequestConversation.js";
import Request from "../models/Request.js";
import { createNotification, sendNotification } from "../controllers/notification-controller.js";
import { NOTIFICATION_TYPES } from "../models/Notification.js";
import { SOCKET_EVENTS } from "../_variables.js";
import { socketStore } from "./socket.js";
import dotenv from "dotenv";
import serviceAccount from "./secret.json" with { type: "json" };
dotenv.config();

export const oauth2ClientSang = new google.auth.OAuth2(
  process.env.SANG_CLIENT_ID,
  process.env.SANG_CLIENT_SECRET,
  process.env.SANG_REDIRECT_URI
);

export const createAuthClient = (refreshToken) => {
  const client = new google.auth.OAuth2(process.env.SANG_CLIENT_ID, process.env.SANG_CLIENT_SECRET, process.env.SANG_REDIRECT_URI);
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

/**
 * Lấy giá trị từ Header dựa trên tên (không phân biệt hoa thường)
 */
const getHeader = (headers, name) => {
  if (!headers) return null;
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : null;
};

/**
 * Giải mã nội dung Base64Url của Gmail sang UTF-8 String
 */
const decodeBase64 = (data) => {
  if (!data) return '';
  // Chuyển đổi ký tự URL-safe về Base64 chuẩn
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
};

/**
 * Đệ quy tìm nội dung Body (Ưu tiên Plain text, nếu không có lấy HTML)
 */
const getBodyContent = (payload) => {
  let htmlContent = '';
  let plainContent = '';

  // Hàm đệ quy nội bộ
  const traverse = (p) => {
    // 1. Nếu tìm thấy body data trực tiếp
    if (p.mimeType === 'text/html' && p.body && p.body.data) {
      htmlContent = decodeBase64(p.body.data);
    }
    else if (p.mimeType === 'text/plain' && p.body && p.body.data) {
      plainContent = decodeBase64(p.body.data);
    }

    // 2. Nếu là multipart, duyệt tiếp các con
    if (p.parts) {
      p.parts.forEach(part => traverse(part));
    }
  };

  traverse(payload);

  // Ưu tiên trả về Plain text, nếu không có thì trả về HTML
  return plainContent || htmlContent || '';
};

/**
 * Đệ quy tìm tất cả file đính kèm
 */
const getAttachments = (payload) => {
  const attachments = [];

  const traverse = (p) => {
    // Điều kiện: Có filename và có body.attachmentId
    if (p.filename && p.filename.length > 0 && p.body && p.body.attachmentId) {
      attachments.push({
        filename: p.filename,
        mimeType: p.mimeType,
        size: p.body.size,
        attachmentId: p.body.attachmentId // ID này dùng để gọi API tải file sau này
      });
    }

    if (p.parts) {
      p.parts.forEach(part => traverse(part));
    }
  };

  traverse(payload);
  return attachments;
};

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
 * Loại bỏ phần trích dẫn (Reply history) để lấy nội dung mới nhất
 */
const stripQuotedText = (text) => {
  if (!text) return '';

  // Nếu text có vẻ là HTML phức tạp, trả về nguyên vẹn để tránh lỗi hiển thị
  if (text.includes('</html>') || text.includes('</body>')) return text;

  const lines = text.split(/\r?\n/);
  const cleanLines = [];

  // Regex nhận diện header quote phổ biến (On ... wrote, Vào ... viết, From: ...)
  const quoteHeaderRegex = /^(On\s.+?wrote:|Vào\s.+?viết:|From:\s.+|Sent:\s.+)$/i;

  for (const line of lines) {
    const trimmed = line.trim();

    // Dừng nếu gặp dấu hiệu quote (bắt đầu bằng > hoặc khớp header)
    if (trimmed.startsWith('>') ||
      quoteHeaderRegex.test(trimmed) ||
      trimmed.includes('-----Original Message-----') ||
      trimmed.startsWith('________________________________')) {
      break;
    }
    cleanLines.push(line);
  }
  return cleanLines.join('\n').trim();
};

/**
 * Map dữ liệu từ Gmail API sang Schema MongoDB của bạn
 * @param {Object} gmailMessage - Object trả về từ Google API
 * @returns {Object} Object sẵn sàng để save() vào MongoDB
 */
export const mapGmailToSchema = (gmailMessage) => {
  const payload = gmailMessage.payload;
  const headers = payload.headers;

  // 1. Xử lý References (String -> Array)
  // Header References thường có dạng: "<ID_1> <ID_2> <ID_3>"
  const referencesRaw = getHeader(headers, "References");
  const references = referencesRaw
    ? referencesRaw.split(/\s+/).map(s => s.trim()).filter(s => s.length > 0)
    : [];

  // 2. Map dữ liệu
  const mappedData = {
    // ID của Gmail (VD: 18e7...)
    google_message_id: gmailMessage.id,

    // Thời gian tạo (Chuyển từ timestamp string sang Date)
    created_at: new Date(parseInt(gmailMessage.internalDate)),

    // Message-ID chuẩn RFC (VD: <abc@gmail.com>)
    message_id: getHeader(headers, "Message-ID"),

    // ID của mail cha (VD: <parent@gmail.com>)
    // Vì schema in_reply_to của bạn là String, ta lưu thẳng giá trị header
    in_reply_to: getHeader(headers, "In-Reply-To"),

    // Danh sách các ID liên quan để threading
    references: references,

    // Nội dung thư (đã decode)
    content: stripQuotedText(getBodyContent(payload)),

    // Danh sách file đính kèm
    // attachments: getAttachments(payload) //TODO: Xử lý sau nếu cần
  };

  return mappedData;
}

export const messageIdProcessedSet = new Set();

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
    // const lastHistoryId = account?.google_info?.watch_res?.historyId;

    if (!refreshToken /* || !lastHistoryId */) {
      console.error(`Account not found, or missing refresh_token / historyId for ${userEmail}.`);
      message.ack();
      return;
    }

    // 2. Tạo auth client và nạp credentials cho đúng tài khoản này
    const authClient = createAuthClient(refreshToken);
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    // 3. Thay vì history.list, dùng messages.list để lọc trực tiếp tin nhắn chưa đọc từ domain cụ thể
    // Cách này ổn định hơn và tránh lỗi historyId quá hạn
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: "is:unread from:(@gmail.com OR @student.tdtu.edu.vn OR @roratu.com) subject:\"Phản hồi về yêu cầu:\""
    });

    const messages = listResponse.data.messages;

    // 4. Xử lý danh sách tin nhắn tìm được
    if (messages && messages.length > 0) {
      console.log(`[Gmail API] Found ${messages.length} unread messages matching criteria for ${userEmail}.`);
      for (const msg of messages) {
        const newMessageId = msg.id;
        if (messageIdProcessedSet.has(newMessageId)) continue; // Bỏ qua nếu đã xử lý rồi
        console.log(` -> Processing message [${newMessageId}]...`);

        // Gọi messages.get để lấy nội dung chi tiết
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: newMessageId,
          format: 'full',
        });

        const mail = messageResponse.data;
        const { from, body } = debug(mail);

        // 1. Tìm Conversation theo threadId
        const threadId = mail.threadId;
        const conversation = await RequestConversation.findOne({ google_thread_id: threadId });

        if (conversation) {
          // 2. Map dữ liệu và lưu vào DB
          const mappedMessage = mapGmailToSchema(mail);

          const newMessage = {
            channel: "Email",
            sender_type: "Student",
            sender_id: null,
            content: mappedMessage.content,
            attachments: [], // TODO: Xử lý upload file lên Supabase nếu cần
            message_id: mappedMessage.message_id,
            in_reply_to: mappedMessage.in_reply_to,
            references: mappedMessage.references,
            google_message_id: mappedMessage.google_message_id,
            created_at: mappedMessage.created_at
          };

          conversation.messages.push(newMessage);
          await conversation.save();
          console.log(`   -> Saved message to conversation ${conversation._id}`);

          // 3. Gửi thông báo cho Officer
          try {
            const io = socketStore.getIO();
            const roomName = SOCKET_EVENTS.IN_CHAT_REQUEST_PREFIX(conversation.request_id);

            // Kiểm tra xem có ai đang ở trong room chat của request này không
            const socketsInFocusRoom = await io.in(roomName).fetchSockets();

            if (socketsInFocusRoom.length > 0) {
              // Nếu có người đang xem, gửi sự kiện update chat realtime
              io.to(roomName).emit(SOCKET_EVENTS.NEW_CHAT_MESSAGE, newMessage);
              console.log(`   -> Emitted NEW_CHAT_MESSAGE to room ${roomName}`);
            } else {
              // Nếu không có ai xem, gửi Notification (chuông thông báo)
              const request = await Request.findById(conversation.request_id);
              if (request && request.assigned_to) {
                const sender = { user_id: null, name: from, avatar: null };
                const notification = await createNotification({
                  sender: sender,
                  recipient_id: request.assigned_to,
                  type: NOTIFICATION_TYPES.REQUEST_REPLY_STUDENT,
                  entity_id: request._id,
                  data: { request_subject: request.subject, message_preview: mappedMessage.content.substring(0, 50) }
                });
                await sendNotification(request.assigned_to, notification);
                console.log(`   -> Sent notification to officer ${request.assigned_to}`);
              }
            }
          } catch (err) {
            console.error("Error sending socket/notification:", err);
          }

          // 4. Đánh dấu đã đọc TODO: Triển khai sau mask as read
          await gmail.users.messages.modify({
            userId: 'me',
            id: newMessageId,
            requestBody: { removeLabelIds: ['UNREAD'] }
          });
          messageIdProcessedSet.add(newMessageId);
          console.log(`   -> Marked message ${newMessageId} as READ.`);
        } else {
          console.log(`   -> Conversation not found for threadId ${threadId}. Skipping save.`);
        }
      }
    } else {
      console.log(`[Gmail API] No unread messages found for ${userEmail}.`);
    }

    message.ack(); // Báo cho Pub/Sub đã xử lý xong
  } catch (error) {
    console.error("[CRITICAL] Error in messageHandler:", error);
    message.ack();
  }

  function debug(mail) {
    const headers = mail.payload.headers;
    const subject = getHeader(headers, "Subject") || "No Subject";
    const from = getHeader(headers, "From") || "No Sender";

    const body = getEmailBody(mail.payload);

    console.log(`   - From: ${from}`);
    console.log(`   - Subject: ${subject}`);
    console.log(`   - Body: ${body.substring(0, 100)}...`);
    return { from, body };
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
