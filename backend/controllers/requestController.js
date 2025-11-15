import Request from "../models/Request.js";

export const createRequest = async (req, res) => {
    try {
        const { student_email, subject, content, student_id, attachments } = req.body;
        const newRequest = await Request.create({
            student_email,
            subject,
            content,
            student_id,
            attachments: attachments || []
        });
        res.status(201).json({ ec: 201, em: "Request created successfully", data: newRequest });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

export const getAllRequests = async (req, res) => {
    try {
        const requests = await Request.find().sort({ createdAt: -1 });
        res.status(200).json({ ec: 200, em: "Requests retrieved successfully", data: requests });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};
