import Request from "../models/Request.js";
import Department from "../models/Department.js";
import { preprocessText, predict_label } from "../services/finetune.js";

export const createRequest = async (req, res) => {
    try {
        const { student_email, subject, content, student_id, attachments } = req.body;

        // Tiền xử lý dữ liệu content
        const preprocessedContent = preprocessText(content);
        console.log("Preprocessed Content:", preprocessedContent);

        // Gọi model để dự đoán nhãn
        const predictionResponse = await predict_label(preprocessedContent);
        if (predictionResponse.ec !== 200) {
            return res.status(predictionResponse.ec).json({ ec: predictionResponse.ec, em: predictionResponse.em });
        }
        console.log("Prediction Response:", predictionResponse.dt);

        // Lấy nhãn dự đoán
        const label_id = predictionResponse.dt.id;

        // Tìm department tương ứng với nhãn dự đoán
        const department = await Department.findOne({ labels: { $elemMatch: { label_id } } });
        if (!department) {
            return res.status(404).json({ ec: 404, em: "No department found for the predicted label" });
        }
        // Tạo request mới
        const newRequest = await Request.create({
            student_email,
            subject,
            content,
            student_id,
            prediction: {
                label_id: label_id,
                label: predictionResponse.dt.label,
                department_id: department._id,
                score: predictionResponse.dt.score
            },
            attachments: attachments || [],
            history: [{ status: "Pending" }]
        });
        res.status(201).json({ ec: 201, em: "Request created successfully", dt: newRequest });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

export const getAllRequests = async (req, res) => {
    try {
        const requests = await Request.find().sort({ createdAt: -1 });
        res.status(200).json({ ec: 200, em: "Requests retrieved successfully", dt: requests });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

export const getRequestById = async (req, res) => {
    try {
        const id = req.params.id;
        const request = await Request.findById(id);
        if (!request) {
            return res.status(404).json({ ec: 404, em: "Request not found" });
        }
        res.status(200).json({ ec: 200, em: "Request retrieved successfully", dt: request });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

export const usePredictionByRequestId = async (req, res) => {
    try {
        const request_id = req.params.request_id;
        const request = await Request.findById(request_id);
        request.prediction.is_used = true;
        request.department_id = request.prediction.department_id;
        await request.save();
        if (!request) {
            return res.status(404).json({ ec: 404, em: "Request not found" });
        }
        res.status(200).json({ ec: 200, em: "Prediction marked as used", dt: request });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

export const assignRequestToOfficer = async (req, res) => {
    try {
        const request_id = req.params.request_id;
        const { assigned_to } = req.body;
        const request = await Request.findById(request_id);
        if (!request) {
            return res.status(404).json({ ec: 404, em: "Request not found" });
        }
        request.assigned_to = assigned_to;
        await request.save();
        res.status(200).json({ ec: 200, em: "Request assigned to officer successfully", dt: request });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};