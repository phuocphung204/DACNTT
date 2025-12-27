import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, ListGroup, Nav, Spinner, Table } from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import {
  BsArrowRepeat,
  BsBell,
  BsCheckCircle,
  BsLightningCharge,
  BsPersonPlus,
  BsXCircle,
} from "react-icons/bs";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "react-toastify";

import { userModalDialogStore, useShallow } from "#custom-hooks";
import {
  useApplyPredictionByRequestIdMutation,
  useAssignRequestToOfficerMutation,
  useDownloadAttachmentMutation,
  useGetDepartmentsQuery,
  useGetOfficersByDepartmentQuery,
  useGetRequestByIdQuery,
  useGetRequestsQuery,
  useSendReminderMutation,
} from "#services/request-services";
import { formatDateTime } from "#utils/format";
import { PAGE_SIZE_OPTIONS, PRIORITY, REQUEST_PRIORITY, REQUEST_STATUS, TIME_RANGE } from "#components/_variables";
import FilterClient from "#components/common/filter-cliend";

import styles from "./staff-requests-process-page.module.scss";

const PRIORITY_SLA_HOURS = {
  0: 4,
  1: 8,
  2: 24,
  3: 48,
};

const DUE_SOON_MS = 24 * 60 * 60 * 1000;

const normalizeStatus = (status) => {
  if (status === "Assigned") return "InProgress";
  if (status === "InProgress" || status === "Resolved" || status === "Pending") {
    return status;
  }
  return "Pending";
};

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
  error?.em || error?.message || fallback;

const toAsciiLabel = (value) => {
  if (!value) return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const sortByCreatedAtDesc = (a, b) => {
  const first = new Date(a?.created_at || a?.createdAt || 0).getTime();
  const second = new Date(b?.created_at || b?.createdAt || 0).getTime();
  return second - first;
};
const RequestTable = ({ data, onViewDetail, onSendReminder, remindLoadingId }) => {
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
          <Badge bg={REQUEST_PRIORITY[info.getValue()]?.variant}>
            {REQUEST_PRIORITY[info.getValue()]?.label}
          </Badge>
        ),
      },
      {
        header: "Trạng thái",
        accessorKey: "status",
        cell: (info) => (
          <Badge bg={REQUEST_STATUS[info.getValue()]?.variant}>
            {REQUEST_STATUS[info.getValue()]?.label}
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
        header: "Thao tác",
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
            Nhãn: {toAsciiLabel(predictionLabel) || "Chưa có"}
          </span>
          <span className="text-muted">
            Ưu tiên: {REQUEST_PRIORITY[detail?.priority]?.label}
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
const StaffRequestsProcessPage = () => {
  const { push } = userModalDialogStore(
    useShallow((state) => ({
      push: state.push,
    }))
  );

  // const [filterValues, setFilterValues] = useState({
  //   timeRange: ["today"],
  //   priority: [],
  //   status: [],
  //   date: { value: [] },
  // });

  const [clientFilterValues, setClientFilterValues] = useState({
    priority: [],
    status: [],
  });

  const [activeTab, setActiveTab] = useState("pending");
  const [pageSize, setPageSize] = useState(20);
  const [pageByTab, setPageByTab] = useState({
    pending: 1,
    inProgress: 1,
    resolved: 1,
  });
  const [remindLoadingId, setRemindLoadingId] = useState("");

  // const timeRange = filterValues.timeRange?.[0] || "today";
  // const requestParams = useMemo(() => {
  //   const params = {};
  //   if (timeRange === "today") {
  //     params.today = true;
  //   } else if (timeRange === "weekly") {
  //     params.weekly = true;
  //   } else if (timeRange === "monthly") {
  //     params.monthly = true;
  //   } else if (timeRange === "date") {
  //     const selectedDate = filterValues.date?.value?.[0];
  //     if (!selectedDate) return null;
  //     params.date = selectedDate;
  //   }
  //   return params;
  // }, [timeRange, filterValues.date]);

  const [requestParams, setRequestParams] = useState({ timeRange: "today" });

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

  const filteredBuckets = useMemo(() => {
    const now = Date.now();
    const applyDecorators = (list, fallbackStatus) =>
      [...list].map((item) => {
        const status = normalizeStatus(item.status || fallbackStatus);
        const dueAt = getDueAt(item);
        const dueState = computeDueState(status, dueAt, now);
        return { ...item, status, dueAt, dueState };
      });

    // const filterPriority = (list) => {
    //   if (!filterValues.priority || filterValues.priority.length === 0) return list;
    //   return list.filter((item) =>
    //     filterValues.priority.includes(String(item.priority || ""))
    //   );
    // };

    // const filterStatus = (list) => {
    //   if (!filterValues.status || filterValues.status.length === 0) return list;
    //   return list.filter((item) => filterValues.status.includes(item.status));
    // };

    const filterPriority = (list) => {
      if (!clientFilterValues.priority || clientFilterValues.priority.length === 0) return list;
      return list.filter((item) =>
        clientFilterValues.priority.includes(String(item.priority || ""))
      );
    };

    const filterStatus = (list) => {
      if (!clientFilterValues.status || clientFilterValues.status.length === 0) return list;
      return list.filter((item) => clientFilterValues.status.includes(item.status));
    };

    const pending = filterStatus(filterPriority(applyDecorators(requestBuckets.pending, "Pending"))).sort(sortByCreatedAtDesc);
    const inProgress = filterStatus(filterPriority(applyDecorators(requestBuckets.inProgress, "InProgress"))).sort(sortByCreatedAtDesc);
    const resolved = filterStatus(filterPriority(applyDecorators(requestBuckets.resolved, "Resolved"))).sort(sortByCreatedAtDesc);

    return { pending, inProgress, resolved };
  }, [requestBuckets, clientFilterValues]);
  // }, [requestBuckets, filterValues.priority, filterValues.status]);
  const groupList = useMemo(
    () => [
      {
        key: "pending",
        title: "Mới nhận",
        variant: "secondary",
        data: filteredBuckets.pending,
      },
      {
        key: "inProgress",
        title: "Đang xử lý",
        variant: "warning",
        data: filteredBuckets.inProgress,
      },
      {
        key: "resolved",
        title: "Đã xử lý",
        variant: "success",
        data: filteredBuckets.resolved,
      },
    ],
    [filteredBuckets]
  );

  const handleFilterSubmit = (values) => {
    // setFilterValues((prev) => {
    //   const next = { ...prev, ...values };
    //   return next;
    // });
    // const nextTimeRange = values.timeRange?.[0] || timeRange;
    // const isDateChanged =
    //   nextTimeRange === "date" && values.date?.value?.[0] !== filterValues.date?.value?.[0];
    // if (nextTimeRange !== timeRange || isDateChanged) {
    //   refetch?.();
    // }
    const status = values.status || [];
    const priority = values.priority || [];
    setClientFilterValues({ status, priority });
    delete values.status;
    delete values.priority;
    const date = values.date?.value?.[0];
    if (date) {
      values.date = date;
    } else {
      delete values.date;
    }
    setRequestParams(values);
    console.log("values", values);
    setPageByTab({ pending: 1, inProgress: 1, resolved: 1 });
  };

  const handleRefresh = () => {
    refetch?.();
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
  // const filterError =
  //   timeRange === "date" && (!filterValues.date || !filterValues.date.value?.[0])
  //     ? "Vui lòng chọn ngày"
  //     : "";
  const requestError = error
    ? getErrorMessage(error, "Không thể tải dữ liệu")
    : "";
  // const displayError = filterError || requestError;
  const displayError = requestError;

  const currentGroup = groupList.find((item) => item.key === activeTab) || groupList[0];
  const totalItems = currentGroup?.data?.length || 0;
  const totalForPaging = Math.max(totalItems, 1); // tránh chia 0
  const totalPages = Math.ceil(totalForPaging / pageSize);
  const currentPage = Math.min(pageByTab[activeTab] || 1, totalPages);
  const paginatedData = currentGroup?.data?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const changePage = (nextPage) => {
    const safeNext = Math.min(Math.max(nextPage, 1), totalPages);
    setPageByTab((prev) => ({ ...prev, [activeTab]: safeNext }));
  };

  const renderPagination = () => {
    return (
      <div className="d-flex justify-content-between align-items-center mt-2">
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">Hiển thị</span>
          <Form.Select
            size="sm"
            style={{ width: 90 }}
            value={pageSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              setPageSize(nextSize);
              setPageByTab({ pending: 1, inProgress: 1, resolved: 1 });
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} / trang
              </option>
            ))}
          </Form.Select>
        </div>
        <PaginationControl
          page={currentPage}
          between={2}
          total={totalForPaging}
          limit={pageSize}
          changePage={changePage}
          ellipsis={1}
          next={totalPages > currentPage}
          last={totalPages > currentPage + 1}
        />
      </div>
    );
  };
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
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <FilterClient onSubmit={handleFilterSubmit} selectedFilterOptions={[TIME_RANGE, PRIORITY]} />
            {loading && <Spinner animation="border" size="sm" />}
          </div>
          {displayError && (
            <Alert variant="danger" className="mt-3 mb-0">
              {displayError}
            </Alert>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="pb-0 border-0">
          <Nav
            variant="tabs"
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k || "pending")}
          >
            {groupList.map((group) => (
              <Nav.Item key={group.key}>
                <Nav.Link eventKey={group.key}>
                  {group.title}{" "}
                  <Badge bg={group.variant} className="ms-1">
                    {group.data.length}
                  </Badge>
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </Card.Header>
        <Card.Body>
          {currentGroup?.data?.length === 0 ? (
            <div className="text-muted">Không có yêu cầu</div>
          ) : (
            <>
              <RequestTable
                data={paginatedData || []}
                onViewDetail={handleOpenDetail}
                onSendReminder={handleSendReminder}
                remindLoadingId={remindLoadingId}
              />
              {renderPagination()}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default StaffRequestsProcessPage;
