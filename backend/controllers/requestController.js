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
		// console.log("Preprocessed Content:", preprocessedContent);

		// Gọi model để dự đoán nhãn
		const predictionResponse = await predict_label(preprocessedContent);
		if (predictionResponse.ec !== 200) {
			return res.status(predictionResponse.ec).json({ ec: predictionResponse.ec, em: predictionResponse.em });
		}
		// console.log("Prediction Response:", predictionResponse.dt);

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
			return res.status(404).json({ ec: 404, em: "Request not found" });
		}

		if (!file) {
			return res.status(400).json({ ec: 400, em: "No attachment uploaded" });
		}

		const filename = `${Date.now()}_${file.originalname}`;

		// Upload file vào bucket private "attachments"
		const { data, error } = await supabase.storage
			.from("attachments")
			.upload(filename, file.buffer, {
				cacheControl: "3600",
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
			return res.status(500).json({ ec: 500, em: error.message });
		}

		return res.status(200).json({
			ec: 200,
			em: "Attachment uploaded successfully",
			dt: {
				stored_name: filename,
				original_name: file.originalname,
				mime_type: file.mimetype,
				cloud_key: data.path
			}
		});

	} catch (error) {
		return res.status(500).json({ ec: 500, em: error.message });
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
export const getAllRequests = async (req, res) => {
	try {
		const { date, today, weekly, monthly, page } = req.query;

		const filter = {};
		const now = new Date();

		// Ngày cụ thể
		if (date) {
			const selectedDate = new Date(date);
			const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
			const endOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
			filter.created_at = { $gte: startOfDay, $lt: endOfDay };
		}
		// Hôm nay
		else if (today === "true") {
			const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			filter.created_at = { $gte: startOfDay, $lt: endOfDay };
		}
		// Tuần hiện tại
		else if (weekly === "true") {
			const firstDayOfWeek = new Date(now);
			const day = firstDayOfWeek.getDay() || 7; // CN = 7
			firstDayOfWeek.setDate(firstDayOfWeek.getDate() - day + 1);

			const lastDayOfWeek = new Date(firstDayOfWeek);
			lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 7);
			filter.created_at = { $gte: firstDayOfWeek, $lt: lastDayOfWeek };
		}
		// Tháng hiện tại
		else if (monthly === "true") {
			const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			filter.created_at = { $gte: firstDayOfMonth, $lt: lastDayOfMonth };
		}
		// Mặc định lấy hôm nay
		else {
			const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			filter.created_at = { $gte: startOfDay, $lt: endOfDay };
		}

		// Phân trang
		const pageNumber = parseInt(page) || 1;
		const pageSize = 20;
		const skip = (pageNumber - 1) * pageSize;

		const [requests_pending, requests_in_progress, requests_resolved,
			count_pending, count_in_progress, count_resolved, total] = await Promise.all([
				Request.find({ ...filter, status: "Pending" })
					.sort({ created_at: -1, priority: 1 })
					.skip(skip)
					.limit(pageSize).select("_id student_email subject created_at updated_at status priority label assigned_to"),
				Request.find({ ...filter, status: "InProgress" })
					.sort({ created_at: -1, priority: 1 })
					.skip(skip)
					.limit(pageSize).select("_id student_email subject created_at updated_at status priority label assigned_to"),
				Request.find({ ...filter, status: "Resolved" })
					.sort({ created_at: -1, priority: 1 })
					.skip(skip)
					.limit(pageSize).select("_id student_email subject created_at updated_at status priority label assigned_to"),
				Request.countDocuments({ ...filter, status: "Pending" }),
				Request.countDocuments({ ...filter, status: "InProgress" }),
				Request.countDocuments({ ...filter, status: "Resolved" }),
				Request.countDocuments({ ...filter })
			]);

		res.status(200).json({
			ec: 200, em: "Requests retrieved successfully", dt: {
				total_requests: total,
				pending: { requests: requests_pending, total: count_pending },
				in_progress: { requests: requests_in_progress, total: count_in_progress },
				resolved: { requests: requests_resolved, total: count_resolved }
			}
		});
	} catch (error) {
		res.status(500).json({ ec: 500, em: error.message });
	}
};

// Tự động chọn nhãn, ưu tiên, phòng ban từ dự đoán của AI và gán cho officer (gán officer sửa được default là officer có số task (assigned vs inprogress) ít nhất trong phòng ban)
export const usePredictionByRequestId = async (req, res) => {
	try {
		const request_id = req.params.request_id;
		const assigned_to = req.body.assigned_to;
		// Lấy account officer có số task ít nhất trong department của request

		const request = await Request.findByIdAndUpdate(request_id, {
			status: "Assigned",
			$push: { history: { status: "Assigned", changed_by: req.account._id } }
		}, { new: true });

		if (!request) {
			return res.status(404).json({ ec: 404, em: "Request not found" });
		}

		request.label = request.prediction.label;
		request.department_id = request.prediction.department_id;
		request.prediction.is_used = true;
		request.assigned_to = assigned_to;
		request.priority = 3; // Cập nhật nếu thuật toán dự đoán được priority
		await request.save();
		//TODO Mặc định trung bình: Sửa sau nếu thêm được dự đoán priority từ model

		res.status(200).json({ ec: 200, em: "Prediction marked as used", dt: request });
	} catch (error) {
		res.status(500).json({ ec: 500, em: error.message });
	}
};
// Thủ công chọn nhãn, phòng ban, ưu tiên và gán cho officer (tự chọn officer)
export const assignRequestToOfficer = async (req, res) => {
	try {
		const request_id = req.params.request_id;
		const { assigned_to, priority, label, department_id } = req.body;
		const request = await Request.findByIdAndUpdate(request_id, {
			status: "Assigned",
			$push: { history: { status: "Assigned", changed_by: req.account._id } }
		}, { new: true });

		if (!request) {
			return res.status(404).json({ ec: 404, em: "Request not found" });
		}

		request.assigned_to = assigned_to;
		request.department_id = department_id;
		request.label = label;
		request.priority = priority;
		await request.save();

		res.status(200).json({ ec: 200, em: "Request assigned to officer successfully", dt: request });
	} catch (error) {
		res.status(500).json({ ec: 500, em: error.message });
	}
};

// Officer only
export const getMyAssignedRequests = async (req, res) => {
	try {
		// TODO: triển khai lọc nâng cao priority, status sau
		const { timeRange, page, pageSize, priority, status } = req.query;
		const officer_id = req.account._id;
		console.log("Officer ID:", officer_id);
		console.log("Query Params:", priority, status);
		const filter = { assigned_to: officer_id };
		const now = new Date();

		// Ngày cụ thể
		if (timeRange === "date") {
			const { date } = req.query;
			const selectedDate = new Date(date);
			const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
			const endOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1);
			filter.created_at = { $gte: startOfDay, $lt: endOfDay };
		}
		// Hôm nay
		else if (timeRange === "today") {
			const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			filter.created_at = { $gte: startOfDay, $lt: endOfDay };
		}
		// Tuần hiện tại
		else if (timeRange === "weekly") {
			const firstDayOfWeek = new Date(now);
			const day = firstDayOfWeek.getDay() || 7; // CN = 7
			firstDayOfWeek.setDate(firstDayOfWeek.getDate() - day + 1);

			const lastDayOfWeek = new Date(firstDayOfWeek);
			lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 7);
			filter.created_at = { $gte: firstDayOfWeek, $lt: lastDayOfWeek };
		}
		// Tháng hiện tại
		else if (timeRange === "monthly") {
			const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			filter.created_at = { $gte: firstDayOfMonth, $lt: lastDayOfMonth };
		}
		// Mặc định lấy hôm nay
		else {
			const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			filter.created_at = { $gte: startOfDay, $lt: endOfDay };
		}

		// Phân trang
		const pageNumber = parseInt(page) || 1;
		const pageSizeNumber = parseInt(pageSize) || 20;
		const skip = (pageNumber - 1) * pageSizeNumber;

		// const [requests_pending, requests_in_progress, requests_resolved,
		// 	count_pending, count_in_progress, count_resolved, total] = await Promise.all([
		// 		// Request.find({ ...filter, status: "Pending" })
		// 		Request.find({ ...filter, status: "Assigned" })
		// 			.sort({ created_at: -1, priority: 1 })
		// 			.skip(skip)
		// 			.limit(pageSizeNumber).select("_id student_email subject created_at updated_at status priority label assigned_to"),
		// 		Request.find({ ...filter, status: "InProgress" })
		// 			.sort({ created_at: -1, priority: 1 })
		// 			.skip(skip)
		// 			.limit(pageSizeNumber).select("_id student_email subject created_at updated_at status priority label assigned_to"),
		// 		Request.find({ ...filter, status: "Resolved" })
		// 			.sort({ created_at: -1, priority: 1 })
		// 			.skip(skip)
		// 			.limit(pageSizeNumber).select("_id student_email subject created_at updated_at status priority label assigned_to"),
		// 		// Request.countDocuments({ ...filter, status: "Pending" }),
		// 		Request.countDocuments({ ...filter, status: "Assigned" }),
		// 		Request.countDocuments({ ...filter, status: "InProgress" }),
		// 		Request.countDocuments({ ...filter, status: "Resolved" }),
		// 		Request.countDocuments({ ...filter })
		// 	]);
		const [myAssignedRequests, total] = await Promise.all([
			Request.find({ ...filter })
				.sort({ created_at: -1, priority: 1 })
				.skip(skip)
				.limit(pageSizeNumber).select("_id student_email subject created_at updated_at status priority label assigned_to"),
			Request.countDocuments({ ...filter })
		]);

		res.status(200).json({
			ec: 200, em: "My Assigned Requests retrieved successfully", dt: {
				// total_requests: total,
				// pending: { requests: requests_pending, total: count_pending },
				// in_progress: { requests: requests_in_progress, total: count_in_progress },
				// resolved: { requests: requests_resolved, total: count_resolved }
				total_requests: total,
				requests: myAssignedRequests
			}
		});
	} catch (error) {
		res.status(500).json({ ec: 500, em: error.message });
	}
};