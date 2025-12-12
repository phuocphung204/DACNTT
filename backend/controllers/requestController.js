import Request from "../models/Request.js";
import Department from "../models/Department.js";
import { preprocessText, predict_label } from "../services/finetune.js";
import { supabase } from "../services/supabaseClient.js";

// System
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

export const uploadAttachments = async (req, res) => {
    try {
        const request_id = req.params.request_id;
        const file = req.file;

        const request = await Request.findById(request_id);
        if (!request) {
            return res.status(404).json({ mc: 404, me: "Request not found" });
        }

        if (!file) {
            return res.status(400).json({ mc: 400, me: "No attachment uploaded" });
        }

        const filename = `${Date.now()}_${file.originalname}`;

        // Upload file vào bucket private "attachments"
        const { data, error } = await supabase.storage
            .from("attachments")
            .upload(filename, file.buffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.mimetype,
            });

        request.attachments.push({
            cloud_key: data.path,
            originalname: file.originalname,
            mime_type: file.mimetype,
        });
        await request.save();

        if (error) {
            return res.status(500).json({ mc: 500, me: error.message });
        }

        return res.status(200).json({
            mc: 200,
            me: "Attachment uploaded successfully",
            dt: {
                stored_name: filename,
                original_name: file.originalname,
                mime_type: file.mimetype,
                cloud_key: data.path
            }
        });

    } catch (error) {
        return res.status(500).json({ mc: 500, me: error.message });
    }
};

export const downloadAttachment = async (req, res) => {
    try {
        const { request_id, attachment_id } = req.params;

        const request = await Request.findById(request_id);
        if (!request) return res.status(404).json({ error: "File not found" });

        const attachment = request.attachments.id(attachment_id);
        if (!attachment) return res.status(404).json({ error: "Attachment not found" });

        const { data: signed, error } = await supabase.storage
            .from("attachments")
            .createSignedUrl(attachment.cloud_key, 60);

        if (error) return res.status(500).json({ error: error.message });

        const fileResponse = await fetch(signed.signedUrl);
        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalname}"`);
        res.setHeader("Content-Type", attachment.mime_type);

        res.send(buffer);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin and Staff only
export const getAllRequests = async (req, res) => {
    try {
        const requests = await Request.find().sort({ created_at: -1 });
        res.status(200).json({ ec: 200, em: "Requests retrieved successfully", dt: requests });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

export const getRequestById = async (req, res) => {
    try {
        const request_id = req.params.request_id;
        const request = await Request.findById(request_id);
        if (!request) {
            return res.status(404).json({ ec: 404, em: "Request not found" });
        }
        res.status(200).json({ ec: 200, em: "Request retrieved successfully", dt: request });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

// Staff only
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