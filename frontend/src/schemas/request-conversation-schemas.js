import { z } from "zod";

export const requestFeedbackMailSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .max(200, "Tiêu đề tối đa 200 ký tự")
      .optional(),
    content: z
      .string()
      .trim()
      .max(5000, "Nội dung tối đa 5000 ký tự")
      .optional(),
    html_content: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const hasContent = Boolean(values.content?.trim());
    const hasHtml = Boolean(values.html_content?.trim());
    if (!hasContent && !hasHtml) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Vui lòng nhập nội dung phản hồi hoặc chọn mẫu email",
      });
    }
  });

export const requestConversationReplySchema = z.object({
  messageText: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập nội dung tin nhắn")
    .max(5000, "Nội dung tối đa 5000 ký tự"),
  pendingFile: z
    .any()
    .nullable()
    .optional()
    .refine((file) => file == null, "Chức năng đính kèm tệp đang tạm thời bị khóa"),
});
