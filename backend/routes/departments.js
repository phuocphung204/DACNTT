import express from "express";

import { protect, admin, staff_or_admin, officer } from "../middlewares/auth.js";
import {
    createDepartment, getAllDepartments, getDepartmentById, updateDepartment, deleteDepartment,
    createKnowledgeBase, updateKnowledgeBase, deleteKnowledgeBase,
    getAllLabels
} from "../controllers/departmentController.js";

const router = express.Router();

// System
router.get("/labels", protect, getAllLabels);

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

// TODO: Thêm các route quản lý knowledge base dưới nhãn của phòng ban
// Only Officer
// @desc    Create a knowledge base entry under a label in a department
// @route   POST /api/departments/:department_id/label/:label_id/knowledge_base
// @access  Private/Officer
router.post("/:department_id/label/:label_id/knowledge_base", protect, officer, createKnowledgeBase);

// @desc    Update a knowledge base entry under a label in a department
// @route   PUT /api/departments/:department_id/label/:label_id/knowledge_base/:knowledge_base_id
// @access  Private/Officer
router.put("/:department_id/label/:label_id/knowledge_base/:knowledge_base_id", protect, officer, updateKnowledgeBase);

// @desc    Delete a knowledge base entry under a label in a department
// @route   DELETE /api/departments/:department_id/label/:label_id/knowledge_base/:knowledge_base_id
// @access  Private/Officer
router.delete("/:department_id/label/:label_id/knowledge_base/:knowledge_base_id", protect, officer, deleteKnowledgeBase);

export default router;