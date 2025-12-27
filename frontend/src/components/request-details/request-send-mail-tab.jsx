import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Alert, Button, ButtonGroup, Col, Form, Row, Spinner } from "react-bootstrap";
import { BsPaperclip, BsSend } from "react-icons/bs";
import { toast } from "react-toastify";

import {
  useGetConversationQuery,
  useSendMailToStudentMutation,
} from "#services/request-services";
import { requestFeedbackMailSchema } from "#schemas";
import { formatDateTime } from "#utils";
import { userModalDialogStore, useShallow } from "#custom-hooks";
import { getErrorMessage, getPlainTextFromHtml } from "#components/request-details/request-details-utils";
import MailTemplatePicker from "#components/request-details/mail-template-picker";

import styles from "../../pages/request-details/request-details-page.module.scss";

const getEditedHtmlFromFrame = (frame, fallbackHtml) => {
  const doc = frame?.contentDocument;
  const html = doc?.documentElement?.outerHTML;
  if (!html) return fallbackHtml || "";
  return `<!doctype html>\n${html}`;
};

const RequestSendMailTab = ({ requestId, detail }) => {
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [mailViewMode, setMailViewMode] = useState("text");
  const [mailFrameHeight, setMailFrameHeight] = useState(360);

  const mailTemplatePreviewRef = useRef(null);

  const {
    register: registerFeedbackMail,
    handleSubmit: handleSubmitFeedbackMail,
    setValue: setFeedbackMailValue,
    watch: watchFeedbackMail,
    formState: { errors: feedbackMailErrors },
    reset: resetFeedbackMail,
  } = useForm({
    resolver: zodResolver(requestFeedbackMailSchema),
    mode: "onSubmit",
    defaultValues: {
      subject: "",
      content: "",
      html_content: "",
    },
  });

  const selectedTemplateHtml = watchFeedbackMail("html_content");

  const { push: pushModal } = userModalDialogStore(
    useShallow((state) => ({
      push: state.push,
    }))
  );

  const {
    data: conversationData,
    isLoading: isConversationLoading,
    isFetching: isConversationFetching,
    error: conversationError,
    refetch: refetchConversation,
  } = useGetConversationQuery(requestId, {
    skip: !requestId,
  });

  const [sendMailToStudent, { isLoading: isSendingMail }] =
    useSendMailToStudentMutation();

  useEffect(() => {
    resetFeedbackMail();
    setSelectedTemplateName("");
  }, [requestId, resetFeedbackMail]);

  const payload = conversationData?.dt;
  // const rawMessages = Array.isArray(payload?.messages) ? payload.messages : [];
  // const replyMessage = rawMessages[0] || null;
  const [replyMessage, setReplyMessage] = useState(null);

  useEffect(() => {
    const hasHtml = Boolean(replyMessage?.html_content?.trim());
    setMailViewMode(hasHtml ? "html" : "text");
  }, [replyMessage]);

  useEffect(() => {
    if (replyMessage?.html_content) {
      setMailFrameHeight(360);
    }
  }, [replyMessage?.html_content]);

  const conversationSubject =
    payload?.email_subject ||
    `Phản hồi về yêu cầu: ${detail?.subject || "Không có tiêu đề"}`;

  const handleOpenTemplatePicker = () => {
    const currentTemplateHtml = selectedTemplateHtml
      ? getEditedHtmlFromFrame(mailTemplatePreviewRef.current, selectedTemplateHtml)
      : "";
    if (currentTemplateHtml && currentTemplateHtml !== selectedTemplateHtml) {
      setFeedbackMailValue("html_content", currentTemplateHtml, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    pushModal({
      title: "Chọn mẫu email",
      bodyComponent: MailTemplatePicker,
      bodyProps: {
        initialTemplateName: selectedTemplateName,
        initialTemplateHtml: currentTemplateHtml || selectedTemplateHtml,
        onSelect: (template) => {
          const name = template?.name || "";
          const html = template?.html || "";
          setSelectedTemplateName(name);
          setFeedbackMailValue("html_content", html, {
            shouldValidate: true,
            shouldDirty: true,
          });
        },
      },
      size: "xl",
      buttons: [],
    });
  };

  const handleClearTemplate = () => {
    setSelectedTemplateName("");
    setFeedbackMailValue("html_content", "", {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleSendMail = async (formValues) => {
    if (replyMessage) {
      toast.info("Yêu cầu này đã được phản hồi, không thể phản hồi thêm.");
      return;
    }
    try {
      const subject = formValues.subject?.trim();
      const templateHtml = selectedTemplateHtml
        ? getEditedHtmlFromFrame(mailTemplatePreviewRef.current, selectedTemplateHtml)
        : "";
      const html = templateHtml || formValues.html_content?.trim();
      const contentText = selectedTemplateHtml ? "" : formValues.content?.trim();
      const text = contentText || (html ? getPlainTextFromHtml(html) : "");
      const res = await sendMailToStudent({
        requestId,
        payload: {
          text,
          subject: subject ? subject : undefined,
          html: html ? html : undefined,
        },
      }).unwrap();
      toast.success("Đã gửi phản hồi đến sinh viên");
      resetFeedbackMail({ subject: "", content: "", html_content: "" });
      setSelectedTemplateName("");
      setReplyMessage(res.dt?.message ?? null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể gửi phản hồi"));
    }
  };

  const handleMailFrameLoad = (event) => {
    const doc = event.currentTarget.contentDocument;
    const height = doc?.documentElement?.scrollHeight || 0;
    if (height) {
      setMailFrameHeight(Math.max(height + 8, 320));
    }
  };

  const renderMailMessage = (message) => {
    if (!message) return null;
    const isOfficer = message.sender_type === "Officer";
    const senderLabel = isOfficer
      ? message.sender_id?.name || message.sender_id?.email || "Cán bộ"
      : "Sinh viên";
    const createdAt = message.created_at || message.createdAt;
    const htmlContent = message.html_content?.trim() || "";
    const textContent = message.content?.trim() || "";
    const hasHtml = Boolean(htmlContent);
    const hasText = Boolean(textContent);
    const showHtml = hasHtml && (!hasText || mailViewMode === "html");

    return (
      <div className={styles.mailCard}>
        <div className={styles.mailHeader}>
          <div className={styles.mailHeaderTop}>
            <div className={styles.mailTitle}>Phản hồi qua email</div>
          </div>
          <div className={styles.mailMeta}>
            <div className={styles.mailMetaRow}>
              <span className={styles.mailMetaLabel}>Từ:</span>
              <span className={styles.mailMetaValue}>{senderLabel}</span>
            </div>
            <div className={styles.mailMetaRow}>
              <span className={styles.mailMetaLabel}>Đến:</span>
              <span className={styles.mailMetaValue}>{detail?.student_email || "-"}</span>
            </div>
            <div className={styles.mailMetaRow}>
              <span className={styles.mailMetaLabel}>Ngày:</span>
              <span className={styles.mailMetaValue}>{formatDateTime(createdAt)}</span>
            </div>
            <div className={styles.mailMetaRow}>
              <span className={styles.mailMetaLabel}>Chủ đề:</span>
              <span className={styles.mailMetaValue}>{conversationSubject}</span>
            </div>
          </div>
        </div>

        {hasHtml && hasText && (
          <div className={styles.mailSwitch}>
            <ButtonGroup size="sm">
              <Button
                type="button"
                variant={mailViewMode === "html" ? "primary" : "outline-primary"}
                onClick={() => setMailViewMode("html")}
              >
                HTML
              </Button>
              <Button
                type="button"
                variant={mailViewMode === "text" ? "primary" : "outline-primary"}
                onClick={() => setMailViewMode("text")}
              >
                Văn bản
              </Button>
            </ButtonGroup>
          </div>
        )}

        <div className={styles.mailBody}>
          {showHtml ? (
            <iframe
              title="Noi dung email"
              className={styles.mailBodyFrame}
              style={{ height: `${mailFrameHeight}px` }}
              scrolling="no"
              onLoad={handleMailFrameLoad}
              srcDoc={htmlContent}
            />
          ) : (
            <div className={styles.mailBodyText}>
              {textContent || "Tin nhắn trống"}
            </div>
          )}
        </div>

        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <div className={styles.mailAttachments}>
            <BsPaperclip className="me-1" />
            {message.attachments
              .map((attachment) => attachment?.originalname || "Tệp đính kèm")
              .join(", ")}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const rawMessages = Array.isArray(payload?.messages) ? payload.messages : [];
    const firstMessage = rawMessages.at(0) || null;
    setReplyMessage(firstMessage);
  }, [payload])

  const conversationErrorMessage = conversationError
    ? getErrorMessage(conversationError, "Không thể tải lịch sử phản hồi")
    : "";

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-end">
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={refetchConversation}
          disabled={isConversationFetching}
        >
          {isConversationFetching ? (
            <Spinner animation="border" size="sm" />
          ) : (
            "Làm mới"
          )}
        </Button>
      </div>

      {conversationErrorMessage && (
        <Alert variant="danger" className="mb-0">
          {conversationErrorMessage}
        </Alert>
      )}

      {isConversationLoading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
        </div>
      ) : !replyMessage ? (
        <div className="text-center text-muted py-3 border rounded bg-light">
          Chưa có phản hồi nào. Bạn có thể gửi email đầu tiên cho
          sinh viên.
        </div>
      ) : (
        renderMailMessage(replyMessage)
      )}

      {replyMessage ? (
        <Alert variant="info" className="mb-0">
          Yêu cầu này đã được phản hồi. Hiện tại bạn không thể gửi
          thêm phản hồi.
        </Alert>
      ) : (
        <Form
          onSubmit={handleSubmitFeedbackMail(handleSendMail)}
          className={styles.composeArea}
          noValidate
        >
          <Row className="g-2">
            <Col md={5}>
              <Form.Group controlId="mailSubject">
                <Form.Label className="fw-semibold">
                  Tiêu đề (tuỳ chọn)
                </Form.Label>
                <Form.Control
                  size="sm"
                  placeholder={conversationSubject}
                  isInvalid={!!feedbackMailErrors.subject}
                  disabled={isSendingMail || isConversationLoading}
                  {...registerFeedbackMail("subject")}
                />
                <Form.Control.Feedback type="invalid">
                  {feedbackMailErrors.subject?.message}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={7}>
              <Form.Group controlId="studentEmail">
                <Form.Label className="fw-semibold">
                  Người nhận
                </Form.Label>
                <Form.Control
                  size="sm"
                  value={detail?.student_email || "-"}
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>

          {!selectedTemplateHtml && (
            <Form.Group controlId="mailContent" className="mt-2">
              <Form.Label className="fw-semibold">
                Nội dung phản hồi (viết tay)
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Nhập nội dung email gửi cho sinh viên..."
                isInvalid={!!feedbackMailErrors.content}
                disabled={isSendingMail || isConversationLoading}
                {...registerFeedbackMail("content")}
              />
              <Form.Text className="text-muted">
                Có thể để trống nếu bạn đã chọn mẫu email.
              </Form.Text>
              <Form.Control.Feedback type="invalid">
                {feedbackMailErrors.content?.message}
              </Form.Control.Feedback>
            </Form.Group>
          )}

          <Form.Group controlId="mailTemplate" className="mt-2">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <div className="fw-semibold">Mẫu email (tuỳ chọn)</div>
                <div className="text-muted small">
                  {selectedTemplateName
                    ? `Đã chọn: ${selectedTemplateName}`
                    : "Chưa chọn mẫu email."}
                </div>
              </div>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline-primary"
                  onClick={handleOpenTemplatePicker}
                  disabled={isSendingMail || isConversationLoading}
                >
                  Chọn mẫu email
                </Button>
                {selectedTemplateName && (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline-danger"
                    onClick={handleClearTemplate}
                    disabled={isSendingMail || isConversationLoading}
                  >
                    Bỏ chọn
                  </Button>
                )}
              </div>
            </div>
            <Form.Control type="hidden" {...registerFeedbackMail("html_content")} />
            {selectedTemplateName && (
              <Form.Text className="text-muted">
                Email sẽ được gửi theo mẫu HTML đã chọn.
              </Form.Text>
            )}
          </Form.Group>

          {selectedTemplateHtml && (
            <div className="mt-2">
              <div className="fw-semibold mb-1">Xem trước mẫu email</div>
              <div className="text-muted small mb-2">
                Bạn có thể chỉnh sửa trực tiếp các vùng cho phép (contenteditable).
              </div>
              <div className="border rounded bg-white overflow-hidden">
                <iframe
                  ref={mailTemplatePreviewRef}
                  title="Xem trước mẫu email"
                  className="w-100"
                  style={{ height: 360, border: 0 }}
                  srcDoc={selectedTemplateHtml}
                />
              </div>
            </div>
          )}

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2">
            <div className="text-muted small">
              Lưu ý: Tệp đính kèm sẽ được hỗ trợ trong phiên bản
              sau.
            </div>
            <div className="d-flex gap-2">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => {
                  resetFeedbackMail();
                  setSelectedTemplateName("");
                }}
                disabled={isSendingMail || isConversationLoading}
              >
                Xóa
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSendingMail || isConversationLoading}
              >
                {isSendingMail ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <>
                    <BsSend className="me-1" />
                    Gửi phản hồi
                  </>
                )}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </div>
  );
};

export default RequestSendMailTab;
