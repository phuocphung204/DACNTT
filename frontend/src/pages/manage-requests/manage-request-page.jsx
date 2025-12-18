import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Collapse,
  Form,
  ListGroup,
  Row,
  Spinner,
  Table,
  ToggleButton,
} from "react-bootstrap";
import {
  BsArrowRepeat,
  BsBell,
  BsCheckCircle,
  BsLightningCharge,
  BsPersonPlus,
  BsXCircle,
} from "react-icons/bs";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "react-toastify";

import { userModalDialogStore, useShallow } from "#custom-hooks";
import {
  useAssignRequestToOfficerMutation,
  useDownloadAttachmentMutation,
  useGetDepartmentsQuery,
  useGetOfficersByDepartmentQuery,
  useGetRequestByIdQuery,
  useGetRequestsQuery,
  useSendReminderMutation,
  useApplyPredictionByRequestIdMutation,
} from "#services/request-services";

import styles from "./manage-request-page.module.scss";

const TIME_FILTERS = [
  { value: "today", label: "Hôm nay" },
  { value: "date", label: "Chọn ngày" },
  { value: "weekly", label: "Tuần này" },
  { value: "monthly", label: "Tháng này" },
];

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

const PRIORITY_SLA_HOURS = {
  1: 4,
  2: 8,
  3: 24,
  4: 48,
};

const DUE_SOON_MS = 24 * 60 * 60 * 1000;

const padValue = (value) => String(value).padStart(2, "0");

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${padValue(date.getMonth() + 1)}-${padValue(
    date.getDate()
  )} ${padValue(date.getHours())}:${padValue(date.getMinutes())}`;
};

const normalizeStatus = (status) => {
  if (status === "Assigned") return "InProgress";
  if (status === "InProgress" || status === "Resolved" || status === "Pending") {
    return status;
  }
  return "Pending";
};

const getPriorityLabel = (priority) =>
  PRIORITY_LABELS[Number(priority)] || "Trung bình";

const getPriorityVariant = (priority) =>
  PRIORITY_VARIANTS[Number(priority)] || "secondary";

const getStatusLabel = (status) => STATUS_LABELS[status] || "Khác";

const getStatusVariant = (status) => STATUS_VARIANTS[status] || "secondary";

const getDueAt = (request) => {
  const createdAt = request?.created_at || request?.createdAt;
  if (!createdAt) return null;
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) return null;
  const priority = Number(request?.priority) || 3;
  const hours = PRIORITY_SLA_HOURS[priority] || 24;
  return new Date(parsedDate.getTime() + hours * 60 * 60 * 1000);
};

const computeDueState = (status, dueAt, now) => {
  if (!dueAt) return "none";
  if (status === "Resolved") return "none";
  const diff = dueAt.getTime() - now;
  if (diff <= 0) return "overdue";
  if (diff <= DUE_SOON_MS) return "due";
  return "none";
};

const getErrorMessage = (error, fallback) =>
  error?.em || error?.me || error?.message || fallback;

// const toAsciiLabel = (value) => {
//   if (!value) return "";
//   return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// };

const sortByCreatedAtDesc = (a, b) => {
  const first = new Date(a?.created_at || a?.createdAt || 0).getTime();
  const second = new Date(b?.created_at || b?.createdAt || 0).getTime();
  return second - first;
};

const RequestTable = ({
  data,
  onViewDetail,
  onSendReminder,
  remindLoadingId,
}) => {
  const columns = useMemo(
    () => [
      {
        header: "Mã",
        accessorKey: "_id",
        cell: (info) => {
          const value = info.getValue();
          if (!value) return "-";
          return String(value).slice(-6).toUpperCase();
        },
      },
      {
        header: "Tiêu đề",
        accessorKey: "subject",
        cell: (info) => info.getValue() || "-",
      },
      {
        header: "Email",
        accessorKey: "student_email",
        cell: (info) => info.getValue() || "-",
      },
      {
        header: "Thời gian",
        accessorKey: "created_at",
        cell: (info) => (
          <span className="text-nowrap">{formatDateTime(info.getValue())}</span>
        ),
      },
      {
        header: "Ưu tiên",
        accessorKey: "priority",
        cell: (info) => (
          <Badge bg={getPriorityVariant(info.getValue())}>
            {getPriorityLabel(info.getValue())}
          </Badge>
        ),
      },
      {
        header: "Trạng thái",
        accessorKey: "status",
        cell: (info) => (
          <Badge bg={getStatusVariant(info.getValue())}>
            {getStatusLabel(info.getValue())}
          </Badge>
        ),
      },
      {
        header: "Hạn",
        accessorKey: "dueAt",
        cell: (info) => {
          const dueAt = info.getValue();
          const dueState = info.row.original.dueState;
          if (!dueAt) return "-";
          if (dueState === "overdue") {
            return (
              <span className="text-danger fw-semibold">
                Quá hạn - {formatDateTime(dueAt)}
              </span>
            );
          }
          if (dueState === "due") {
            return (
              <span className="text-warning fw-semibold">
                Sắp đến hạn - {formatDateTime(dueAt)}
              </span>
            );
          }
          return <span className="text-muted">{formatDateTime(dueAt)}</span>;
        },
      },
      {
        header: "Hành động",
        id: "actions",
        cell: ({ row }) => {
          const isLoading = remindLoadingId === row.original._id;
          return (
            <div className="d-flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => onViewDetail(row.original)}
              >
                Chi tiết
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => onSendReminder(row.original)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <BsBell className="me-1" />
                )}
                Nhắc nhở
              </Button>
            </div>
          );
        },
      },
    ],
    [onViewDetail, onSendReminder, remindLoadingId]
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row._id,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table hover responsive size="sm" className="align-middle">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => {
          const rowClass =
            row.original.dueState === "overdue"
              ? styles.rowOverdue
              : row.original.dueState === "due"
                ? styles.rowDueSoon
                : "";
          return (
            <tr key={row.id} className={rowClass}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
};

const RequestGroupCard = ({
  title,
  subtitle,
  variant,
  data,
  onViewDetail,
  onSendReminder,
  remindLoadingId,
}) => (
  <Card className={`mb-3 ${styles.groupCard}`}>
    <Card.Header className={styles.groupHeader}>
      <div>
        <div className={styles.groupTitle}>{title}</div>
        {subtitle && <div className={styles.metaText}>{subtitle}</div>}
      </div>
      <Badge bg={variant}>{data.length}</Badge>
    </Card.Header>
    <Card.Body>
      {data.length === 0 ? (
        <div className="text-muted small">Không có yêu cầu</div>
      ) : (
        <RequestTable
          data={data}
          onViewDetail={onViewDetail}
          onSendReminder={onSendReminder}
          remindLoadingId={remindLoadingId}
        />
      )}
    </Card.Body>
  </Card>
);

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

  useEffect(() => {
    setSelectedOfficer("");
  }, [predictionDepartmentId]);

  useEffect(() => {
    if (!selectedOfficer && leastLoadedPredictionOfficer?._id) {
      setSelectedOfficer(leastLoadedPredictionOfficer._id);
    }
  }, [leastLoadedPredictionOfficer, selectedOfficer]);

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

  const predictionLabel = detail?.prediction?.label || detail?.label || "Chưa có";
  const predictionScore = detail?.prediction?.score;
  const hasPrediction = Boolean(predictionDepartmentId);

  return (
    <div>
      <div className={styles.suggestionBar}>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Badge bg="primary">
            <BsLightningCharge className="me-1" />
            AI gợi ý
          </Badge>
          <span className="fw-semibold">
            Nhãn: {predictionLabel || "Chưa có"}
          </span>
          <span className="text-muted">
            Ưu tiên: {getPriorityLabel(detail?.priority)}
          </span>
          {predictionScore !== undefined && (
            <span className="text-muted">
              Độ tin cậy: {Number(predictionScore).toFixed(2)}
            </span>
          )}
        </div>
        <Row className="g-2 align-items-end mt-2">
          <Col lg={6}>
            <Form.Label className="small mb-1">
              Danh sách nhân viên phòng ban
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
                  {officer.name} - Đang nhận: {officer.total_requests_count || 0}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col lg={6} className="d-flex justify-content-end gap-2">
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
              Tùy chọn tự phân loại
            </Button>
          </Col>
        </Row>
      </div>

      <Collapse in={showManual}>
        <div className="mt-3 border rounded p-3 bg-light">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold">Tùy chọn tự phân loại</div>
          </div>
          <Row className="g-2">
            <Col md={6}>
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
            </Col>
            <Col md={6}>
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
                    {item.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6}>
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
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6}>
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
                    {officer.name} - Đang nhận: {officer.total_requests_count || 0}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
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
      </Collapse>

      <Row className="g-3 mt-3">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <Badge bg={getStatusVariant(detail.status)}>
                  {getStatusLabel(detail.status)}
                </Badge>
                <Badge bg={getPriorityVariant(detail.priority)}>
                  {getPriorityLabel(detail.priority)}
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
        </Col>
        <Col lg={5}>
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
                  {detail.department_id || "Chưa gán"}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const ManageRequestPage = () => {
  const { push } = userModalDialogStore(
    useShallow((state) => ({
      push: state.push,
    }))
  );

  const [filterMode, setFilterMode] = useState("today");
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [remindLoadingId, setRemindLoadingId] = useState("");

  const requestParams = useMemo(() => {
    const params = { page: 1 };
    if (filterMode === "today") {
      params.today = true;
    } else if (filterMode === "weekly") {
      params.weekly = true;
    } else if (filterMode === "monthly") {
      params.monthly = true;
    } else if (filterMode === "date") {
      if (!selectedDate) return null;
      params.date = selectedDate;
    }
    return params;
  }, [filterMode, selectedDate]);

  const {
    data: requestsResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetRequestsQuery(requestParams, {
    skip: !requestParams,
  });

  const [sendReminder] = useSendReminderMutation();

  const requestBuckets = useMemo(() => {
    const data = requestsResponse?.dt || {};
    return {
      pending: data?.pending?.requests || [],
      inProgress: data?.in_progress?.requests || [],
      resolved: data?.resolved?.requests || [],
    };
  }, [requestsResponse]);

  const preparedBuckets = useMemo(() => {
    const now = Date.now();
    const mapList = (list, fallbackStatus) =>
      [...list].map((item) => {
        const status = normalizeStatus(item.status || fallbackStatus);
        const dueAt = getDueAt(item);
        const dueState = computeDueState(status, dueAt, now);
        return {
          ...item,
          status,
          dueAt,
          dueState,
        };
      });

    const pending = mapList(requestBuckets.pending, "Pending");
    const inProgress = mapList(requestBuckets.inProgress, "InProgress");
    const resolved = mapList(requestBuckets.resolved, "Resolved");

    const dueSoon = [...pending, ...inProgress]
      .filter((item) => item.dueState === "due")
      .sort(sortByCreatedAtDesc);
    const dueSoonIds = new Set(dueSoon.map((item) => item._id));

    return {
      pending: pending
        .filter((item) => !dueSoonIds.has(item._id))
        .sort(sortByCreatedAtDesc),
      inProgress: inProgress
        .filter((item) => !dueSoonIds.has(item._id))
        .sort(sortByCreatedAtDesc),
      resolved: resolved.sort(sortByCreatedAtDesc),
      dueSoon,
    };
  }, [requestBuckets]);

  const groupList = useMemo(
    () => [
      {
        key: "pending",
        title: "Mới nhận",
        subtitle: "Yêu cầu mới tiếp nhận",
        variant: "secondary",
        data: preparedBuckets.pending,
      },
      {
        key: "inProgress",
        title: "Đang xử lý",
        subtitle: "Yêu cầu đang xử lý",
        variant: "warning",
        data: preparedBuckets.inProgress,
      },
      {
        key: "resolved",
        title: "Đã xử lý",
        subtitle: "Yêu cầu đã xử lý",
        variant: "success",
        data: preparedBuckets.resolved,
      },
      {
        key: "dueSoon",
        title: "Sắp tới hạn",
        subtitle: "Yêu cầu cần xử lý trong 24h",
        variant: "danger",
        data: preparedBuckets.dueSoon,
      },
    ],
    [preparedBuckets]
  );

  const visibleGroups = useMemo(() => {
    if (statusFilter === "in_progress") {
      return groupList.filter((group) => group.key === "inProgress");
    }
    if (statusFilter === "resolved") {
      return groupList.filter((group) => group.key === "resolved");
    }
    if (statusFilter === "due") {
      return groupList.filter((group) => group.key === "dueSoon");
    }
    return groupList;
  }, [groupList, statusFilter]);

  const handleRefresh = () => {
    if (requestParams) {
      refetch();
    }
  };

  const handleOpenDetail = (request) => {
    if (!request?._id) return;
    push({
      title: "Chi tiết yêu cầu",
      bodyComponent: RequestDetailModalBody,
      bodyProps: {
        requestId: request._id,
        onAssigned: handleRefresh,
      },
      size: "xl",
      buttons: [],
    });
  };

  const handleSendReminder = async (request) => {
    if (!request?._id) return;
    setRemindLoadingId(request._id);
    try {
      const response = await sendReminder({
        requestId: request._id,
        subject: request.subject,
        studentEmail: request.student_email,
      }).unwrap();
      const isSuccess = response?.ec === 200 || response?.mc === 200;
      if (!isSuccess) {
        throw new Error(response?.em || response?.me || "Không thể gửi nhắc nhở");
      }
      toast.success("Đã gửi thông báo nhắc nhở");
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể gửi nhắc nhở"));
    } finally {
      setRemindLoadingId("");
    }
  };

  const loading = Boolean(requestParams) && (isLoading || isFetching);
  const filterError =
    filterMode === "date" && !selectedDate ? "Vui lòng chọn ngày" : "";
  const requestError = error
    ? getErrorMessage(error, "Không thể tải dữ liệu")
    : "";
  const displayError = filterError || requestError;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.headerTitle}>Quản lý yêu cầu</div>
          <div className={styles.metaText}>
            Sắp xếp giảm dần theo thời gian gần nhất
          </div>
        </div>
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={handleRefresh}
          disabled={loading}
        >
          <BsArrowRepeat className="me-1" />
          Làm mới
        </Button>
      </div>

      <Card className={`mb-3 ${styles.filtersCard}`}>
        <Card.Body>
          <Row className="g-2 align-items-end">
            <Col lg={7}>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="fw-semibold">Bộ lọc thời gian</span>
                <ButtonGroup size="sm">
                  {TIME_FILTERS.map((option) => (
                    <ToggleButton
                      key={option.value}
                      id={`filter-${option.value}`}
                      type="radio"
                      variant={
                        filterMode === option.value
                          ? "primary"
                          : "outline-primary"
                      }
                      name="time-filter"
                      value={option.value}
                      checked={filterMode === option.value}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;
                        setFilterMode(nextValue);
                        if (nextValue === "date" && !selectedDate) {
                          const now = new Date();
                          setSelectedDate(now.toISOString().split("T")[0]);
                        }
                      }}
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ButtonGroup>
                {filterMode === "date" && (
                  <Form.Control
                    type="date"
                    size="sm"
                    value={selectedDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    style={{ maxWidth: 180 }}
                  />
                )}
              </div>
            </Col>
            <Col sm={6} lg={3}>
              <Form.Label className="small mb-1">
                Lọc theo trạng thái
              </Form.Label>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="in_progress">Đang xử lý</option>
                <option value="resolved">Đã xử lý</option>
                <option value="due">Sắp đến hạn</option>
              </Form.Select>
            </Col>
            <Col sm={6} lg={2} className="text-end">
              {loading && <Spinner animation="border" size="sm" />}
            </Col>
          </Row>
          {displayError && (
            <Alert variant="danger" className="mt-3 mb-0">
              {displayError}
            </Alert>
          )}
        </Card.Body>
      </Card>

      {visibleGroups.map((group) => (
        <RequestGroupCard
          key={group.key}
          title={group.title}
          subtitle={group.subtitle}
          variant={group.variant}
          data={group.data}
          onViewDetail={handleOpenDetail}
          onSendReminder={handleSendReminder}
          remindLoadingId={remindLoadingId}
        />
      ))}
    </div>
  );
};

export default ManageRequestPage;