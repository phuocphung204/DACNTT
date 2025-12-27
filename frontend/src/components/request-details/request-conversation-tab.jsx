import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useImmer } from "use-immer";
import { Alert, Badge, Button, Form, Spinner } from "react-bootstrap";
import { BsPaperclip, BsSend } from "react-icons/bs";
import { toast } from "react-toastify";

import { useGetConversationQuery, useReplyToStudentMutation } from "#services/request-services";
import { requestConversationReplySchema } from "#schemas";
import { formatDateTime } from "#utils";
import { socket } from "services/axios-config";
import { SOCKET_EVENTS } from "#components/_variables";
import { getErrorMessage } from "#components/request-details/request-details-utils";

import styles from "../../pages/request-details/request-details-page.module.scss";

const RequestConversationTab = ({ requestId, isActive }) => {
  const [fileInputKey, setFileInputKey] = useState(() => Date.now());
  const [replyToMail, setReplyToMail] = useState(null);
  const [conversationMessages, setConversationMessages] = useImmer(() => ({
    messageFlow: [],
    mapIndex: {},
  }));

  const messageListRef = useRef(null);

  const {
    data: conversationData,
    isLoading: isConversationLoading,
    error: conversationError,
  } = useGetConversationQuery(requestId, {
    skip: !requestId,
  });

  const [replyToStudent, { isLoading: isReplying }] =
    useReplyToStudentMutation();

  const mustSendMailBefore = Boolean(conversationData?.dt?.messages?.length === 0);

  const {
    register: registerConversationReply,
    handleSubmit: handleSubmitConversationReply,
    setValue: setConversationReplyValue,
    watch: watchConversationReply,
    formState: { errors: conversationReplyErrors },
    reset: resetConversationReply,
  } = useForm({
    resolver: zodResolver(requestConversationReplySchema),
    mode: "all",
    defaultValues: {
      messageText: "",
      pendingFile: null,
    },
  });

  const pendingFile = watchConversationReply("pendingFile");

  useEffect(() => {
    setFileInputKey(Date.now());
    resetConversationReply();
    setReplyToMail(null);
    setConversationMessages((draft) => {
      draft.messageFlow = [];
      draft.mapIndex = {};
    });
  }, [requestId, resetConversationReply, setConversationMessages]);

  useEffect(() => {
    if (!isActive) return;
    if (!messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [isActive, conversationMessages.messageFlow]);

  useEffect(() => {
    const payload = conversationData?.dt;
    const rawMessages = Array.isArray(payload?.messages) ? payload.messages : [];
    const [, ...restMessages] = rawMessages;

    setReplyToMail(restMessages.at(-1) || null);
    setConversationMessages((draft) => {
      draft.messageFlow = restMessages;
      draft.mapIndex = {};
      restMessages.forEach((message, index) => {
        const messageId = message?.message_id;
        if (messageId) draft.mapIndex[messageId] = index;
      });
    });
  }, [conversationData, setConversationMessages]);

  useEffect(() => {
    const roomId = requestId;
    if (!roomId) return;

    const handleNewChatMessage = (payload) => {
      if (!payload) return;
      setConversationMessages((draft) => {
        const messageId = payload?.message_id;

        if (messageId && Object.prototype.hasOwnProperty.call(draft.mapIndex, messageId)) {
          const existingIndex = draft.mapIndex[messageId];
          draft.messageFlow[existingIndex] = payload;
          return;
        }

        if (!messageId) {
          const fallbackKey = payload?.google_message_id || payload?._id;
          if (fallbackKey) {
            const existingIndex = draft.messageFlow.findIndex(
              (msg) => (msg?.google_message_id || msg?._id) === fallbackKey
            );
            if (existingIndex !== -1) {
              draft.messageFlow[existingIndex] = payload;
              return;
            }
          }
        }

        draft.messageFlow.push(payload);
        if (messageId) {
          draft.mapIndex[messageId] = draft.messageFlow.length - 1;
        }
        setReplyToMail(payload);
      });
    };

    socket.on(SOCKET_EVENTS.NEW_CHAT_MESSAGE, handleNewChatMessage);
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, SOCKET_EVENTS.IN_CHAT_REQUEST_PREFIX(roomId));
    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_ROOM, SOCKET_EVENTS.IN_CHAT_REQUEST_PREFIX(roomId));
      socket.off(SOCKET_EVENTS.NEW_CHAT_MESSAGE, handleNewChatMessage);
    };
  }, [requestId, setConversationMessages]);

  const handlePickFile = (event) => {
    const file = event.target.files?.[0] || null;
    setConversationReplyValue("pendingFile", file, { shouldValidate: true });
  };

  const handleSendMessage = async (formValues) => {
    try {
      const response = await replyToStudent({
        requestId,
        payload: {
          text: formValues.messageText,
          message_id: replyToMail?.message_id || null,
          references: replyToMail?.references || null,
        },
      }).unwrap();

      const newMessage = response?.dt?.new_message;
      if (newMessage) {
        setConversationMessages((draft) => {
          draft.messageFlow.push(newMessage);

          const messageId = newMessage?.message_id;
          if (messageId) {
            draft.mapIndex[messageId] = draft.messageFlow.length - 1;
          }
        });
        setReplyToMail(newMessage);
      }

      toast.success("Đã gửi phản hồi");
      resetConversationReply();
      setFileInputKey(Date.now());
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể gửi phản hồi"));
    }
  };

  const conversationErrorMessage = conversationError
    ? getErrorMessage(conversationError, "Không thể tải lịch sử phản hồi")
    : "";

  return (
    <div className="d-flex flex-column gap-3">
      <div className={styles.messageList} ref={messageListRef}>
        {conversationErrorMessage ? (
          <Alert variant="danger" className="mb-0">
            {conversationErrorMessage}
          </Alert>
        ) : isConversationLoading ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        ) : conversationMessages.messageFlow.length === 0 ? (
          <div className="text-center text-muted py-3">
            Chưa có cuộc trao đổi nào.
          </div>
        ) : (
          conversationMessages.messageFlow.map((message, index) => {
            const isOfficer = message.sender_type === "Officer";
            const createdAt = message.created_at;
            const previousMessage = index > 0 ? conversationMessages.messageFlow[index - 1] : null;
            const previousMessageId = previousMessage?.message_id || null;
            const replyToId = message?.in_reply_to;
            const isReplyPreview = Boolean(replyToId) && replyToId !== previousMessageId;

            let replyToMessage = null;
            if (isReplyPreview && replyToId) {
              const replyIndex = conversationMessages.mapIndex?.[replyToId];
              if (typeof replyIndex === "number") {
                replyToMessage = conversationMessages.messageFlow[replyIndex];
              } else {
                replyToMessage = null;
              }
            }

            const replyPreviewAuthor = replyToMessage
              ? replyToMessage.sender_type === "Officer"
                ? replyToMessage.sender_id?.name || replyToMessage.sender_id?.email || "Nhân viên phòng ban"
                : "Sinh viên"
              : null;

            const replyPreviewContent = replyToMessage?.content || null;
            const keyId = `message-flow-${message?.message_id || message?._id || message?.google_message_id || index}`;
            return (
              <div
                key={keyId}
                className={`${styles.messageRow} ${isOfficer ? styles.messageRowOfficer : ""}`}
              >
                <div
                  className={`${styles.messageBubble} ${isOfficer ? styles.messageBubbleOfficer : ""}`}
                >
                  {isReplyPreview && replyToId && replyToMessage && (
                    <div className={styles.replyPreview}>
                      <div className={styles.replyPreviewAuthor}>
                        {replyPreviewAuthor}
                      </div>
                      <div className={styles.replyPreviewContent}>
                        {replyPreviewContent || "Tin nhắn trống"}
                      </div>
                    </div>
                  )}

                  <div className={styles.messageContent}>
                    {message.content || "Tin nhắn trống"}
                  </div>

                  {Array.isArray(message.attachments) &&
                    message.attachments.length > 0 && (
                      <div className={styles.chatAttachment}>
                        <BsPaperclip className="me-1" />
                        {message.attachments
                          .map(
                            (attachment) =>
                              attachment?.originalname || "Tệp đính kèm"
                          )
                          .join(", ")}
                      </div>
                    )}

                  <div className={styles.messageTime}>
                    {formatDateTime(createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {mustSendMailBefore ? (
        <Alert variant="info" className="mb-3">
          Vui lòng gửi phản hồi qua email trước khi trao đổi.
        </Alert>
      ) : (
        <Form
          noValidate
          onSubmit={handleSubmitConversationReply(handleSendMessage)}
          className={styles.composeArea}
        >
          <Form.Group controlId="conversationMessageText" className="mb-2">
            <Form.Label className="fw-semibold mb-1">
              Nhập tin nhắn
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Nhập nội dung trao đổi với sinh viên..."
              isInvalid={!!conversationReplyErrors.messageText}
              {...registerConversationReply("messageText")}
            />
            <Form.Control.Feedback type="invalid">
              {conversationReplyErrors.messageText?.message}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex flex-wrap align-items-start gap-2">
              <Form.Group controlId="conversationPendingFile" className="mb-0">
                <Form.Control
                  key={fileInputKey}
                  type="file"
                  size="sm"
                  onChange={handlePickFile}
                  isInvalid={!!conversationReplyErrors.pendingFile}
                />
                <Form.Control.Feedback type="invalid">
                  {conversationReplyErrors.pendingFile?.message}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Chức năng đính kèm tệp đang tạm thời bị khóa.
                </Form.Text>
              </Form.Group>

              {pendingFile && (
                <Badge bg="light" text="dark" className="align-self-center">
                  <BsPaperclip className="me-1" />
                  {pendingFile.name}
                </Badge>
              )}
            </div>

            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                type="button"
                onClick={() => {
                  resetConversationReply();
                  setFileInputKey(Date.now());
                }}
                disabled={isReplying}
              >
                Xóa
              </Button>
              <Button type="submit" variant="primary" disabled={isReplying}>
                {isReplying ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <BsSend className="me-1" />
                    Gửi
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

export default RequestConversationTab;
