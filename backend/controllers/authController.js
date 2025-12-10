import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import transporter from "../services/send_email_smtp.js";
import Account from "../models/Account.js";

const generateResetToken = (accountId) => {
    return jwt.sign(
        { id: accountId, purpose: "reset" },
        process.env.RESET_PASSWORD_SECRET,
        { expiresIn: "1d" } // 1 day for testing
    );
};

const generateToken = (_id) => {
    return jwt.sign({ _id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });
};

const resetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ ec:200, em: "Email is required" });
        }
        // Tìm account
        const account = await Account.findOne({ email: email });
        if (!account) {
            return res.status(404).json({ ec:404, em: "account not found" });
        }

        // Tạo token reset
        const resetToken = generateResetToken(account._id);
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Gửi email
        await transporter.sendMail({
            from: `"Your App" <${process.env.EMAIL_account}>`,
            to: email,
            subject: "Reset Password",
            text: `You requested a password reset. Your reset link is valid for 2 minutes.
            Click here to reset your password: ${resetLink}`,
            html: `
        <p>You requested a password reset.</p>
        <p>Your reset link is valid for 2 minutes.</p>
        <p>Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>
      `,
        });

        res.json({ ec: 200, em: "Reset email sent" });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

const handleResetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token) {
            return res.status(400).json({ ec: 400, em: "Token is required" });
        }

        const decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
        if (!decoded || decoded.purpose !== "reset") {
            return res.status(400).json({ ec: 400, em: "Invalid token" });
        }

        // Find the account by ID
        const account = await Account.findById(decoded.id);
        if (!account) {
            return res.status(404).json({ ec:404, em: "account not found" });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(newPassword, salt);
        await account.save();
        res.json({ ec: 200, em: "Password reset successful" });
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

const handleRegister = async (req, res) => {
    try {
        const { name, email, password, position, gender, role, department_id } = req.body;

        // Check if account exists
        const accountExists = await Account.findOne({ email });
        if (accountExists) {
            return res.status(400).json({ ec: 400, em: "Email đã được sử dụng" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create account
        const account = await Account.create({
            name,
            email,
            password: hashedPassword,
            position,
            gender,
            role,
            department_id: department_id || null
        });

        if (account) {
            res.status(201).json({
                ec: 0,
                em: 'Đăng ký thành công',
                dt: {
                    _id: account._id,
                    name: account.name,
                    email: account.email,
                    role: account.role,
                    token: generateToken(account._id), // trả về token khi đăng ký thành công
                }
            });
        } else {
            res.status(400).json({ ec: 400, em: "Dữ liệu đăng ký không hợp lệ" });
        }
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

const handleLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for account
        const account = await Account.findOne({ email: email });

        if (account && (await bcrypt.compare(password, account.password))) {
            res.status(200).json({
                ec: 0,
                em: 'Đăng nhập thành công',
                dt: {
                    _id: account._id,
                    name: account.name,
                    email: account.email,
                    role: account.role,
                    token: generateToken(account._id), // trả về token khi đăng nhập thành công
                }
            });
        } else {
            res.status(401).json({ ec: 401, em: "Email hoặc mật khẩu không đúng" });
        }
    } catch (error) {
        res.status(500).json({ ec: 500, em: error.message });
    }
};

export { handleRegister, handleLogin, handleResetPassword, resetPassword };