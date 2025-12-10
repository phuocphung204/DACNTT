import mongoose from "mongoose";

const { Schema, model } = mongoose;

const historySchema = new Schema(
    {
        status: { type: String, enum: ["Pending", "InProgress", "Resolved", "Rejected"] },
        changed_at: { type: Date, default: Date.now },
        changed_by: { type: Schema.Types.ObjectId, ref: "Account", default: null }
    },
    { _id: false }
);
const predictSchema = new Schema(
    {
        label_id: { type: String, required: true },
        label: { type: String, required: true },
        department_id: { type: Schema.Types.ObjectId, ref: "Department", required: true },
        score: { type: Number, required: true },
        is_used: { type: Boolean, default: false }
    },
    { _id: false }
);

const requestSchema = new Schema(
    {
        student_email: { type: String, required: true },
        subject: { type: String, required: true },
        content: { type: String, required: true },
        student_id: { type: String, required: true },
        department_id: { type: Schema.Types.ObjectId, ref: "Department", default: null },
        prediction: predictSchema,
        assigned_to: { type: Schema.Types.ObjectId, ref: "Account", default: null },
        status: { type: String, enum: ["Pending", "InProgress", "Resolved", "Rejected"], default: "Pending" },
        attachments: [{ type: String }],
        history: [historySchema]
    }
    , {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

const Request = mongoose.models.Request || model("Request", requestSchema);
export default Request;