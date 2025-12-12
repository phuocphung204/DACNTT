import Account from "../models/Account.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../controllers/authController.js";
import transporter from "../services/send_email_smtp.js";
import { supabase } from "../services/supabaseClient.js";


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
    const accounts = await Account.find(filter).select("-password").populate("department_id", "name");
    res.json({ mc: 200, me: "Accounts retrieved successfully", dt: accounts });
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};

export const getAccountById = async (req, res) => {
  try {
    const { account_id } = req.params;
    const account = await Account.findById(account_id).select("-password").populate("department_id", "name");
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
    const newAccount = new Account({
      name,
      email,
      position,
      gender,
      role,
      department_id
    });
    // await newAccount.save();
    // // Gửi email thông báo tài khoản đã được tạo với mật khẩu mặc định (nếu cần)
    // await transporter.sendMail({
    //   from: `"Support Team" <${process.env.MY_APP}>`,
    //   to: newAccount.email,
    //   subject: "Your Staff Account Has Been Created",
    //   text: `Hello ${newAccount.name},\n\nYour staff account has been created successfully.\n\nEmail: ${newAccount.email}\nPassword: Default@123\n\nPlease log in and change your password immediately.\n\nBest regards,\nSupport Team`
    // });

    const [account, emailsent] = await Promise.all([
      newAccount.save(),
      await transporter.sendMail({
        from: `"Support Team" <${process.env.MY_APP_NAME}>`,
        to: newAccount.email,
        subject: "Your Helpdesk Account Has Been Created / Tài khoản Helpdesk của bạn đã được tạo",
        text: `
          ENGLISH VERSION

          Hello ${newAccount.name},

          Your helpdesk account has been successfully created. Below are your account details:

          Name: ${newAccount.name}
          Email: ${newAccount.email}
          Position: ${newAccount.position}
          Gender: ${newAccount.gender}
          Role: ${newAccount.role}
          Department ID: ${newAccount.department_id}
          Default Password: ${process.env.DEFAULT_PASSWORD}

          Please log in and change your password immediately for security purposes.

          Best regards,
          Support Team


          TIẾNG VIỆT

          Xin chào ${newAccount.name},

          Tài khoản Helpdesk của bạn đã được tạo thành công. Thông tin tài khoản của bạn như sau:

          Tên: ${newAccount.name}
          Email: ${newAccount.email}
          Chức vụ: ${newAccount.position}
          Giới tính: ${newAccount.gender}
          Vai trò: ${newAccount.role}
          Mã phòng ban: ${newAccount.department_id}
          Mật khẩu mặc định: ${process.env.DEFAULT_PASSWORD}

          Vui lòng đăng nhập và đổi mật khẩu ngay để đảm bảo an toàn.

          Trân trọng,
          Đội Hỗ Trợ
          `,
        html: `
        <div style="font-family:Arial,Helvetica,sans-serif; color:#222; line-height:1.6; max-width:700px; margin:0 auto; padding:20px;">
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0; text-align:center;">
                <h2 style="margin:0; color:#0b5fff;">Support Team</h2>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff; border-radius:8px; padding:24px; box-shadow:0 2px 6px rgba(0,0,0,0.06);">

                <!-- ENGLISH BLOCK -->
                <h3 style="margin-top:0; color:#111;">English Version</h3>

                <p>Hello ${newAccount.name},</p>
                <p>Your helpdesk account has been successfully created. Here are your account details:</p>

                <table width="100%" style="background:#f7f9ff; padding:12px; border-radius:8px;">
                  <tr><td><strong>Name:</strong> ${newAccount.name}</td></tr>
                  <tr><td><strong>Email:</strong> ${newAccount.email}</td></tr>
                  <tr><td><strong>Position:</strong> ${newAccount.position}</td></tr>
                  <tr><td><strong>Gender:</strong> ${newAccount.gender}</td></tr>
                  <tr><td><strong>Role:</strong> ${newAccount.role}</td></tr>
                  <tr><td><strong>Department ID:</strong> ${newAccount.department_id}</td></tr>
                  <tr><td><strong>Default Password:</strong> ${process.env.DEFAULT_PASSWORD}</td></tr>
                </table>

                <p>Please log in and change your password immediately for security purposes.</p>

                <p style="text-align:center; margin:16px 0;">
                  <a href="${process.env.FRONTEND_URL}"
                    style="display:inline-block; padding:10px 18px; border-radius:6px; border:1px solid #0b5fff; text-decoration:none; font-weight:600;">
                    Go to Helpdesk
                  </a>
                </p>

                <hr style="margin:28px 0; border:none; border-top:1px solid #ddd;" />


                <!-- VIETNAMESE BLOCK -->
                <h3 style="margin-top:0; color:#111;">Phiên bản Tiếng Việt</h3>

                <p>Xin chào ${newAccount.name},</p>
                <p>Tài khoản Helpdesk của bạn đã được tạo thành công. Dưới đây là thông tin chi tiết:</p>

                <table width="100%" style="background:#f7f9ff; padding:12px; border-radius:8px;">
                  <tr><td><strong>Tên:</strong> ${newAccount.name}</td></tr>
                  <tr><td><strong>Email:</strong> ${newAccount.email}</td></tr>
                  <tr><td><strong>Chức vụ:</strong> ${newAccount.position}</td></tr>
                  <tr><td><strong>Giới tính:</strong> ${newAccount.gender}</td></tr>
                  <tr><td><strong>Vai trò:</strong> ${newAccount.role}</td></tr>
                  <tr><td><strong>Mã phòng ban:</strong> ${newAccount.department_id}</td></tr>
                  <tr><td><strong>Mật khẩu mặc định:</strong> ${process.env.DEFAULT_PASSWORD}</td></tr>
                </table>

                <p>Vui lòng đăng nhập và đổi mật khẩu ngay để đảm bảo an toàn.</p>

                <p style="text-align:center; margin:16px 0;">
                  <a href="${process.env.FRONTEND_URL}"
                    style="display:inline-block; padding:10px 18px; border-radius:6px; border:1px solid #0b5fff; text-decoration:none; font-weight:600;">
                    Vào hệ thống Helpdesk
                  </a>
                </p>

                <p style="margin-top:24px; color:#555;">
                  Need help? Reply to this email or contact IT Support.<br/>
                  Cần hỗ trợ? Hãy trả lời email này hoặc liên hệ Bộ phận CNTT.
                </p>

                <p style="color:#888; font-size:13px; margin-top:10px;">
                  Best regards / Trân trọng,<br/>
                  Support Team — ${process.env.MY_APP_NAME}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 0; text-align:center; color:#999; font-size:12px;">
                This is an automated message. Please do not reply. / Đây là email tự động. Vui lòng không trả lời.
              </td>
            </tr>
          </table>
        </div>
        `
      })
    ]);
    return res.status(201).json({
      mc: 201, me: "Staff account created successfully", dt: {
        _id: newAccount._id,
        name: newAccount.name,
        email: newAccount.email,
        role: newAccount.role,
        token: generateToken(newAccount._id)
      }
    });
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
    }, { new: true }).select("-password").populate("department_id", "name");
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
    const account = await Account.findById(req.account._id).select("-password -createdAt -updatedAt -__v").populate("department_id", "name");
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
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
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

export const uploadAvatar = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ mc: 400, me: "No file uploaded" });
    }
    const filename = `${Date.now()}_${file.originalname}`;
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filename, file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype
      });
    if (error) {
      return res.status(500).json({ mc: 500, me: error.message });
    }
    // tạo public URL
    const publicUrl = supabase.storage.from('uploads').getPublicUrl(filename).data.publicUrl;
    // Lưu vào trong Account
    req.account.avatar = publicUrl;
    await req.account.save();
    res.status(200).json({ mc: 200, me: "Image uploaded successfully", dt: { publicUrl, data } });
  } catch (error) {
    res.status(500).json({ mc: 500, me: error.message });
  }
};