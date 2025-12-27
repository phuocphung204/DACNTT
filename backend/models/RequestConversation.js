import mongoose from "mongoose";
import { attachmentSchema } from "./Request.js";

const { Schema, model } = mongoose;

// Schema cho từng tin nhắn (Email hoặc Chat)
const messageSchema = new Schema(
  {
    channel: { type: String, enum: ["Email", "Chat", "System"], default: "Email" },
    sender_type: { type: String, enum: ["Student", "Officer"], required: true },
    sender_id: { type: Schema.Types.ObjectId, ref: "Account", default: null }, // Null nếu là Student gửi qua Email
    html_content: { type: String, default: "" },
    content: { type: String, required: true },
    attachments: [attachmentSchema],
    in_reply_to: { type: String, default: null }, // Tin nhắn này là reply của tin nhắn nào
    message_id: { type: String, default: null }, // Message-ID (Email Header) của tin nhắn này
    references: [{ type: String, default: null }], // Danh sách Message-ID (Email Header) để hỗ trợ threading
    google_message_id: { type: String, default: null }, // ID của mail trên Gmail để tránh trùng lặp
    created_at: { type: Date, default: Date.now }
  },
  { _id: true }
);

// Schema cho ghi chú nội bộ (Chỉ Officer thấy)
const noteSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    content: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
  },
  { _id: true }
);

const requestConversationSchema = new Schema(
  {
    request_id: { type: Schema.Types.ObjectId, ref: "Request", required: true, unique: true }, // 1 Request - 1 Conversation
    google_thread_id: { type: String, default: null, index: true }, // Dùng để map với Gmail Thread
    email_subject: { type: String, default: "" }, // Lưu tạm subject email để hiển thị
    messages: [messageSchema],
    internal_notes: [noteSchema]
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

// Index hỗ trợ tìm kiếm
requestConversationSchema.index({ request_id: 1 });
requestConversationSchema.index({ google_thread_id: 1 });

const RequestConversation = mongoose.models.RequestConversation || model("RequestConversation", requestConversationSchema);
export default RequestConversation;