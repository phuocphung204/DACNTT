import { Schema, model } from "mongoose";

export const NOTIFICATION_TYPES = Object.freeze({
  REQUEST_REPLY_STUDENT: "REQUEST_REPLY_STUDENT", // Thông báo trả lời request cho sinh viên
  REQUEST_ASSIGNED: "REQUEST_ASSIGNED",         // Thông báo được phân công request cho officer
  CHAT_MESSAGE: "CHAT_MESSAGE"                  // Thông báo tin nhắn chat
});

const SenderSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "Account" },
  name: { type: String },
  avatar: { type: String }
}, { _id: false }); // Tắt _id cho sub-document cho nhẹ

const NotificationSchema = new Schema({
  // 1. Người nhận
  recipient_id: { type: Schema.Types.ObjectId, ref: "Account", required: true }, // Bỏ index: true ở đây vì đã có compound index bên dưới

  // 2. Thay sender_id đơn lẻ bằng mảng senders (Để gom nhóm)
  senders: {
    type: [SenderSchema],
    default: []
  },

  // 3. Biến đếm số lượng hành động (Để hiển thị "và N người khác")
  action_count: { type: Number, default: 1 },

  // 4. Loại và Trạng thái
  type: {
    type: String,
    enum: ["REQUEST_REPLY_STUDENT", "REQUEST_ASSIGNED", "CHAT_MESSAGE"],
    required: true
  },
  is_read: { type: Boolean, default: false },

  // 5. Ngữ cảnh (Để xác định xem nên gom vào đâu)
  // VD: Group các like của cùng 1 entity_id lại với nhau
  entity_id: { type: Schema.Types.ObjectId, required: true },
  // entity_type: { type: String, required: true },

  // 6. Data linh hoạt
  data: {
    type: Object,
    default: {}
  },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

// --- INDEXES ---
// 1. Index cho Newsfeed (List) - Vẫn giữ nguyên vì cần sort created_at
NotificationSchema.index({ recipient_id: 1, created_at: -1 });

// 2. Index ĐA NĂNG (Gộp giữa Đếm Badge & Gom nhóm Upsert)
// Lưu ý thứ tự: is_read phải đứng thứ 2
NotificationSchema.index({
  recipient_id: 1,
  is_read: 1,
  entity_id: 1,
  type: 1
});

export default model("Notification", NotificationSchema);