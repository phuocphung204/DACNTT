import { useEffect, useState } from "react";
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

import { useGetRequestByIdQuery, useSearchKnowledgeBaseQuery, useUpdateRequestByOfficerMutation } from "#services/request-services";

import { formatDateTime } from "#utils";
import { REQUEST_PRIORITY_MODEL, REQUEST_STATUS } from "#components/_variables";
import RequestDetailTab from "#components/request-details/request-detail-tab";
import RequestConversationTab from "#components/request-details/request-conversation-tab";
import RequestSendMailTab from "#components/request-details/request-send-mail-tab";
import { getErrorMessage } from "#components/request-details/request-details-utils";
import { useGetConversationQuery, useLazyGetConversationQuery } from "services/request-services";

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

  const [updateRequestByOfficer, { isLoading: isUpdatingStatus }] = useUpdateRequestByOfficerMutation();
  const [getConversation] = useLazyGetConversationQuery();
  const [labelSearch, setLabelSearch] = useState("");
  const [keywordSearch, setKeywordSearch] = useState("");
  const [searchParams, setSearchParams] = useState(null);

  const detail = data?.dt;

  const statusLabel = REQUEST_STATUS[detail?.status]?.label || "Khác";
  const statusVariant = REQUEST_STATUS[detail?.status]?.variant || "secondary";
  const priorityLabel = REQUEST_PRIORITY_MODEL[Number(detail?.priority)]?.label || "Trung bình";
  const priorityVariant = REQUEST_PRIORITY_MODEL[Number(detail?.priority)]?.variant || "secondary";

  const labelValue = detail?.label || detail?.prediction?.label || "Chưa gán";

  useEffect(() => {
    if (labelValue && labelValue !== "Chưa gán") {
      setLabelSearch(labelValue);
      setSearchParams({ label: labelValue });
    }
  }, [labelValue]);

  const {
    data: knowledgeData,
    isFetching: isKnowledgeFetching,
    error: knowledgeError,
  } = useSearchKnowledgeBaseQuery(searchParams, {
    skip: !searchParams?.label,
  });

  const knowledgeItems = knowledgeData?.dt || [];

  const handleKnowledgeSearchSubmit = (event) => {
    event.preventDefault();
    if (!labelSearch?.trim()) {
      toast.warn("Vui lòng nhập nhãn để tìm kiếm");
      return;
    }
    const params = { label: labelSearch.trim() };
    if (keywordSearch.trim()) {
      params.q = keywordSearch.trim();
    }
    setSearchParams(params);
  };

  const handleResetKnowledgeSearch = () => {
    const fallbackLabel = labelValue !== "Chưa gán" ? labelValue : "";
    setLabelSearch(fallbackLabel);
    setKeywordSearch("");
    setSearchParams(fallbackLabel ? { label: fallbackLabel } : null);
  };

  const statusActionLabel = detail?.status === "Resolved"
    ? null
    : detail?.status === "Assigned"
      ? "Nhận yêu cầu"
      : "Đánh dấu hoàn thành";

  const statusActionVariant = detail?.status === "Assigned" ? "primary" : "success";

  const handleStatusAction = async () => {
    if (!detail?._id) return;
    const nextStatus = detail.status === "Assigned" ? "InProgress" : "Resolved";
    try {
      await updateRequestByOfficer({ requestId: id, payload: { status: nextStatus } }).unwrap();
      toast.success(nextStatus === "InProgress" ? "Đã nhận yêu cầu" : "Đã đánh dấu hoàn thành");
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cập nhật trạng thái thất bại"));
    }
  };

  const handleRefresh = () => {
    try {
      refetch();
      getConversation(id);
    } catch (err) {
      console.error(err);
    }
  }

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
            onClick={handleRefresh}
            disabled={isFetching}
          >
            {isFetching ? <Spinner animation="border" size="sm" /> : "Làm mới"}
          </Button>
        </div>
      </div>

      <Row className="g-3">
        <Col xl={8} lg={7}>
          <Card className="position-sticky" style={{ top: "5rem" }}>
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
              <div className="fw-semibold mb-2">Tìm kiếm knowledge base</div>
              <Form onSubmit={handleKnowledgeSearchSubmit} className="d-flex flex-column gap-2 mb-3">
                <Form.Group controlId="knowledgeLabel">
                  <Form.Label className="small text-muted mb-1">Nhãn</Form.Label>
                  <Form.Control
                    size="sm"
                    placeholder="Nhập nhãn (ví dụ: Học vụ, Học phí...)"
                    value={labelSearch}
                    onChange={(e) => setLabelSearch(e.target.value)}
                    disabled
                  />
                </Form.Group>
                <Form.Group controlId="knowledgeKeyword">
                  <Form.Label className="small text-muted mb-1">Từ khóa (tùy chọn)</Form.Label>
                  <Form.Control
                    size="sm"
                    placeholder="Tìm theo tiêu đề hoặc nội dung"
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                  />
                </Form.Group>
                <div className="d-flex justify-content-end gap-2">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    type="button"
                    onClick={handleResetKnowledgeSearch}
                    disabled={isKnowledgeFetching}
                  >
                    Đặt lại
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    type="submit"
                    disabled={!labelSearch?.trim() || isKnowledgeFetching}
                  >
                    {isKnowledgeFetching ? <Spinner animation="border" size="sm" /> : "Tìm kiếm"}
                  </Button>
                </div>
              </Form>

              {knowledgeError && (
                <Alert variant="danger" className="mb-2">
                  {getErrorMessage(knowledgeError, "Không thể tải knowledge base")}
                </Alert>
              )}

              {isKnowledgeFetching && (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" />
                </div>
              )}

              {!isKnowledgeFetching && knowledgeItems.length === 0 && (
                <div className="text-muted small">Không có knowledge base phù hợp.</div>
              )}

              {!isKnowledgeFetching && knowledgeItems.length > 0 && (
                <div
                  className="d-flex flex-column gap-2 overflow-auto"
                  style={{ maxHeight: "240px" }}
                >
                  {knowledgeItems.map((item) => (
                    <div key={item._id || item.title} className="border rounded p-2">
                      <div className="fw-semibold mb-1">{item.title}</div>
                      <div className="text-muted small" style={{ whiteSpace: "pre-line" }}>
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              {statusActionLabel && (
                <Button variant={statusActionVariant} onClick={handleStatusAction} disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? <Spinner animation="border" size="sm" className="me-2" /> : <BsCheckCircle className="me-1" />}
                  {statusActionLabel}
                </Button>
              )}
              <Button variant="outline-primary" onClick={() => setActiveTabKey(TAB_KEYS_ENUM.SEND_MAIL)}>
                Gửi phản hồi qua email
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
