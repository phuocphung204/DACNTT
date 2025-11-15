import express from "express";

import { protect, admin } from "../middlewares/auth.js";
import { createDepartment, getDepartmentByLabel } from "../controllers/departmentController.js";

const router = express.Router();

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private/Admin
router.post("/", protect, admin, createDepartment);

// @desc    Get department by label
// @route   GET /api/departments/label
// @access  System
router.get("/label", getDepartmentByLabel);

export default router;