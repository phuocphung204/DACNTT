import express from "express";

import { protect, admin, staff_or_admin } from "../middlewares/auth.js";
import { createDepartment, getAllDepartments, getDepartmentById, updateDepartment, deleteDepartment } from "../controllers/departmentController.js";

const router = express.Router();

// Only Admin and Staff

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private/Staff
router.get("/", protect, staff_or_admin, getAllDepartments);

// @desc    Get a department by ID
// @route   GET /api/departments/:department_id
// @access  Private/Staff
router.get("/:department_id", protect, staff_or_admin, getDepartmentById);

// Only Admin

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private/Admin
router.post("/", protect, admin, createDepartment);

// @desc    Update a department by ID
// @route   PUT /api/departments/:department_id
// @access  Private/Admin
router.put("/:department_id", protect, admin, updateDepartment);

// @desc    Delete a department by ID
// @route   DELETE /api/departments/:department_id
// @access  Private/Admin
router.delete("/:department_id", protect, admin, deleteDepartment);

export default router;