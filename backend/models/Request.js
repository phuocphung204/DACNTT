import mongoose from "mongoose";

const { Schema, model } = mongoose;

const historySchema = new Schema(
	{
		status: { type: String, enum: ["Pending", "Assigned", "InProgress", "Resolved", "Rejected"] },
		changed_at: { type: Date, default: Date.now },
		changed_by: { type: Schema.Types.ObjectId, ref: "Account", default: null }
	},
	{ _id: false }
);

const predictSchema = new Schema(
	{
		category: {
			label_id: { type: String, required: true },
			label: {
				type: String, enum: ["Chính sách - Học bổng", "Chương trình thạc sĩ", "Chương trình đào tạo",
					"Giấy tờ - Xác nhận", "Hành chính - Bảo hiểm", "Học phí - Kế toán",
					"Hỗ trợ hệ thống - CNTT", "Hỗ trợ khó khăn cá nhân", "Khen thưởng - Kỷ luật",
					"Ký túc xá", "Phúc khảo - Khảo thí", "Thư viện - Học liệu",
					"Tư vấn hướng nghiệp", "Tư vấn học tập", "Tư vấn tâm lý",
					"Yêu cầu học vụ", "Điểm rèn luyện"
				], required: true
			},
			score: { type: Number, required: true },
		},
		priority: {
			label_id: { type: String, required: true },
			label: { type: String, enum: ["Low", "Medium", "High", "Critical"], required: true },
			score: { type: Number, required: true },
		},
		department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true },
		is_used: { type: Boolean, default: false }
	},
	{ _id: false }
);

export const attachmentSchema = new Schema(
	{
		originalname: { type: String, required: true },
		mime_type: { type: String, required: true },
		cloud_key: { type: String, required: true }
	},
	{ _id: true }
);

const requestSchema = new Schema(
	{
		student_email: { type: String, required: true },
		subject: { type: String, required: true },
		content: { type: String, required: true },
		student_id: { type: String, required: true },
		department_id: { type: Schema.Types.ObjectId, ref: "Department", default: null },
		label: { type: String, default: null }, // Nhãn thủ công lấy từ model AI đã training
		priority: { type: Number, enum: [0, 1, 2, 3], default: 0 }, // 0: Low, 1: Medium, 2: High, 3: Critical
		prediction: predictSchema,
		assigned_to: { type: Schema.Types.ObjectId, ref: "Account", default: null },
		status: { type: String, enum: ["Pending", "Assigned", "InProgress", "Resolved"], default: "Pending" },
		is_overdue: { type: Boolean, default: false },
		attachments: [attachmentSchema],
		history: [historySchema]
	}
	, {
		timestamps: {
			createdAt: "created_at",
			updatedAt: "updated_at"
		}
	}
);

// --- INDEXES ---
// Tối ưu hóa hiệu suất truy vấn

// 1. Cho trang quản lý của Staff (getAllRequests)
// Lọc theo status, created_at và sort theo created_at, priority
requestSchema.index({ status: 1, priority: -1, created_at: -1 });

// 2. Cho trang quản lý của Officer (getMyAssignedRequests)
// Lọc theo assigned_to, created_at và sort theo created_at, priority
requestSchema.index({ assigned_to: 1, priority: -1, created_at: -1 });
// 3. Để đếm số lượng request của officer một cách hiệu quả (getAccountByDepartmentId)
requestSchema.index({ department_id: 1, assigned_to: 1, status: 1 });

// 4. Cho dashboard (getDashboardAdvanced) và các truy vấn chỉ lọc theo thời gian
requestSchema.index({ created_at: 1 });

const Request = mongoose.models.Request || model("Request", requestSchema);
export default Request;
