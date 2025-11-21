import express from "express";
import axios from "axios";

import { createRequest } from "../controllers/requestController.js";
import { readUnreadEmails } from "../services/email_ggapi.js";

const router = express.Router();

// Create a new request
// @route   POST /api/requests
// @access  System
router.post("/", createRequest);

router.post("/pubsub", readUnreadEmails);

export default router;