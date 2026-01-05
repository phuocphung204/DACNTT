import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, ListGroup, Spinner } from "react-bootstrap";
import { BsCheckCircle, BsPersonPlus } from "react-icons/bs";
import { toast } from "react-toastify";

import {
  useApplyPredictionByRequestIdMutation,
  useAssignRequestToOfficerMutation,
  useDownloadAttachmentMutation,
  useGetRequestByIdQuery,
  useGetReplyMailQuery,
} from "#services/request-services";
import {
  useGetAllLabelsQuery,
} from "#services/department-services";
import { useGetDepartmentAndAccountsWithLabelsQuery, useGetOfficersByDepartmentQuery } from "#services/account-services";
import { REQUEST_PRIORITY, REQUEST_PRIORITY_MODEL, REQUEST_STATUS } from "#components/_variables";
import { formatDateTime } from "#utils/format";

import { getErrorMessage } from "./helpers";
import styles from "../../pages/staff-requests-process/staff-requests-process-page.module.scss";

const RequestDetailModalBody = ({ requestId, onAssigned, activeTab = "pending" }) => {
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    departmentId: "",
    label: "",
    priority: 3,
    officerId: "",
  });
  const [replyViewMode, setReplyViewMode] = useState("html");
  const [downloadingId, setDownloadingId] = useState("");
  const {
    data: detailResponse,
    isLoading,
    error,
    refetch,
  } = useGetRequestByIdQuery(requestId, { skip: !requestId });

  const {
    data: replyMailResponse,
    isLoading: replyMailLoading,
  } = useGetReplyMailQuery(requestId, { skip: !requestId || activeTab !== "resolved" });

  const replyMail = replyMailResponse?.dt;

  const detail = detailResponse?.dt;
  const predictionDepartmentId = detail?.prediction?.department_id;
  const {
    data: predictionOfficersResponse,
    refetch: refetchPredictionOfficers,
  } = useGetOfficersByDepartmentQuery(
    predictionDepartmentId,
    { skip: !predictionDepartmentId }
  );
  const currentOfficerDisplay = useMemo(() => {
    const assignedTo = detail?.assigned_to;
    const officer = Array.isArray(predictionOfficersResponse?.dt)
      ? predictionOfficersResponse.dt.find((item) => item._id === assignedTo)
      : null;
    if (!officer) return "Chưa có";
    return `${officer.name} - đang nhận: ${officer.total_requests_count || 0} - đang xử lý: ${officer.in_progress_requests_count || 0}`;
  }, [detail, predictionOfficersResponse]);

  const predictionOfficers = useMemo(() => {
    const list = Array.isArray(predictionOfficersResponse?.dt)
      ? predictionOfficersResponse.dt
      : [];
    return list;
  }, [predictionOfficersResponse]);

  const { data: allLabelsResponse } = useGetAllLabelsQuery(undefined, {
    skip: showManual === false,
  });

  const manualLabels = useMemo(() => {
    const list = Array.isArray(allLabelsResponse?.dt) ? allLabelsResponse.dt : [];
    return list;
  }, [allLabelsResponse]);

  const {
    data: officersByLabelResponse,
    refetch: refetchOfficersByLabel,
  } = useGetDepartmentAndAccountsWithLabelsQuery(
    manualForm.label,
    { skip: !manualForm.label || !showManual }
  );

  const [manualOfficers, manualDepartment] = useMemo(() => {
    const list = Array.isArray(officersByLabelResponse?.dt?.accounts)
      ? officersByLabelResponse.dt.accounts
      : [];
    const department = officersByLabelResponse?.dt?.department || null;
    return [list, department];
  }, [officersByLabelResponse]);

  const derivedDepartmentId = manualDepartment?._id || "";
  const derivedDepartmentName = manualDepartment?.name || "";

  useEffect(() => {
    if (!selectedOfficer && predictionOfficers?._id) {
      setSelectedOfficer(predictionOfficers._id);
    }
  }, [predictionOfficers, selectedOfficer]);

  useEffect(() => {
    if (activeTab !== "pending") return; // chỉ kiểm tra khi tab pending
    if (!manualLabels || manualLabels.length === 0) {
      setManualForm((prev) => ({ ...prev, label: "" }));
      return;
    }
    const isLabelValid = manualLabels.some((item) => item.label === manualForm.label);
    if (!isLabelValid) {
      setManualForm((prev) => ({
        ...prev,
        label: manualLabels[0].label,
        officerId: "",
      }));
    }
  }, [manualForm.label, manualLabels, activeTab]);

  useEffect(() => {
    if (activeTab !== "pending") return; // chỉ kiểm tra khi tab pending
    if (derivedDepartmentId && derivedDepartmentId !== manualForm.departmentId) {
      setManualForm((prev) => ({ ...prev, departmentId: derivedDepartmentId }));
    }
  }, [derivedDepartmentId, manualForm.departmentId, activeTab]);

  useEffect(() => {
    if (activeTab !== "pending") return; // chỉ kiểm tra khi tab pending
    if (manualOfficers.length === 0) {
      setManualForm((prev) => ({ ...prev, officerId: "" }));
      return;
    }
    const isOfficerValid = manualOfficers.some((item) => item._id === manualForm.officerId);
    if (!isOfficerValid) {
      setManualForm((prev) => ({
        ...prev,
        officerId: manualOfficers?._id || "",
      }));
    }
  }, [manualForm.officerId, manualOfficers, activeTab]);

  useEffect(() => { // Theo dõi tab assigned thay đổi để set form phân công thủ công
    if (activeTab === "assigned") {
      console.log("Active tab is 'assigned', setting manual form from detail", detail);
      const priority = detail?.priority;
      const departmentId = detail?.department_id?._id;
      const label = detail?.label;
      setManualForm({
        departmentId: departmentId || "",
        label: label || "",
        priority: priority !== undefined ? Number(priority) : 0,
      });
    }
  }, [activeTab, detail]);

  useEffect(() => {
    console.log("Manual form updated:", manualForm);
  }, [manualForm]);

  useEffect(() => {
    if (!replyMail) return;
    if (replyMail?.original_html_content) {
      setReplyViewMode("html");
    } else {
      setReplyViewMode("text");
    }
  }, [replyMail]);

  const [_usePrediction, { isLoading: predictionLoading }] =
    useApplyPredictionByRequestIdMutation();
  const [assignRequest, { isLoading: manualLoading }] =
    useAssignRequestToOfficerMutation();
  const [downloadAttachment] = useDownloadAttachmentMutation();

  const sortedHistory = useMemo(() => {
    if (!Array.isArray(detail?.history)) return [];
    return [...detail.history].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
  }, [detail?.history]);

  const handleUsePrediction = async () => {
    if (!selectedOfficer) {
      toast.error("Vui lòng chọn nhân viên phù hợp");
      return;
    }
    try {
      const response = await _usePrediction({
        requestId,
        assignedTo: selectedOfficer,
      }).unwrap();
      if (!response || response.ec !== 200) {
        throw new Error(response?.em || "Không thể phân công tự động");
      }
      toast.success("Đã phân công theo dự đoán");
      onAssigned?.();
      refetchPredictionOfficers?.();
      refetch?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể phân công tự động"));
    }
  };

  const handleManualAssign = async () => {
    console.log("Manual form data:", manualForm);
    if (!manualForm.departmentId || !manualForm.label || !manualForm.officerId) {
      toast.error("Vui lòng hoàn tất thông tin phân công");
      return;
    }
    try {
      const response = await assignRequest({
        requestId,
        payload: {
          assigned_to: manualForm.officerId,
          priority: Number(manualForm.priority) || 0,
          label: manualForm.label,
          department_id: manualForm.departmentId,
        },
      }).unwrap();
      if (!response || response.ec !== 200) {
        throw new Error(response?.em || "Không thể phân công thủ công");
      }
      toast.success("Đã phân công thủ công");
      onAssigned?.();
      if (activeTab === "pending") refetchOfficersByLabel?.();
      if (activeTab === "assigned") refetchPredictionOfficers?.();
      refetch?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể phân công thủ công"));
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    if (!attachment?._id) return;
    setDownloadingId(attachment._id);
    try {
      const blob = await downloadAttachment({
        requestId,
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

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
      </div>
    );
  }

  const errorMessage = error
    ? getErrorMessage(error, "Không thể tải chi tiết")
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

  const predictionLabel = detail?.prediction?.category?.label || detail?.label || "Chưa có";
  const predictionLabelScore = detail?.prediction?.category?.score;
  const predictionPriorityLabel = REQUEST_PRIORITY_MODEL[detail?.prediction?.priority?.label_id]?.label;
  const predictionPriorityScore = detail?.prediction?.priority?.score;
  const hasPrediction = Boolean(predictionDepartmentId);

  const renderButton = (tabKey) => {
    if (tabKey === "pending") {
      return (
        <>
          <Button
            size="sm"
            variant="success"
            onClick={handleUsePrediction}
            disabled={!hasPrediction || !selectedOfficer || predictionLoading}
          >
            {predictionLoading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <BsCheckCircle className="me-1" />
            )}
            Dùng dự đoán
          </Button>
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => setShowManual((prev) => !prev)}
          >
            <BsPersonPlus className="me-1" />
            Tự phân nhân
          </Button>
        </>
      );
    }
    if (tabKey === "assigned") {
      return (
        <Button
          size="sm"
          variant="outline-primary"
          onClick={handleManualAssign}
        >
          <BsPersonPlus className="me-1" />
          Phân công lại
        </Button>
      );
    }
    return null;
  }

  return (
    <div>
      <div className={styles.suggestionBar}>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Badge bg="primary">
            Hệ thống đề xuất
          </Badge>
          <span className="fw-semibold">
            Nhãn: {predictionLabel || "Chưa có"}
          </span>
          {predictionLabelScore !== undefined && (
            <span className="text-muted">
              - Độ tin cậy: {(Number(predictionLabelScore) * 100).toFixed(0)}%
            </span>
          )}
          <span className="fw-semibold">
            Ưu tiên: {predictionPriorityLabel || "Chưa có"}
          </span>
          {predictionPriorityScore !== undefined && (
            <span className="text-muted">
              - Độ tin cậy: {(Number(predictionPriorityScore) * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <div className="row g-2 align-items-end mt-2">
          {(activeTab === "pending" || activeTab === "assigned") && (
            <div className="col-lg-6">
              <Form.Label className="small mb-1">
                Nhân viên phòng ban
              </Form.Label>
              <Form.Select
                name="prediction-officer"
                size="sm"
                value={selectedOfficer}
                onChange={(event) => {
                  setSelectedOfficer(event.target.value);
                  if (activeTab === "assigned") setManualForm((prev) => ({ ...prev, officerId: event.target.value }));
                }}
                disabled={!hasPrediction || predictionOfficers.length === 0}
              >
                <option value="">Chọn nhân viên</option>
                {predictionOfficers.map((officer) => (
                  <option key={officer._id} value={officer._id}>
                    {officer.name} - đang nhận: {officer.total_requests_count || 0} - đang xử lý: {officer.in_progress_requests_count || 0}
                  </option>
                ))}
              </Form.Select>
            </div>
          )}
          {activeTab === "assigned" && (
            <div className="col-lg-6">
              <Form.Label className="small mb-1">
                Nhân viên đang nhận
              </Form.Label>
              <Form.Control
                size="sm"
                readOnly
                name="current-officer"
                value={currentOfficerDisplay || "Chưa có"}
              >
              </Form.Control>
            </div>
          )}
          {(activeTab === "inProgress" || activeTab === "resolved") && (
            <div className="col-lg-6">
              <Form.Label className="small mb-1">
                Nhân viên được phân công
              </Form.Label>
              <Form.Control
                size="sm"
                readOnly
                name="current-officer"
                value={currentOfficerDisplay || "Chưa có"}
              >
              </Form.Control>
            </div>
          )}
          <div className="col-lg-6 d-flex justify-content-end gap-2">
            {renderButton(activeTab)}
          </div>
        </div>
      </div>

      <div className={`collapse ${showManual ? "show" : ""}`}>
        <div className="mt-3 border rounded p-3 bg-light">
          <div className="fw-semibold mb-2">Phân công thủ công</div>
          <div className="row g-2">
            <div className="col-md-6">
              <Form.Label className="small mb-1">Nhãn yêu cầu</Form.Label>
              <Form.Select
                size="sm"
                value={manualForm.label}
                onChange={(event) =>
                  setManualForm((prev) => ({
                    ...prev,
                    label: event.target.value,
                    officerId: "",
                  }))
                }
                disabled={manualLabels.length === 0}
              >
                <option value="">Chọn nhãn yêu cầu</option>
                {manualLabels.map((item) => (
                  <option key={item.label_id || item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label className="small mb-1">Phòng ban (tự động)</Form.Label>
              <Form.Control
                size="sm"
                value={derivedDepartmentName || "Chưa có"}
                readOnly
                disabled
              />
            </div>
            <div className="col-md-6">
              <Form.Label className="small mb-1">Ưu tiên</Form.Label>
              <Form.Select
                size="sm"
                value={manualForm.priority}
                onChange={(event) =>
                  setManualForm((prev) => ({
                    ...prev,
                    priority: event.target.value,
                  }))
                }
              >
                {Object.entries(REQUEST_PRIORITY).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label className="small mb-1">Nhân viên</Form.Label>
              <Form.Select
                size="sm"
                value={manualForm.officerId}
                onChange={(event) =>
                  setManualForm((prev) => ({
                    ...prev,
                    officerId: event.target.value,
                  }))
                }
                disabled={!manualForm.label}
              >
                <option value="">Chọn nhân viên</option>
                {manualOfficers.map((officer) => (
                  <option key={officer._id} value={officer._id}>
                    {officer.name} - đang nhận: {officer.total_requests_count || 0}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>
          <div className="d-flex justify-content-end mt-3">
            <Button
              size="sm"
              variant="primary"
              onClick={handleManualAssign}
              disabled={manualLoading}
            >
              {manualLoading ? (
                <Spinner animation="border" size="sm" />
              ) : null}
              Xác nhận phân công
            </Button>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-lg-7">
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <Badge bg={REQUEST_STATUS[detail.status]?.variant}>
                  {REQUEST_STATUS[detail.status]?.label}
                </Badge>
                <Badge bg={REQUEST_PRIORITY[detail.priority]?.variant}>
                  {REQUEST_PRIORITY[detail.priority]?.label}
                </Badge>
                <span className="text-muted small">
                  {formatDateTime(detail.created_at)}
                </span>
              </div>
              <h5 className="mb-1">{detail.subject}</h5>
              <div className="text-muted small">
                {detail.student_email} | {detail.student_id}
              </div>
              <hr />
              <div className={styles.emailContent}>
                {detail.content || "Không có nội dung"}
              </div>
            </Card.Body>
          </Card>
        </div>
        <div className="col-lg-5">
          <Card className="mb-3">
            <Card.Body>
              <Card.Title className="h6 mb-3">Tệp đính kèm</Card.Title>
              {Array.isArray(detail.attachments) &&
                detail.attachments.length > 0 ? (
                <ListGroup variant="flush">
                  {detail.attachments.map((attachment) => (
                    <ListGroup.Item
                      key={attachment._id}
                      className={styles.attachmentItem}
                    >
                      <div className="text-truncate">
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
                          "Tải về"
                        )}
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-muted small">Không có tệp đính kèm</div>
              )}
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title className="h6 mb-3">Thông tin yêu cầu</Card.Title>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Mã yêu cầu</span>
                <span className="fw-semibold">{detail._id}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Cập nhật</span>
                <span className="fw-semibold">
                  {formatDateTime(detail.updated_at)}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted small">Nhãn</span>
                <span className="fw-semibold">
                  {detail.label || "Chưa gán"}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small">Phòng ban</span>
                <span className="fw-semibold">
                  {detail.department_id?.name || "Chưa gán"}
                </span>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Hiển mail phản hồi và lịch sử status */}
      {activeTab === "resolved" && (
        <div className="row g-3 mt-3">
          <div className="col-lg-7">
            <Card className="h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title className="h6 mb-0">Mail phản hồi</Card.Title>
                  <div className="btn-group btn-group-sm" role="group">
                    <Button
                      variant={replyViewMode === "html" ? "primary" : "outline-primary"}
                      onClick={() => setReplyViewMode("html")}
                      disabled={!replyMail?.original_html_content}
                    >
                      HTML
                    </Button>
                    <Button
                      variant={replyViewMode === "text" ? "primary" : "outline-primary"}
                      onClick={() => setReplyViewMode("text")}
                    >
                      Text
                    </Button>
                  </div>
                </div>

                {replyMailLoading ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : !replyMail ? (
                  <div className="text-muted small">Không có mail phản hồi</div>
                ) : replyViewMode === "html" && replyMail?.original_html_content ? (
                  <div
                    style={{ maxHeight: "520px", overflow: "auto", border: "1px solid #e9ecef", borderRadius: "8px", padding: "12px", background: "#fff", wordBreak: "break-word" }}
                    dangerouslySetInnerHTML={{ __html: replyMail.original_html_content }}
                  />
                ) : (
                  <pre className={`${styles.emailContent} small mb-0`} style={{ whiteSpace: "pre-wrap" }}>
                    {replyMail?.original_content || "Không có nội dung"}
                  </pre>
                )}
              </Card.Body>
            </Card>
          </div>
          <div className="col-lg-5">
            <Card className="h-100">
              <Card.Body>
                <Card.Title className="h6 mb-3">Lịch sử trạng thái</Card.Title>
                {sortedHistory.length === 0 ? (
                  <div className="text-muted small">Chưa có lịch sử</div>
                ) : (
                  <ListGroup variant="flush">
                    {sortedHistory.map((item, idx) => (
                      <ListGroup.Item key={`${item.status}-${item.changed_at}-${idx}`} className="d-flex justify-content-between align-items-start">
                        <div>
                          <Badge bg={REQUEST_STATUS[item.status]?.variant || "secondary"} className="me-2">
                            {REQUEST_STATUS[item.status]?.label || item.status}
                          </Badge>
                          <span className="text-muted small">{formatDateTime(item.changed_at)}</span>
                        </div>
                        {item.changed_by ? (
                          <div className="text-end text-muted small">
                            Bởi: {item.changed_by?.name || ""} {item.changed_by?.role ? `(${item.changed_by.role})` : ""}
                          </div>
                        ) : null}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetailModalBody;
