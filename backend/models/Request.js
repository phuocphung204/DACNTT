import mongoose from "mongoose";

const { Schema, model } = mongoose;

const  requestSchema = new Schema(
    {
        student_email: { type: String, required: true },
        subject: { type: String, required: true },
        content: { type: String, required: true },
        student_id: { type: String, required: true },
        department_id: { type: Schema.Types.ObjectId, ref: "Department" },
        assigned_to: { type: Schema.Types.ObjectId, ref: "Account" },
        status: { type: String, enum: ["Pending", "InProgress", "Resolved", "Rejected"], default: "Pending" },
        attachments: [{ type: String }],
        history: [
            {
                status: { type: String, enum: ["Pending", "InProgress", "Resolved", "Rejected"] },
                updated_at: { type: Date, default: Date.now }
            }
        ]
    }
    , { timestamps: true }
);

const Request = mongoose.models.Request || model("Request", requestSchema);
export default Request;