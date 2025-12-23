import { z } from "zod";

const ACCOUNT_ROLES = ["Officer", "Staff", "Admin"];
const WORK_STATUSES = ["Active", "OnLeave", "Retired"];

const accountBaseSchema = z.object({
  name: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  position: z.string().trim().min(2, "Vui lòng nhập chức vụ"),
  gender: z.enum(["Male", "Female"], { required_error: "Vui lòng chọn giới tính" }),
  role: z.enum(ACCOUNT_ROLES, { required_error: "Vui lòng chọn vai trò" }),
  department_id: z.string().min(1, "Vui lòng chọn phòng ban"),
  work_status: z.enum(WORK_STATUSES, { required_error: "Vui lòng chọn trạng thái" }),
  active: z.boolean(),
});

export const createAccountSchema = accountBaseSchema.extend({
  work_status: accountBaseSchema.shape.work_status.default("Active"),
  active: accountBaseSchema.shape.active.default(true),
});

export const updateAccountSchema = accountBaseSchema.partial();
