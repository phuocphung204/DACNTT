import mongoose from "mongoose";

const { Schema, model } = mongoose;

const departmentSchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String, required: true },
        labels: [{ type: String }],
        // staff_in_charge: { type: Schema.Types.ObjectId, ref: "Account" },
    },
    { timestamps: false }
);

//  Export 
const Department = mongoose.models.Department || model("Department", departmentSchema);
export default Department;