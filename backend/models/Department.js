import mongoose from "mongoose";

const { Schema, model } = mongoose;

const knowledge_baseSchema = new Schema(
	{
		title: { type: String, required: true },
		content: { type: String, required: true }
	},
	{ _id: true }
);

const labelSchema = new Schema(
	{
		label_id: { type: Number, required: true, unique: true },
		label: { type: String, required: true, unique: true },
		knowledge_base: [knowledge_baseSchema]
	},
	{ _id: false }
);

const departmentSchema = new Schema(
	{
		name: { type: String, required: true, unique: true },
		description: { type: String, required: true },
		labels: [labelSchema],
		email: { type: String, required: true, unique: false },
		room: { type: String, required: false, default: "" },
		phone_number: { type: String, required: false, default: "" },
		google_info: { type: Object, default: {} } // Lưu thông tin Google OAuth (nếu có)
	},
	{
		timestamps: {
			createdAt: "created_at",
			updatedAt: "updated_at"
		}
	}
);

//  Export 
const Department = mongoose.models.Department || model("Department", departmentSchema);
export default Department;