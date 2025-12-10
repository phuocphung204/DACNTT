import express from "express";

import { protect, staff } from "../middlewares/auth.js";
import { getAllAccounts, getAccountByDepartmentId } from "../controllers/accountController.js";


const router = express.Router();

// @desc    Get all accounts
// @route   GET /api/accounts
// @access  Private/Staff
router.get("/", protect, staff, getAllAccounts);

// @desc    Get accounts by department ID role Officer and Active status
// @route   GET /api/accounts/department/:department_id
// @access  System
router.get("/department/:department_id", getAccountByDepartmentId);

export default router;