import express from "express";

import { protect, admin } from "../middlewares/auth.js";
import { getAllAccounts, getAccountByDepartmentId } from "../controllers/accountController.js";


const router = express.Router();

// @desc    Get all accounts
// @route   GET /api/accounts
// @access  Private/Admin
router.get("/", protect, admin, getAllAccounts);

// @desc    Get accounts by department ID role Officer and Active status
// @route   GET /api/accounts/department/:departmentId
// @access  Private/Admin
router.get("/department/:departmentId", protect, admin, getAccountByDepartmentId);

export default router;