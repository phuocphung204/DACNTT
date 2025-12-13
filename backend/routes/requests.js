import express from "express";

import { createRequest, getAllRequests, usePredictionByRequestId, assignRequestToOfficer, getRequestById, uploadAttachments, downloadAttachment } from "../controllers/requestController.js";
import { readUnreadEmails } from "../services/email_ggapi.js";
import { protect, staff, upload, staff_or_officer, officer } from "../middlewares/auth.js";

const router = express.Router();

// Create a new request
// @route   POST /api/requests
// @access  System
router.post("/", createRequest);

// Endpoint for Pub/Sub to push email notifications and process unread emails
// @route   POST /api/requests/pubsub
// @access  System
router.post("/pubsub", readUnreadEmails);

// Get all requests
// @route   GET /api/requests?status=<status>&date=<date>&today=false&weekly=false&monthly=false&page=<page>
// @access  System
router.get("/", getAllRequests);

// Get request by ID
// @route   GET /api/requests/:request_id
// @access  Private/Staff
router.get("/:request_id", protect, staff_or_officer, getRequestById);

// Upload attachment to request by ID
// @route   POST /api/requests/:request_id/attachments
// @access  System
router.post("/:request_id/attachments", upload.single("attachment"), uploadAttachments);

// Download attachment by request ID and attachment ID
// @route   GET /api/requests/:request_id/attachments/:attachment_id
// @access  Private/Staff-Officer
router.get("/:request_id/attachments/:attachment_id", protect, officer, downloadAttachment);

// Use prediction by request ID
// @route   PUT /api/requests/use-prediction/:request_id
// @access  Private/Staff
router.put("/use-prediction/:request_id", protect, staff, usePredictionByRequestId);

// Assign request to officer
// @route   PUT /api/requests/assign/:request_id
// @access  Private/Staff
router.put("/assign/:request_id", protect, staff, assignRequestToOfficer);

export default router;