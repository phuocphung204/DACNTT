import { z } from "zod";

export const resetPasswordRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu mới"),
  confirmPassword: z
    .string()
    .min(1, "Vui lòng nhập lại mật khẩu mới"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận chưa khớp",
  path: ["confirmPassword"],
});