import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, ListGroup, Spinner } from "react-bootstrap";
import { BsCheckCircle, BsPersonPlus, BsXCircle } from "react-icons/bs";
import { toast } from "react-toastify";

import {
  useApplyPredictionByRequestIdMutation,
  useAssignRequestToOfficerMutation,
  useDownloadAttachmentMutation,
  useGetRequestByIdQuery,
} from "#services/request-services";
import {
  useGetDepartmentsQuery,
  useGetOfficersByDepartmentQuery,
} from "#services/department-services";
import { REQUEST_PRIORITY, REQUEST_STATUS } from "#components/_variables";
import { formatDateTime } from "#utils/format";

import { getErrorMessage, toAsciiLabel } from "./helpers";
import styles from "../../pages/staff-requests-process/staff-requests-process-page.module.scss";

const RequestDetailModalBody = ({ requestId, onAssigned }) => {
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    departmentId: "",
    label: "",
    priority: 3,
    officerId: "",
  });
  const [downloadingId, setDownloadingId] = useState("");

  const {
    data: detailResponse,
    isLoading,
    error,
    refetch,
  } = useGetRequestByIdQuery(requestId, { skip: !requestId });

  const detail = detailResponse?.dt;
  const predictionDepartmentId = detail?.prediction?.department_id;

  const { data: predictionOfficersResponse } = useGetOfficersByDepartmentQuery(
    predictionDepartmentId,
    { skip: !predictionDepartmentId }
  );

  const predictionOfficers = useMemo(() => {
    const list = Array.isArray(predictionOfficersResponse?.dt)
      ? predictionOfficersResponse.dt
      : [];
    return [...list].sort(
      (a, b) => (b.total_requests_count || 0) - (a.total_requests_count || 0)
    );
  }, [predictionOfficersResponse]);

  const leastLoadedPredictionOfficer = useMemo(() => {
    if (predictionOfficers.length === 0) return null;
    return [...predictionOfficers].sort(
      (a, b) => (a.total_requests_count || 0) - (b.total_requests_count || 0)
    )[0];
  }, [predictionOfficers]);

  const { data: departmentsResponse } = useGetDepartmentsQuery(undefined, {
    skip: !showManual,
  });

  const departments = useMemo(() => {
    return Array.isArray(departmentsResponse?.dt)
      ? departmentsResponse.dt
      : [];
  }, [departmentsResponse]);

  const manualLabels = useMemo(() => {
    if (!manualForm.departmentId) return [];
    const department = departments.find(
      (item) => item._id === manualForm.departmentId
    );
    return Array.isArray(department?.labels) ? department.labels : [];
  }, [departments, manualForm.departmentId]);

  const { data: manualOfficersResponse } = useGetOfficersByDepartmentQuery(
    manualForm.departmentId,
    { skip: !manualForm.departmentId || !showManual }
  );

  const manualOfficers = useMemo(() => {
    const list = Array.isArray(manualOfficersResponse?.dt)
      ? manualOfficersResponse.dt
      : [];
    return [...list].sort(
      (a, b) => (b.total_requests_count || 0) - (a.total_requests_count || 0)
    );
  }, [manualOfficersResponse]);

  const leastLoadedManualOfficer = useMemo(() => {
    if (manualOfficers.length === 0) return null;
    return [...manualOfficers].sort(
      (a, b) => (a.total_requests_count || 0) - (b.total_requests_count || 0)
    )[0];
  }, [manualOfficers]);

  useEffect(() => {
    if (!selectedOfficer && leastLoadedPredictionOfficer?._id) {
      setSelectedOfficer(leastLoadedPredictionOfficer._id);
    }
  }, [leastLoadedPredictionOfficer, selectedOfficer]);

  useEffect(() => {
    if (!manualForm.departmentId) return;
    if (manualLabels.length === 0) {
      setManualForm((prev) => ({ ...prev, label: "" }));
      return;
    }
    const isLabelValid = manualLabels.some(
      (item) => item.label === manualForm.label
    );
    if (!isLabelValid) {
      setManualForm((prev) => ({
        ...prev,
        label: manualLabels[0].label,
      }));
    }
  }, [manualForm.departmentId, manualForm.label, manualLabels]);

  useEffect(() => {
    if (!manualForm.departmentId) return;
    if (manualOfficers.length === 0) {
      setManualForm((prev) => ({ ...prev, officerId: "" }));
      return;
    }
    const isOfficerValid = manualOfficers.some(
      (item) => item._id === manualForm.officerId
    );
    if (!isOfficerValid) {
      setManualForm((prev) => ({
        ...prev,
        officerId: leastLoadedManualOfficer?._id || "",
      }));
    }
  }, [
    manualForm.departmentId,
    manualForm.officerId,
    manualOfficers,
    leastLoadedManualOfficer,
  ]);

  const [_usePrediction, { isLoading: predictionLoading }] =
    useApplyPredictionByRequestIdMutation();
  const [assignRequest, { isLoading: manualLoading }] =
    useAssignRequestToOfficerMutation();
  const [downloadAttachment] = useDownloadAttachmentMutation();

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
      refetch?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể phân công tự động"));
    }
  };

  const handleManualAssign = async () => {
    if (!manualForm.departmentId || !manualForm.label || !manualForm.officerId) {
      toast.error("Vui lòng hoàn tất thông tin phân công");
      return;
    }
    try {
      const response = await assignRequest({
        requestId,
        payload: {
          assigned_to: manualForm.officerId,
          priority: Number(manualForm.priority) || 3,
          label: manualForm.label,
          department_id: manualForm.departmentId,
        },
      }).unwrap();
      if (!response || response.ec !== 200) {
        throw new Error(response?.em || "Không thể phân công thủ công");
      }
      toast.success("Đã phân công thủ công");
      onAssigned?.();
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
  const predictionScore = detail?.prediction?.category?.score;
  const predictionPriorityLabel = detail?.prediction?.priority?.label;
  const hasPrediction = Boolean(predictionDepartmentId);

  return (
    <div>
      <div className={styles.suggestionBar}>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Badge bg="primary">
            Hệ thống đề xuất
          </Badge>
          <span className="fw-semibold">
            Nhãn: {toAsciiLabel(predictionLabel) || "Chưa có"}
          </span>
          <span className="text-muted">
            Ưu tiên: {predictionPriorityLabel || REQUEST_PRIORITY[detail?.priority]?.label}
          </span>
          {predictionScore !== undefined && (
            <span className="text-muted">
              Độ tin cậy: {Number(predictionScore).toFixed(2)}
            </span>
          )}
        </div>
        <div className="row g-2 align-items-end mt-2">
          <div className="col-lg-6">
            <Form.Label className="small mb-1">
              Nhân viên phòng ban
            </Form.Label>
            <Form.Select
              size="sm"
              value={selectedOfficer}
              onChange={(event) => setSelectedOfficer(event.target.value)}
              disabled={!hasPrediction || predictionOfficers.length === 0}
            >
              <option value="">Chọn nhân viên</option>
              {predictionOfficers.map((officer) => (
                <option key={officer._id} value={officer._id}>
                  {officer.name} - đang nhận: {officer.total_requests_count || 0}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-lg-6 d-flex justify-content-end gap-2">
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
              variant="outline-danger"
              onClick={() => setShowManual(true)}
            >
              <BsXCircle className="me-1" />
              Từ chối dự đoán
            </Button>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => setShowManual((prev) => !prev)}
            >
              <BsPersonPlus className="me-1" />
              Tự phân nhân
            </Button>
          </div>
        </div>
      </div>

      <div className={`collapse ${showManual ? "show" : ""}`}>
        <div className="mt-3 border rounded p-3 bg-light">
          <div className="fw-semibold mb-2">Phân công thủ công</div>
          <div className="row g-2">
            <div className="col-md-6">
              <Form.Label className="small mb-1">Phòng ban</Form.Label>
              <Form.Select
                size="sm"
                value={manualForm.departmentId}
                onChange={(event) =>
                  setManualForm((prev) => ({
                    ...prev,
                    departmentId: event.target.value,
                    label: "",
                    officerId: "",
                  }))
                }
              >
                <option value="">Chọn phòng ban</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label className="small mb-1">Nhãn yêu cầu</Form.Label>
              <Form.Select
                size="sm"
                value={manualForm.label}
                onChange={(event) =>
                  setManualForm((prev) => ({
                    ...prev,
                    label: event.target.value,
                  }))
                }
                disabled={!manualForm.departmentId || manualLabels.length === 0}
              >
                <option value="">Chọn nhãn yêu cầu</option>
                {manualLabels.map((item) => (
                  <option key={item.label_id} value={item.label}>
                    {toAsciiLabel(item.label)}
                  </option>
                ))}
              </Form.Select>
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
                disabled={!manualForm.departmentId}
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
                  {toAsciiLabel(detail.label) || "Chưa gán"}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted small">Phòng ban</span>
                <span className="fw-semibold">
                  {detail.department_id || "Chưa gán"}
                </span>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailModalBody;
