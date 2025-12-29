import express from "express";
import { protect, staff } from "../middlewares/auth.js";
import { getDashboardAdvanced } from "../controllers/dashboardController.js";

const router = express.Router();

// Staff
// Get advanced dashboard statistics
// @route   GET /api/dashboard/advanced?annual=2025&quarterly=4&monthly=12&weekly=<>
// @route   GET /api/dashboard/advanced?&startDate=<>&endDate=<>
// @access  Private/Staff
router.get("/advanced", protect, staff, getDashboardAdvanced);

export default router;