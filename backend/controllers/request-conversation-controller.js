import Request from "../models/Request.js";
import RequestConversation from "../models/RequestConversation.js";
import { sendMail, replyToMail } from "../services/send_email_smtp.js";
import Account from "../models/Account.js";
import { convert } from "html-to-text";

// [GET] /api/requests/:requestId/conversation
export const getConversation = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Tìm cuộc hội thoại dựa trên request_id
    const conversation = await RequestConversation.findOne({ request_id: requestId })
      .populate({
        path: "messages.sender_id",
        select: "name avatar email role", // Lấy thông tin người gửi nếu là Officer
        model: Account
      });

    if (!conversation) {
      // Nếu chưa có hội thoại (ví dụ request tạo thủ công), trả về mảng rỗng
      return res.status(200).json({
        ec: 0,
        dt: { messages: [], internal_notes: [] },
        em: "No conversation found, returning empty."
      });
    }

    // Sắp xếp tin nhắn theo thời gian (cũ nhất -> mới nhất)
    conversation.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return res.status(200).json({
      ec: 0,
      dt: conversation,
      em: "Get conversation success"
    });

  } catch (error) {
    console.error("Error in getConversation:", error);
    return res.status(500).json({ ec: -1, em: "Error fetching conversation", error: error.message });
  }
};

// [POST] /api/requests/:requestId/send-mail
export const sendMailToStudent = async (req, res) => {
  try {
    const { requestId } = req.params;
    let { text, html, subject } = req.body;

    // Chuẩn hóa HTML thành Text nếu có HTML
    if (html) {
      text = convert(html, {
        wordwrap: 130
      });
    }

    const officerId = req.account?._id || null;
    if (!text) {
      return res.status(400).json({ ec: 1, em: "Content is required" });
    }

    // 1. Lấy thông tin Request để biết email sinh viên
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ ec: 2, em: "Request not found" });
    }
    const safeSubject = subject || `Phản hồi về yêu cầu: ${request.subject}`;
    const studentEmail = request.student_email;

    // 2. Lấy Refresh Token để gửi mail qua Gmail API
    const refreshToken = req.account?.google_info?.gmail_modify?.refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ ec: 3, em: "Bạn chưa liên kết tài khoản Google để thực hiện gửi mail." });
    }

    // 3. Gửi mail và lấy threadId
    let sentData;
    try {
      sentData = await sendMail({
        from: req.account.email,
        refreshToken: refreshToken,
        to: studentEmail,
        subject: safeSubject,
        text: text,
        html: html
      });
    } catch (err) {
      console.error("Gmail Send Error:", err);
      return res.status(500).json({ ec: 4, em: "Lỗi gửi mail: " + err.message });
    }

    const { id: googleMessageId, threadId, messageId } = sentData;

    // 4. Lưu tin nhắn vào Database
    let conversation = await RequestConversation.findOne({ request_id: requestId });

    // Nếu chưa có conversation (Request tạo thủ công), thì tạo mới
    if (!conversation) {
      conversation = new RequestConversation({
        request_id: requestId,
        google_thread_id: threadId, // <--- Lưu threadId quan trọng ở đây
        email_subject: safeSubject, // Lưu subject để hiển thị
        messages: [],
        internal_notes: []
      });
    } else {
      // Nếu đã có conversation nhưng chưa có threadId (ví dụ request cũ), cập nhật luôn
      if (!conversation.google_thread_id) {
        conversation.google_thread_id = threadId;
      }
      // Cập nhật subject nếu chưa có
      if (!conversation.email_subject) {
        conversation.email_subject = safeSubject;
      }
    }

    const newMessage = {
      channel: "Email",
      sender_type: "Officer",
      sender_id: officerId,
      content: text,
      html_content: html || null,
      attachments: [], // Xử lý file đính kèm sau nếu cần
      message_id: messageId,
      google_message_id: googleMessageId, // <--- Lưu messageId để tham chiếu
      created_at: sentData?.internalDate ? new Date(parseInt(sentData.internalDate)) : new Date()
    };

    conversation.messages.push(newMessage);
    await conversation.save();

    // 5. Cập nhật trạng thái Request (Optional)
    // Nếu đang Assigned hoặc Pending -> Chuyển sang InProgress vì Officer đã trả lời
    if (request.status === "Assigned" || request.status === "Pending") {
      request.status = "InProgress";
      await request.save();
    }

    return res.status(200).json({
      ec: 0,
      dt: { new_message: newMessage, threadId },
      em: "Reply sent and saved successfully"
    });

  } catch (error) {
    console.error("Error in replyToStudent:", error);
    return res.status(500).json({ ec: -1, em: "Error sending reply", error: error.message });
  }
};

/**
 * @param {*} req 
 * @param {*} res 
 * @description
 * [POST] /api/requests/:requestId/reply 
 * message_id và references nhận từ req.body là tùy chọn, là thông tin của mail được chọn để reply.
 */
export const replyToStudent = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { text, html, subject, message_id, references } = req.body;
    const officerId = req.account?._id || null;

    if (!text) {
      return res.status(400).json({ ec: 1, em: "Content is required" });
    }

    // 1. Lấy thông tin Request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ ec: 2, em: "Request not found" });
    }
    const studentEmail = request.student_email;

    // 2. Lấy Refresh Token
    const refreshToken = req.account?.google_info?.gmail_modify?.refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ ec: 3, em: "Bạn chưa liên kết tài khoản Google để thực hiện gửi mail." });
    }

    // 3. Lấy thông tin Conversation
    let conversation = await RequestConversation.findOne({ request_id: requestId });
    if (!conversation) {
      return res.status(404).json({ ec: 4, em: "Conversation not found. Please use send-mail first." });
    }

    const threadId = conversation.google_thread_id;
    const currentSubject = subject || conversation.email_subject || `Re: ${request.subject}`;

    // 4. Xử lý In-Reply-To và References
    let inReplyTo = null;
    let refList = references; // Mong đợi là mảng string

    // Tìm tin nhắn cha để reply

    let parentMsg = null;
    if (message_id) {
      // Tìm theo message_id (RFC)
      parentMsg = conversation.messages.find(m => m.message_id === message_id);
    }

    // Nếu không có message_id hoặc không tìm thấy, lấy tin nhắn cuối cùng
    if (!parentMsg) {
      const emailMsgs = conversation.messages.filter(m => m.message_id);
      if (emailMsgs.length > 0) {
        parentMsg = emailMsgs.at(-1);
      }
    }

    // Nếu không truyền references, tự tìm trong DB
    if (parentMsg) {
      inReplyTo = parentMsg.message_id; // Sử dụng Message-ID chuẩn RFC cho header
      if (!refList) {
        refList = [...(parentMsg.references || [])];
      }
    }
    const smartReferences = makeSmartReferences(inReplyTo, refList);
    // Chuyển refList thành string header (nếu là mảng)
    const referencesHeader = smartReferences[1];

    // 5. Gửi mail
    const sentData = await replyToMail({
      from: req.account.email,
      refreshToken: refreshToken,
      to: studentEmail,
      subject: currentSubject,
      text: text,
      html: html,
      inReplyTo: inReplyTo,
      references: referencesHeader,
      threadId: threadId
    });

    const { id: newGoogleMessageId, threadId: newThreadId, messageId } = sentData;

    // 6. Lưu vào DB
    if (newThreadId && conversation.google_thread_id !== newThreadId) {
      conversation.google_thread_id = newThreadId;
    }

    // Chuẩn bị references dạng mảng để lưu DB
    let savedReferences = smartReferences[0];

    const newMessage = {
      channel: "Email",
      sender_type: "Officer",
      sender_id: officerId,
      content: text,
      attachments: [],
      message_id: messageId,
      in_reply_to: inReplyTo,
      google_message_id: newGoogleMessageId,
      references: savedReferences, // Chỉ chứa các ID của tin nhắn trước đó
      created_at: new Date()
    };

    conversation.messages.push(newMessage);
    await conversation.save();

    return res.status(200).json({ ec: 0, dt: { new_message: newMessage }, em: "Reply sent successfully" });

  } catch (error) {
    return res.status(500).json({ ec: -1, em: error.message });
  }
};

/**
 * Tạo References mới và tự động cắt giảm nếu quá dài
 * @param {string} parentMessageId - ID của mail cha
 * @param {Array<string>} parentRefsArray - Mảng References của mail cha
 * @param {number} limit - Giới hạn số lượng ID (Mặc định 20)
 */
const makeSmartReferences = (parentMessageId, parentRefsArray = [], limit = 50) => {
  // Lọc Boolean để loại bỏ null/undefined nếu parentMessageId không có
  const fullList = [...parentRefsArray, parentMessageId].filter(Boolean);

  if (fullList.length <= limit) {
    return [fullList, fullList.join(' ')];
  }

  // 3. NẾU QUÁ DÀI -> ÁP DỤNG THUẬT TOÁN CẮT GIỮA
  // Giữ lại phần tử đầu tiên (ROOT)
  const rootId = fullList[0];

  // Giữ lại (limit - 1) phần tử cuối cùng
  // Ví dụ limit=20, thì lấy 19 cái cuối
  const tailIds = fullList.slice(-(limit - 1));

  // Gộp lại: [ROOT] + [Đuôi]
  // Lưu ý: Nếu rootId trùng với phần tử đầu của tailIds thì lọc bỏ để tránh trùng
  const smartList = [rootId, ...tailIds.filter(id => id !== rootId)];

  return [smartList, smartList.join(' ')];
}
