import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Tab,
  Tabs,
} from "react-bootstrap";
import { BsArrowLeft, BsCheckCircle, BsChatDots, BsSend } from "react-icons/bs";
import { toast } from "react-toastify";

import { useGetRequestByIdQuery } from "#services/request-services";

import { formatDateTime } from "#utils";
import { REQUEST_PRIORITY_MODEL, REQUEST_STATUS } from "#components/_variables";
import RequestDetailTab from "#components/request-details/request-detail-tab";
import RequestConversationTab from "#components/request-details/request-conversation-tab";
import RequestSendMailTab from "#components/request-details/request-send-mail-tab";
import { getErrorMessage } from "#components/request-details/request-details-utils";

const normalizeStatus = (status) => {
  if (status === "Assigned") return "InProgress";
  if (status === "InProgress" || status === "Resolved" || status === "Pending") {
    return status;
  }
  return "Pending";
};

const TAB_KEYS_ENUM = Object.freeze({
  DETAIL: "detail",
  CONVERSATION: "conversation",
  SEND_MAIL: "send_mail",
});

const RequestDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const tabKey = useLocation().state?.tabKey ?? "detail";
  const [activeTabKey, setActiveTabKey] = useState(tabKey);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetRequestByIdQuery(id, {
    skip: !id,
  });

  const detail = data?.dt;

  const normalizedStatus = normalizeStatus(detail?.status);
  const statusLabel = REQUEST_STATUS[normalizedStatus]?.label || "Khác";
  const statusVariant = REQUEST_STATUS[normalizedStatus]?.variant || "secondary";
  const priorityLabel = REQUEST_PRIORITY_MODEL[Number(detail?.priority)]?.label || "Trung bình";
  const priorityVariant = REQUEST_PRIORITY_MODEL[Number(detail?.priority)]?.variant || "secondary";

  const labelValue = detail?.label || detail?.prediction?.label || "Chưa gán";

  const handleMarkResolved = () => {
    toast.info("Sắp ra mắt: Tính năng đánh dấu hoàn thành sẽ sớm ra mắt");
  };

  const handleTemporaryReply = () => {
    toast.info("Sắp ra mắt: Tính năng trả lời tạm thời sẽ sớm ra mắt");
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
              <Tabs activeKey={activeTabKey} onSelect={(key) => setActiveTabKey(key)} className="mb-3">
                <Tab eventKey={TAB_KEYS_ENUM.DETAIL} title="Chi tiết">
                  <RequestDetailTab requestId={id} detail={detail} />
                </Tab>
                <Tab
                  eventKey={TAB_KEYS_ENUM.CONVERSATION}
                  title={
                    <span className="d-inline-flex align-items-center gap-1">
                      <BsChatDots /> Trao đổi
                    </span>
                  }
                >
                  <RequestConversationTab
                    requestId={id}
                    isActive={activeTabKey === TAB_KEYS_ENUM.CONVERSATION}
                  />
                </Tab>
                <Tab
                  eventKey={TAB_KEYS_ENUM.SEND_MAIL}
                  title={
                    <span className="d-inline-flex align-items-center gap-1">
                      <BsSend /> Phản hồi
                    </span>
                  }
                >
                  <RequestSendMailTab requestId={id} detail={detail} />
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
                placeholder="Sắp ra mắt..."
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
