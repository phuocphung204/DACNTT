import express from "express";
import { admin, protect, staff } from "../middlewares/auth.js";
import { getDashboardAdvanced, getDashboardWithDepartmentID } from "../controllers/dashboardController.js";

const router = express.Router();

// Staff
// Get advanced dashboard statistics
// @route   GET /api/dashboard/advanced?annual=2025&quarterly=4&monthly=12&weekly=5
// @route   GET /api/dashboard/advanced?&startDate=<>&endDate=<>
// @access  Private/Staff
router.get("/advanced", protect, admin, getDashboardAdvanced);

// Get dashboard statistics for a specific department
// @route   GET /api/dashboard/department/:department_id?annual=2025&quarterly=4&monthly=12&weekly=5
// @route   GET /api/dashboard/department/:department_id?&startDate=<>&endDate=<>
// @access  Private/Staff
router.get("/department/:department_id", protect, admin, getDashboardWithDepartmentID);

export default router;