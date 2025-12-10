import mongoose from "mongoose";

const { Schema, model } = mongoose;

const labelSchema = new Schema(
    {
        label_id: { type: Number, required: true, unique: true },
        label: { type: String, required: true, unique: true }
    },
    { _id: false }
);

const departmentSchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String, required: true },
        labels: [labelSchema]
        // staff_in_charge: { type: Schema.Types.ObjectId, ref: "Account" },
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