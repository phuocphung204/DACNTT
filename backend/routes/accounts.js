import express from "express";

import { protect, upload, admin, staff_or_admin, staff_or_officer } from "../middlewares/auth.js";
import {
        getAllAccounts, getAccountByDepartmentId, getDepartmentAndAccountsWithLabels, updateMyPassword, getAccountById,
        getMyProfile, updateMyProfile, createAccount, updateAccount, uploadAvatar
} from "../controllers/accountController.js";

const router = express.Router();

// STAFF/OFFICER ONLY

// @desc    Get own profile
// @route   GET /api/accounts/me
// @access  Private/Staff-Officer
router.get("/me", protect, staff_or_officer, getMyProfile);

// @desc    Upload own avatar
// @route   POST /api/accounts/me/avatar
// @access  Private/Staff-Officer
// TODO: frontend phải dùng <input type="file" name="avatar" />
router.post("/me/avatar", protect, staff_or_officer, upload.single("avatar"), uploadAvatar);

// @desc    Update own account
// @route   PUT /api/accounts/me/update_password
// @access  Private/Staff-Officer
router.put("/me/update_password", protect, staff_or_officer, updateMyPassword);

// @desc    Update own profile
// @route   PUT /api/accounts/me
// @access  Private/Staff-Officer
router.put("/me", protect, staff_or_officer, updateMyProfile);

// SYSTEM ONLY

// @desc    Get accounts by department ID role Officer and Active status
// @route   GET /api/accounts/department/:department_id
// @access  Public/System
router.get("/department/:department_id", getAccountByDepartmentId);

// @desc    Get department and accounts with specific label
// @route   GET /api/accounts/department_labels/:label
// @access  Public/System
router.get("/department_labels/:label", getDepartmentAndAccountsWithLabels); // TODO: update lên cho hay

// STAFF/ADMIN ONLY

// @desc    Get all accounts
// @route Admin:   GET /api/accounts?filter={"role":["Officer","Staff"], "work_status":["Active"],"active":"true", "department_id":"<department_id>"}
// @route Staff:   GET /api/accounts?filter={"role":["Officer"], "work_status":["Active"],"active":"true", "department_id":"<department_id>"}
// if account.role = Staff, filter.role can only be ["Officer"]
// @access  Private/Staff-Admin
router.get("/", protect, staff_or_admin, getAllAccounts);

// @desc    Get account by ID
// @route   GET /api/accounts/:account_id
// @access  Private/Staff-Admin
router.get("/:account_id", protect, staff_or_admin, getAccountById);

// ADMIN ONLY

// @desc    Create new account
// @route   POST /api/accounts
// @access  Private/Admin
router.post("/", protect, admin, createAccount);

// @desc    Update account by ID
// @route   PATCH /api/accounts/:account_id
// @access  Private/Admin
router.patch("/:account_id", protect, admin, updateAccount);

export default router;