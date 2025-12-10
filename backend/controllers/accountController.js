import Account from "../models/Account.js";
import bcrypt from "bcryptjs";

export const updatePassword = async (req, res) => {
  try {

    const account = await Account.findById(req.account._id);

    if (account) {
      // pre-save hook will hash the password
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedAccount = await account.save();

      res.json({ mc: 200, me: "Password updated successfully", dt: {
        _id: updatedAccount._id,
        name: updatedAccount.name
      }});
    } else {
      res.status(404).json({ mc: 404, me: "account not found" });
    }
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

export const getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.find().select("-password");
    res.json({ mc: 200, me: "Accounts retrieved successfully", dt: accounts });
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

export const getAccountByDepartmentId = async (req, res) => {
  try {
    const { department_id } = req.params;
    const accounts = await Account.find({ department_id: department_id, role: "Officer", work_status: "Active", active: true }).select("-password -department_id -role -work_status -active -updatedAt -createdAt -__v");
    res.json({ mc: 200, me: "Accounts retrieved successfully", dt: accounts });
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};