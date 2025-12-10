import express from "express";

import { protect, staff } from "../middlewares/auth.js";
import { createDepartment } from "../controllers/departmentController.js";

const router = express.Router();

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private/Staff
router.post("/", protect, staff, createDepartment);

export default router;