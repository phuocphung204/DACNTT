import express from "express";

import { protect, staff, admin, staff_or_admin, staff_or_officer } from "../middlewares/auth.js";
import { getAllAccounts, getAccountByDepartmentId, updateMyPassword, getAccountById, getMyProfile, updateMyProfile, createAccount, updateAccount } from "../controllers/accountController.js";


const router = express.Router();
// SYSTEM ONLY

// @desc    Get accounts by department ID role Officer and Active status
// @route   GET /api/accounts/department/:department_id
// @access  Public/System
router.get("/department/:department_id", getAccountByDepartmentId);

// STAFF/ADMIN ONLY

// @desc    Get all accounts
// @route Admin:   GET /api/accounts?filter={"role":["admin","staff"], "work_status":["Active"],"active":"true", "department_id":"<department_id>"}
// @route Staff:   GET /api/accounts?filter={"role":["officer"], "work_status":["Active"],"active":"true", "department_id":"<department_id>"}
// if account.role = Staff, filter.role can only be ["Officer"]
// @access  Private/Staff-Admin
router.get("/", protect, staff_or_admin, getAllAccounts);

// @desc    Get account by ID
// @route   GET /api/accounts/:account_id
// @access  Private/Staff-Admin
router.get("/:account_id", protect, staff_or_admin, getAccountById);

// STAFF/OFFICER ONLY

// @desc    Get own profile
// @route   GET /api/accounts/me
// @access  Private/Staff-Officer
router.get("/me", protect, staff_or_officer, getMyProfile);

// @desc    Update own account
// @route   PUT /api/accounts/me/update_password
// @access  Private/Staff-Officer
router.put("/me/update_password", protect, staff_or_officer, updateMyPassword);

// @desc    Update own profile
// @route   PUT /api/accounts/me
// @access  Private/Staff-Officer
router.put("/me", protect, staff_or_officer, updateMyProfile);

// ADMIN ONLY

// @desc    Create new account
// @route   POST /api/accounts
// @access  Private/Admin
router.post("/", protect, admin, createAccount);

// @desc    Update account by ID
// @route   PUT /api/accounts/:account_id
// @access  Private/Admin
router.put("/:account_id", protect, admin, updateAccount);

export default router;