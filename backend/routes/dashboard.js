import express from "express";
import { protect, staff } from "../middlewares/auth.js";
import { getDashboardAdvanced } from "../controllers/dashboardController.js";

const router = express.Router();

// Staff
// Get advanced dashboard statistics
// @route   GET /api/dashboard/advanced?annual=<>&quarterly=<>&monthly=<>&weekly=<>&start=<>&end=<>
// @access  Private/Staff
router.get("/advanced", protect, staff, getDashboardAdvanced);

export default router;