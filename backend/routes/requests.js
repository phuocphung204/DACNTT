import express from "express";

import { createRequest, getAllRequests, usePredictionByRequestId, assignRequestToOfficer } from "../controllers/requestController.js";
import { readUnreadEmails } from "../services/email_ggapi.js";
import { protect, staff } from "../middlewares/auth.js";

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
// @route   GET /api/requests
// @access  System
router.get("/", getAllRequests);

// Use prediction by request ID
// @route   PUT /api/requests/use-prediction/:request_id
// @access  Private/Staff
router.put("/use-prediction/:request_id", protect, staff, usePredictionByRequestId);

// Assign request to officer
// @route   PUT /api/requests/assign/:request_id
// @access  Private/Staff
router.put("/assign/:request_id", protect, staff, assignRequestToOfficer);

export default router;