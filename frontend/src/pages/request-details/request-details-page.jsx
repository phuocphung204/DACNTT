import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  ListGroup,
  Row,
  Spinner,
  Tab,
  Tabs,
} from "react-bootstrap";
import {
  BsArrowLeft,
  BsCheckCircle,
  BsChatDots,
  BsPaperclip,
  BsSend,
} from "react-icons/bs";
import { toast } from "react-toastify";

import {
  useDownloadAttachmentMutation,
  useGetRequestByIdQuery,
} from "#services/request-services";

import styles from "./request-details-page.module.scss";

const PRIORITY_LABELS = {
  1: "Khẩn cấp",
  2: "Cao",
  3: "Trung bình",
  4: "Thấp",
};

const PRIORITY_VARIANTS = {
  1: "danger",
  2: "warning",
  3: "info",
  4: "secondary",
};

const STATUS_LABELS = {
  Pending: "Mới nhận",
  Assigned: "Đang xử lý",
  InProgress: "Đang xử lý",
  Resolved: "Đã xử lý",
};

const STATUS_VARIANTS = {
  Pending: "secondary",
  Assigned: "warning",
  InProgress: "warning",
  Resolved: "success",
};

const normalizeStatus = (status) => {
  if (status === "Assigned") return "InProgress";
  if (status === "InProgress" || status === "Resolved" || status === "Pending") {
    return status;
  }
  return "Pending";
};

const padValue = (value) => String(value).padStart(2, "0");

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${padValue(date.getMonth() + 1)}-${padValue(
    date.getDate()
  )} ${padValue(date.getHours())}:${padValue(date.getMinutes())}`;
};

const getErrorMessage = (error, fallback) =>
  error?.data?.em ||
  error?.data?.message ||
  error?.error ||
  error?.message ||
  fallback;

const seedConversation = () => [
  {
    id: "m1",
    author: "Sinh viên",
    role: "student",
    content:
      "Em cần xác nhận giấy tờ liên quan đến chương trình học, mong phòng hỗ trợ giúp em.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "m2",
    author: "Officer",
    role: "officer",
    content:
      "Chào bạn, phòng đã tiếp nhận yêu cầu. Bạn vui lòng cho biết thời hạn cần nhận kết quả?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2.3).toISOString(),
  },
  {
    id: "m3",
    author: "Sinh viên",
    role: "student",
    content: "Em cần trước tuần sau ạ, em cảm ơn.",
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
];

const RequestDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState(seedConversation);
  const [messageText, setMessageText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(() => Date.now());
  const [downloadingId, setDownloadingId] = useState("");

  const messageListRef = useRef(null);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetRequestByIdQuery(id, {
    skip: !id,
  });

  const [downloadAttachment] = useDownloadAttachmentMutation();

  useEffect(() => {
    setMessages(seedConversation());
    setMessageText("");
    setPendingFile(null);
    setFileInputKey(Date.now());
  }, [id]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const detail = data?.dt;

  const normalizedStatus = normalizeStatus(detail?.status);
  const statusLabel = STATUS_LABELS[normalizedStatus] || "Khác";
  const statusVariant = STATUS_VARIANTS[normalizedStatus] || "secondary";

  const priorityLabel = PRIORITY_LABELS[Number(detail?.priority)] || "Trung bình";
  const priorityVariant =
    PRIORITY_VARIANTS[Number(detail?.priority)] || "secondary";

  const labelValue = detail?.label || detail?.prediction?.label || "Chưa gán";

  const attachments = useMemo(() => {
    if (!Array.isArray(detail?.attachments)) return [];
    return detail.attachments;
  }, [detail]);

  const handleDownloadAttachment = async (attachment) => {
    if (!attachment?._id) return;
    setDownloadingId(attachment._id);
    try {
      const blob = await downloadAttachment({
        requestId: id,
        attachmentId: attachment._id,
      }).unwrap();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.originalname || `attachment-${attachment._id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể tải tệp đính kèm"));
    } finally {
      setDownloadingId("");
    }
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    if (!messageText.trim() && !pendingFile) {
      toast.error("Vui lòng nhập tin nhắn hoặc đính kèm tệp");
      return;
    }
    const newMessage = {
      id: `local-${Date.now()}`,
      author: "Bạn",
      role: "officer",
      content: messageText.trim(),
      createdAt: new Date().toISOString(),
      attachmentName: pendingFile?.name,
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");
    setPendingFile(null);
    setFileInputKey(Date.now());
    toast.success("Đã gửi tin nhắn (demo)");
  };

  const handleMarkResolved = () => {
    toast.info("Coming soon: Tính năng đánh dấu hoàn thành sẽ sớm ra mắt");
  };

  const handleTemporaryReply = () => {
    toast.info("Coming soon: Tính năng trả lời tạm thời sẽ sớm ra mắt");
  };

  const handlePickFile = (event) => {
    const file = event.target.files?.[0];
    setPendingFile(file || null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  const errorMessage = error
    ? getErrorMessage(error, "Không thể tải chi tiết yêu cầu")
    : "";

  if (errorMessage) {
    return (
      <Alert variant="danger" className="mb-0">
        {errorMessage}
      </Alert>
    );
  }

  if (!detail) {
    return (
      <Alert variant="warning" className="mb-0">
        Không tìm thấy yêu cầu
      </Alert>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div>
          <Button
            variant="link"
            className="p-0 mb-2 d-inline-flex align-items-center gap-1"
            onClick={() => navigate(-1)}
          >
            <BsArrowLeft /> Quay lại
          </Button>
          <div className="text-muted small">
            Mã yêu cầu: <code>{detail._id}</code>
          </div>
          <h4 className="mb-1">{detail.subject || "Không có tiêu đề"}</h4>
          <div className="text-muted">
            {detail.student_email} • Mã SV: {detail.student_id}
          </div>
        </div>
        <div className="text-end">
          <div className="d-flex justify-content-end flex-wrap gap-2 mb-1">
            <Badge bg={statusVariant}>{statusLabel}</Badge>
            <Badge bg={priorityVariant}>{priorityLabel}</Badge>
            <Badge bg="secondary">
              Nhãn: {labelValue || "Chưa gán"}
            </Badge>
          </div>
          <div className="text-muted small">
            Cập nhật: {formatDateTime(detail.updated_at)}
          </div>
          <Button
            size="sm"
            variant="outline-secondary"
            className="mt-2"
            onClick={refetch}
            disabled={isFetching}
          >
            {isFetching ? <Spinner animation="border" size="sm" /> : "Làm mới"}
          </Button>
        </div>
      </div>

      <Row className="g-3">
        <Col xl={8} lg={7}>
          <Card>
            <Card.Body>
              <Tabs defaultActiveKey="detail" className="mb-3">
                <Tab eventKey="detail" title="Chi tiết">
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <div className="text-muted small mb-1">Tiêu đề</div>
                      <div className="fw-semibold">{detail.subject}</div>
                    </div>
                    <div>
                      <div className="text-muted small mb-1">Email sinh viên</div>
                      <div className="fw-semibold">{detail.student_email}</div>
                    </div>
                    <div>
                      <div className="text-muted small mb-1">Nhãn</div>
                      <Badge bg="info" text="dark">
                        {labelValue}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-muted small mb-1">Nội dung</div>
                      <div className="border rounded p-3 bg-light">
                        {detail.content || "Không có nội dung"}
                      </div>
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <BsPaperclip />
                        <span className="fw-semibold">Tệp đính kèm</span>
                      </div>
                      {attachments.length === 0 ? (
                        <div className="text-muted small">
                          Không có tệp đính kèm
                        </div>
                      ) : (
                        <ListGroup>
                          {attachments.map((attachment) => (
                            <ListGroup.Item
                              key={attachment._id}
                              className="d-flex justify-content-between align-items-center"
                            >
                              <div className="text-truncate me-2">
                                {attachment.originalname || "Tệp đính kèm"}
                              </div>
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleDownloadAttachment(attachment)}
                                disabled={downloadingId === attachment._id}
                              >
                                {downloadingId === attachment._id ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  "Tải xuống"
                                )}
                              </Button>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </div>
                  </div>
                </Tab>
                <Tab
                  eventKey="conversation"
                  title={
                    <span className="d-inline-flex align-items-center gap-1">
                      <BsChatDots /> Trao đổi
                    </span>
                  }
                >
                  <div className="d-flex flex-column gap-3">
                    <div className={styles.messageList} ref={messageListRef}>
                      {messages.length === 0 ? (
                        <div className="text-center text-muted py-3">
                          Chưa có cuộc trao đổi nào.
                        </div>
                      ) : (
                        messages.map((message) => {
                          const isOfficer = message.role === "officer";
                          return (
                            <div
                              key={message.id}
                              className={`${styles.messageRow} ${
                                isOfficer ? styles.messageRowOfficer : ""
                              }`}
                            >
                              <div
                                className={`${styles.messageBubble} ${
                                  isOfficer ? styles.messageBubbleOfficer : ""
                                }`}
                              >
                                <div className={styles.messageMeta}>
                                  {message.author} • {formatDateTime(message.createdAt)}
                                </div>
                                <div className={styles.messageContent}>
                                  {message.content || "Tin nhắn trống"}
                                </div>
                                {message.attachmentName && (
                                  <div className={styles.chatAttachment}>
                                    <BsPaperclip className="me-1" />
                                    {message.attachmentName}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <Form onSubmit={handleSendMessage} className={styles.composeArea}>
                      <div className="fw-semibold mb-2">
                        Nhập tin nhắn
                      </div>
                      <InputGroup className="mb-2">
                        <Form.Control
                          as="textarea"
                          rows={2}
                          placeholder="Nhập nội dung trao đổi với sinh viên..."
                          value={messageText}
                          onChange={(event) => setMessageText(event.target.value)}
                        />
                      </InputGroup>
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <Form.Control
                            key={fileInputKey}
                            type="file"
                            size="sm"
                            onChange={handlePickFile}
                          />
                          {pendingFile && (
                            <Badge bg="light" text="dark">
                              <BsPaperclip className="me-1" />
                              {pendingFile.name}
                            </Badge>
                          )}
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              setMessageText("");
                              setPendingFile(null);
                              setFileInputKey(Date.now());
                            }}
                          >
                            Xóa
                          </Button>
                          <Button type="submit" variant="primary">
                            <BsSend className="me-1" />
                            Gửi
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4} lg={5}>
          <Card className="mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <div>
                  <div className="text-muted small">Trạng thái</div>
                  <Badge bg={statusVariant}>{statusLabel}</Badge>
                </div>
                <div className="text-end">
                  <div className="text-muted small">Ưu tiên</div>
                  <Badge bg={priorityVariant}>{priorityLabel}</Badge>
                </div>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Ngày tạo</span>
                <span className="fw-semibold">
                  {formatDateTime(detail.created_at)}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Cập nhật</span>
                <span className="fw-semibold">
                  {formatDateTime(detail.updated_at)}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small">Nhãn</span>
                <span className="fw-semibold">{labelValue}</span>
              </div>
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <div className="fw-semibold mb-2">Ghi chú nội bộ</div>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Sắp ra mắt (coming soon...)"
                readOnly
              />
              <div className="text-muted small mt-2">
                Chức năng lưu ghi chú sẽ được bổ sung trong phiên bản tiếp theo.
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body className="d-flex flex-column gap-2">
              <Button variant="success" onClick={handleMarkResolved}>
                <BsCheckCircle className="me-1" />
                Đánh dấu hoàn thành
              </Button>
              <Button variant="outline-primary" onClick={handleTemporaryReply}>
                Trả lời tạm thời
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => navigate(-1)}
              >
                Quay lại danh sách
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RequestDetailsPage;
