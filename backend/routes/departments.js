import express from "express";

import { protect, staff } from "../middlewares/auth.js";
import { createDepartment, getAllDepartments, getDepartmentById, updateDepartment, deleteDepartment } from "../controllers/departmentController.js";

const router = express.Router();
// TODO: test
// Only Admin and Staff

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private/Staff
router.get("/", protect, staff, getAllDepartments);

// @desc    Get a department by ID
// @route   GET /api/departments/:department_id
// @access  Private/Staff
router.get("/:department_id", protect, staff, getDepartmentById);

// Only Admin

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private/Staff
router.post("/", protect, staff, createDepartment);

// @desc    Update a department by ID
// @route   PUT /api/departments/:department_id
// @access  Private/Staff
router.put("/:department_id", protect, staff, updateDepartment);

// @desc    Delete a department by ID
// @route   DELETE /api/departments/:department_id
// @access  Private/Staff
router.delete("/:department_id", protect, staff, deleteDepartment);

export default router;