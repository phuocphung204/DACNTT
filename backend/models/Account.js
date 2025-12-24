import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Schema, model } = mongoose;

export const ACCOUNT_ROLES = Object.freeze({
  OFFICER: "Officer",
  STAFF: "Staff",
  ADMIN: "Admin"
});

export const WORK_STATUS = Object.freeze({
  ACTIVE: "Active",
  ON_LEAVE: "OnLeave",
  RETIRED: "Retired"
});

// Generate hashed password
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(process.env.DEFAULT_PASSWORD, salt);

// Define Account Schema
const accountSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, default: hashedPassword },
    position: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    role: { type: String, enum: ["Officer", "Staff", "Admin"], required: true },
    phone_number: { type: String },
    avatar: { type: String },
    work_status: { type: String, enum: ["Active", "OnLeave", "Retired"], default: "Active" },
    active: { type: Boolean, default: true },
    department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true }, // Nếu role là Staff, thì có department_id của phòng CNTT (Phòng Điện toán – Máy tính)
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
const Account = mongoose.models.Account || model("Account", accountSchema);
export default Account;