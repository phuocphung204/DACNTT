import express from "express";

import { createRequest, getAllRequests, usePredictionByRequestId, assignRequestToOfficer, getRequestById, uploadAttachments, downloadAttachment, getMyAssignedRequests } from "../controllers/requestController.js";
import { readUnreadEmails } from "../services/email_ggapi.js";
import { protect, staff, upload, staff_or_officer, officer } from "../middlewares/auth.js";

const router = express.Router();

// Staff
router.get("/test", (req, res) => {
  // console.log("Test request route");
  // console.log(req.query);
});

// Use prediction by request ID
// @route   PUT /api/requests/use-prediction/:request_id
// @access  Private/Staff
router.put("/use-prediction/:request_id", protect, staff, usePredictionByRequestId);

// Assign request to officer
// @route   PUT /api/requests/assign/:request_id
// @access  Private/Staff
router.put("/assign/:request_id", protect, staff, assignRequestToOfficer);

// Get all requests
// @route   GET /api/requests?date=<date>&today=false&weekly=false
// @access  System
router.get("/", protect, staff, getAllRequests);

// System

// Create a new request
// @route   POST /api/requests
// @access  System
router.post("/", createRequest);

// Endpoint for Pub/Sub to push email notifications and process unread emails
// @route   POST /api/requests/pubsub
// @access  System
router.post("/pubsub", readUnreadEmails);

// Get my assigned requests
// @route   GET /api/requests/my-assigned-requests?date=<date>&today=false&weekly=false&monthly=false&page=<page>
// @access  Private/Officer
router.get("/my-assigned-requests", protect, officer, getMyAssignedRequests);

// Upload attachment to request by ID
// @route   POST /api/requests/:request_id/attachments
// @access  System
router.post("/:request_id/attachments", upload.single("attachment"), uploadAttachments);

// Staff or Officer

// Get request by ID
// @route   GET /api/requests/:request_id
// @access  Private/Staff or Officer
router.get("/:request_id", protect, staff_or_officer, getRequestById);

// Officer

// Download attachment by request ID and attachment ID
// @route   GET /api/requests/:request_id/attachments/:attachment_id
// @access  Private/Officer
router.get("/:request_id/attachments/:attachment_id", protect, officer, downloadAttachment);

// Get my assigned requests
// @route   GET /api/requests/my-assigned-requests?date=<date>&today=false&weekly=false
// @access  Private/Officer
// Đã chuyển lên trên
// router.get("/my-assigned-requests", protect, officer, getMyAssignedRequests);

// TODO: thêm các hàm truy vấn thông tin sinh viên đã gửi yêu cầu

export default router;