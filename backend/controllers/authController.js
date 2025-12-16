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

export const generateToken = (_id) => {
	return jwt.sign({ _id }, process.env.JWT_SECRET, {
		expiresIn: "1d",
	});
};

const resetPassword = async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) {
			return res.status(400).json({ ec: 200, em: "Email is required" });
		}
		// Tìm account
		const account = await Account.findOne({ email: email });
		if (!account) {
			return res.status(404).json({ ec: 404, em: "account not found" });
		}

		// Tạo token reset
		const resetToken = generateResetToken(account._id);
		const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

		// Gửi email
		await transporter.sendMail({
			from: `"Your App" <${process.env.EMAIL_account}>`,
			to: email,
			subject: "Password Reset / Đặt lại mật khẩu",

			text: `
        English:
        You requested a password reset. Your reset link is valid for 2 minutes.
        Reset link: ${resetLink}

        Tiếng Việt:
        Bạn đã yêu cầu đặt lại mật khẩu. Liên kết đặt lại có hiệu lực trong 2 phút.
        Liên kết đặt lại mật khẩu: ${resetLink}
        `,

			html: `
        <div style="font-family:Arial,Helvetica,sans-serif; color:#222; line-height:1.5; max-width:700px; margin:0 auto; padding:20px;">
            <table role="presentation" width="100%" style="border-collapse:collapse;">
            
            <tr>
                <td style="padding:10px 0; text-align:center;">
                <h2 style="margin:0; color:#0b5fff;">Password Reset / Đặt lại mật khẩu</h2>
                </td>
            </tr>

            <tr>
                <td style="background:#ffffff; border-radius:8px; padding:24px; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                
                <!-- English Section -->
                <h3 style="margin-top:0; color:#111;">Hello,</h3>
                <p style="margin:8px 0;">
                    <strong>English:</strong><br/>
                    You requested a password reset. Your secure reset link is valid for <strong>2 minutes</strong>.
                </p>

                <p style="margin:8px 0;">
                    Click the link below to reset your password:
                </p>

                <p style="text-align:center; margin:16px 0;">
                    <a href="${resetLink}" 
                    style="display:inline-block; padding:10px 18px; border-radius:6px; background:#0b5fff; color:#fff; text-decoration:none; font-weight:600;">
                    Reset Password
                    </a>
                </p>

                <p style="margin:8px 0; font-size:14px; color:#555;">
                    Reset link: <a href="${resetLink}">${resetLink}</a>
                </p>

                <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

                <!-- Vietnamese Section -->
                <p style="margin:8px 0;">
                    <strong>Tiếng Việt:</strong><br/>
                    Bạn đã yêu cầu đặt lại mật khẩu. Liên kết đặt lại an toàn của bạn chỉ có hiệu lực trong <strong>2 phút</strong>.
                </p>

                <p>
                    Nhấn vào liên kết bên dưới để đặt lại mật khẩu:
                </p>

                <p style="text-align:center; margin:16px 0;">
                    <a href="${resetLink}" 
                    style="display:inline-block; padding:10px 18px; border-radius:6px; background:#0b5fff; color:#fff; text-decoration:none; font-weight:600;">
                    Đặt lại mật khẩu
                    </a>
                </p>

                <p style="margin:8px 0; font-size:14px; color:#555;">
                    Liên kết đặt lại mật khẩu: <a href="${resetLink}">${resetLink}</a>
                </p>

                <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

                <p style="margin:6px 0; color:#555;">
                    If you did not request this, please ignore this email.<br/>
                    Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email.
                </p>

                <p style="margin:12px 0 0 0; color:#888; font-size:13px;">
                    Best regards / Trân trọng,<br/>
                    Your App Support Team
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
			return res.status(404).json({ ec: 404, em: "account not found" });
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

export { /*handleRegister,*/ handleLogin, handleResetPassword, resetPassword };