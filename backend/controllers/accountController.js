import Account from "../models/Account.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../controllers/authController.js";

// System only
export const getAccountByDepartmentId = async (req, res) => {
  try {
    const { department_id } = req.params;
    const accounts = await Account.find({ department_id: department_id, role: "Officer", work_status: "Active", active: true }).select("-password -department_id -role -work_status -active -updatedAt -createdAt -__v");
    res.json({ mc: 200, me: "Accounts retrieved successfully", dt: accounts });
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

// Staff/Admin only - Manage accounts
export const getAllAccounts = async (req, res) => {
  try {
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    if (filter.role) {
      filter.role = { $in: filter.role };
    }
    if (filter.work_status) {
      filter.work_status = { $in: filter.work_status };
    }
    if (filter.active !== undefined) {
      filter.active = filter.active === "true";
    }
    if (filter.department_id !== undefined) {
      filter.department_id = filter.department_id;
    }
    const accounts = await Account.find(filter).select("-password");
    res.json({ mc: 200, me: "Accounts retrieved successfully", dt: accounts });
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

export const getAccountById = async (req, res) => {
  try {
    const { account_id } = req.params;
    const account = await Account.findById(account_id).select("-password");
    if (account) {
      res.json({ mc: 200, me: "Account retrieved successfully", dt: account });
    } else {
      res.status(404).json({ mc: 404, me: "Account not found" });
    }
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

// Admin only - Manage accounts
const checkEmailExists = async (email) => {
  const emailExists = await Account.findOne({ email: email });
  return !!emailExists;
};
export const createAccount = async (req, res) => {
  try {
    const { name, email, position, gender, role, department_id } = req.body;
    if (await checkEmailExists(email)) {
      return res.status(400).json({ mc: 400, me: "Email already exists" });
    }
    if (role === "Staff") {
      const newAccount = new Account({
        name,
        email,
        position,
        gender,
        role
      });
      await newAccount.save();
      return res.status(201).json({
        mc: 201, me: "Staff account created successfully", dt: {
          _id: newAccount._id,
          name: newAccount.name,
          email: newAccount.email,
          role: newAccount.role,
          token: generateToken(newAccount._id)
        }
      });
    } else if (role === "Officer") {
      const newAccount = new Account({
        name,
        email,
        position,
        gender,
        role,
        department_id
      });
      await newAccount.save();
      return res.status(201).json({
        mc: 201, me: "Officer account created successfully", dt: {
          _id: newAccount._id,
          name: newAccount.name,
          email: newAccount.email,
          role: newAccount.role,
          token: generateToken(newAccount._id)
        }
      });
    }
    res.status(400).json({ mc: 400, me: "Invalid role specified" });
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { account_id } = req.params;
    const { name, email, position, role, department_id, work_status, active } = req.body;
    const account = await Account.findByIdAndUpdate(account_id, {
      name,
      email,
      position,
      role,
      department_id,
      work_status,
      active
    }, { new: true }).select("-password");
    if (account) {
      res.json({ mc: 200, me: "Account updated successfully", dt: account });
    } else {
      res.status(404).json({ mc: 404, me: "Account not found" });
    }
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

// Officer/Staff - Manage own profile
export const getMyProfile = async (req, res) => {
  try {
    const account = await Account.findById(req.account._id).select("-password -createdAt -updatedAt -__v");
    if (account) {
      res.json({ mc: 200, me: "Profile retrieved successfully", dt: account });
    } else {
      res.status(404).json({ mc: 404, me: "Account not found" });
    }
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

export const updateMyPassword = async (req, res) => {
  try {
    const newPassword = req.body.password;
    const account = await Account.findById(req.account._id);

    if (account) {
      // pre-save hook will hash the password
      const [salt, hashedPassword] = await Promise.all([
        bcrypt.genSalt(10),
        bcrypt.hash(newPassword, salt)
      ]);
      account.password = hashedPassword;
      const updatedAccount = await account.save();

      res.json({
        mc: 200, me: "Password updated successfully", dt: {
          _id: updatedAccount._id,
          name: updatedAccount.name
        }
      });
    } else {
      res.status(404).json({ mc: 404, me: "Account not found" });
    }
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, email, position, gender, phone_number, avatar } = req.body;
    const account = await Account.findByIdAndUpdate(req.account._id, {
      name,
      email,
      position,
      gender,
      phone_number,
      avatar
    }, { new: true }).select("-password -createdAt -updatedAt -__v");
    if (account) {
      res.json({ mc: 200, me: "My profile updated successfully", dt: account });
    } else {
      res.status(404).json({ mc: 404, me: "Account not found" });
    }
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};