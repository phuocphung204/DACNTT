import express from "express";

import { createRequest, getAllRequests, usePredictionByRequestId, assignRequestToOfficer, getRequestById, uploadAttachments, downloadAttachment, getMyAssignedRequests, searchKnowledgeBase, assignOverdueRequests, getMyAssignedRequestsForManage, updateRequestByOfficer } from "../controllers/requestController.js";
import { readUnreadEmails } from "../services/email_ggapi.js";
import { protect, staff, upload, staff_or_officer, officer } from "../middlewares/auth.js";

const router = express.Router();

// Officer

// Get my assigned requests
// @route   GET /api/requests/my-assigned-requests?date=<date>&today=false&weekly=false
// @access  Private/Officer
router.get("/my-assigned-requests", protect, officer, getMyAssignedRequests);

// TODO: Thêm thanh Search knowledge base search trực tiếp trong chi tiết request
// @route   GET /api/requests/knowledge-base/search?label=<query>&q=<query>
// @access   Private/Officer
router.get("/knowledge-base/search", protect, officer, searchKnowledgeBase);
// Download attachment by request ID and attachment ID
// @route   GET /api/requests/:request_id/attachments/:attachment_id
// @access  Private/Officer
router.get("/:request_id/attachments/:attachment_id", protect, officer, downloadAttachment);


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

// Assign overdue requests to officers
// @route   POST /api/requests/assign-overdue
// @access  System
router.post("/assign-overdue", assignOverdueRequests);

// Endpoint for Pub/Sub to push email notifications and process unread emails
// @route   POST /api/requests/pubsub
// @access  System
router.post("/pubsub", readUnreadEmails);

// Officer

// Get my assigned requests
// @route   GET /api/requests/my-assigned-requests?date=<date>&today=false&weekly=false
// @access  Private/Officer
// Đã chuyển lên trên
// router.get("/my-assigned-requests", protect, officer, getMyAssignedRequests);

// TODO: Thêm thanh Search knowledge base search trực tiếp trong chi tiết request
// @route   GET /api/requests/knowledge-base/search?label=<query>&q=<query>
// @access   Private/Officer
router.get("/knowledge-base/search", protect, officer, searchKnowledgeBase);

// Get my assigned requests
// @route   GET /api/requests/my-assigned-requests?date=<date>&today=false&weekly=false&monthly=false&page=<page>
// @access  Private/Officer
router.get("/my-assigned-requests", protect, officer, getMyAssignedRequests);
router.get("/my-assigned-requests/manage", protect, officer, getMyAssignedRequestsForManage);

router.patch("/:request_id", protect, officer, updateRequestByOfficer);

// Download attachment by request ID and attachment ID
// @route   GET /api/requests/:request_id/attachments/:attachment_id
// @access  Private/Officer
router.get("/:request_id/attachments/:attachment_id", protect, officer, downloadAttachment);

// Upload attachment to request by ID
// @route   POST /api/requests/:request_id/attachments
// @access  System
router.post("/:request_id/attachments", upload.single("attachment"), uploadAttachments);

// Staff or Officer

// Get request by ID
// @route   GET /api/requests/:request_id
// @access  Private/Staff or Officer
router.get("/:request_id", protect, staff_or_officer, getRequestById);

export default router;
