import express from "express";

import { protect, staff } from "../middlewares/auth.js";
import { getAllAccounts, getAccountByDepartmentId, updatePassword } from "../controllers/accountController.js";


const router = express.Router();

// @desc    Get all accounts
// @route   GET /api/accounts?filter={"role":["admin","staff"], "work_status":["Active"],"active":"true"}
// @access  Private/Staff
router.get("/", protect, staff, getAllAccounts);

// @desc    Get accounts by department ID role Officer and Active status
// @route   GET /api/accounts/department/:department_id
// @access  System
router.get("/department/:department_id", getAccountByDepartmentId);

// @desc    Update own account
// @route   PUT /api/accounts/me/update_password
// @access  Public/Staff-Officer
router.put("/me/update_password", protect, updatePassword);

export default router;