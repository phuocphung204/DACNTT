import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Define Account Schema
const accountSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    position: { type: String, required: true },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    role: { type: String, enum: ["Officer", "Staff", "Admin"], required: true },
    phone_number: { type: String },
    avatar: { type: String },
    work_status: { type: String, enum: ["Active", "OnLeave", "Retired"], default: "Active" },
    active: { type: Boolean, default: true },
    department_id: { type: Schema.Types.ObjectId, ref: "Department" } // Nếu role là Officer, thì có department_id
  },
  { timestamps: {
    createdAt: "created_at",
    updatedAt: "updated_at"
  } }
);

//  Export 
const Account = mongoose.models.Account || model("Account", accountSchema);
export default Account;