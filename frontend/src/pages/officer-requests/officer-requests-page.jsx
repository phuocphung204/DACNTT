import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Offcanvas,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import Filter from "#components/common/filter";
import SearchBar from "#components/common/search-bar";
import { getValuesFromParams } from "#utils";
import { useGetMyAssignedRequestsQuery } from "#services/request-services";

import styles from "./officer-requests-page.module.scss";

const PAGE_SIZE = 10;

// TODO: move to common variable file
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

const shortenId = (value) => {
  if (!value) return "-";
  const str = String(value);
  return str.length > 8 ? str.slice(-8).toUpperCase() : str.toUpperCase();
};

const controlledParams = ["page", "limit", "q", "priority", "status", "timeRange", "date", "startDate", "endDate"];

const OfficerRequestsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [previewRequest, setPreviewRequest] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const currentPage = Math.max(Number(searchParams.get("page")) || 1, 1);

  // useEffect(() => {
  //   if (!searchParams.get("page")) {
  //     setSearchParams((prev) => {
  //       const next = new URLSearchParams(prev);
  //       next.set("page", "1");
  //       return next;
  //     }, { replace: true });
  //   }
  // }, [searchParams, setSearchParams]);

  const requestParams = useMemo(() => {
    const params = getValuesFromParams(searchParams, controlledParams);
    params.page = currentPage;
    params.pageSize = PAGE_SIZE;
    return params;
  }, [searchParams, currentPage]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetMyAssignedRequestsQuery(requestParams, {
    skip: !requestParams,
  });

  const rawRequests = useMemo(() => {
    const list = Array.isArray(data?.dt?.requests) ? data.dt.requests : [];
    return list.map((item) => ({
      ...item,
      status: normalizeStatus(item.status),
    }));
  }, [data]);

  const handleSearchSubmit = useCallback((nextParams) => {
    if (nextParams instanceof URLSearchParams) {
      console.log("Search submit params:", nextParams.toString());
      nextParams.set("page", "1");
      setSearchParams(prev => {
        console.log("Previous params:", prev.toString());
        return new URLSearchParams(nextParams);
      });
    }
  }, [setSearchParams]);

  const handleFilterSubmit = useCallback((nextParams) => {
    if (nextParams instanceof URLSearchParams) {
      console.log("Filter submit params:", nextParams.toString());
      nextParams.set("page", "1");
      setSearchParams(nextParams, { replace: true });
    }
  }, [setSearchParams]);

  const handlePageChange = useCallback((nextPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleRefresh = () => {
    refetch?.();
  };

  const handlePreview = useCallback((request) => {
    setPreviewRequest(request);
    setShowPreview(true);
  }, []);

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const handleOpenDetail = useCallback((request) => {
    if (!request?._id) return;
    navigate(`/yeu-cau/${request._id}`);
  }, [navigate]);

  const columns = useMemo(
    () => [
      {
        header: "Mã",
        accessorKey: "_id",
        cell: (info) => <code>{shortenId(info.getValue())}</code>,
      },
      {
        header: "Tiêu đề",
        accessorKey: "subject",
        cell: (info) => info.getValue() || "Không có tiêu đề",
      },
      {
        header: "Email SV",
        accessorKey: "student_email",
        cell: (info) => info.getValue() || "-",
      },
      {
        header: "Nhãn",
        accessorKey: "label",
        cell: (info) => info.getValue() || "Chưa gán",
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
        header: "Tạo lúc",
        accessorKey: "created_at",
        cell: (info) => (
          <span className="text-nowrap">{formatDateTime(info.getValue())}</span>
        ),
      },
      {
        header: "Hành động",
        id: "actions",
        cell: ({ row }) => (
          <div className="d-flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => handlePreview(row.original)}
            >
              Xem
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenDetail(row.original)}
            >
              Chi tiết
            </Button>
          </div>
        ),
      },
    ],
    [handleOpenDetail, handlePreview]
  );

  const table = useReactTable({
    data: rawRequests,
    columns,
    getRowId: (row, index) => row._id || row.id || String(index),
    getCoreRowModel: getCoreRowModel(),
  });

  const totalRequests = data?.dt?.total_requests || 0;
  const totalForPagination = totalRequests;

  const loading = isLoading || isFetching;
  const errorMessage = error
    ? error?.data?.em ||
    error?.error ||
    "Không thể tải danh sách yêu cầu"
    : "";

  // Start debug
  // useRenderCount("OfficerRequestsPage");
  useEffect(() => {
    console.log("Search params changed:", searchParams.toString());
  }, [searchParams]);
  // End debug

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.heading}>Yêu cầu được giao</div>
          <div className={styles.metaText}>
            Danh sách yêu cầu bạn đang phụ trách, dùng thanh tìm kiếm hoặc bộ lọc để thu hẹp.
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Badge bg="secondary">Tổng: {totalRequests}</Badge>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Làm mới"}
          </Button>
        </div>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-3 align-items-center">
            <Col lg={8}>
              <SearchBar onSubmit={handleSearchSubmit} />
            </Col>
            <Col lg={4} className="text-lg-end">
              <div className="text-muted small">
                Nhấn Ctrl/Cmd + K để nhập từ khóa nhanh.
              </div>
            </Col>
          </Row>
          <div className="mt-3">
            <Filter onSubmit={handleFilterSubmit} />
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="fw-semibold">Bảng yêu cầu</div>
            {loading && <Spinner animation="border" size="sm" />}
          </div>

          {errorMessage ? (
            <Alert variant="danger">{errorMessage}</Alert>
          ) : !loading && rawRequests.length === 0 ? (
            <div className="text-muted">Không có yêu cầu nào phù hợp.</div>
          ) : (
            <div className="table-responsive">
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
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {totalForPagination > PAGE_SIZE && (
            <div className="d-flex justify-content-end mt-3">
              <PaginationControl
                page={currentPage}
                between={3}
                total={totalForPagination}
                limit={PAGE_SIZE}
                changePage={handlePageChange}
                ellipsis={1}
              />
            </div>
          )}
        </Card.Body>
      </Card>

      <Offcanvas show={showPreview} onHide={handleClosePreview} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Thông tin tổng quát</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {!previewRequest ? (
            <div className="text-muted">
              Chọn một yêu cầu và nhấn "Xem" để hiển thị thông tin.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex flex-wrap gap-2">
                <Badge bg={getStatusVariant(previewRequest.status)}>
                  {getStatusLabel(previewRequest.status)}
                </Badge>
                <Badge bg={getPriorityVariant(previewRequest.priority)}>
                  {getPriorityLabel(previewRequest.priority)}
                </Badge>
              </div>
              <div className={styles.previewBlock}>
                <div className={styles.previewItem}>
                  <div className={styles.previewLabel}>Tiêu đề</div>
                  <div className="fw-semibold">
                    {previewRequest.subject || "Không có tiêu đề"}
                  </div>
                </div>
                <div className={styles.previewItem}>
                  <div className={styles.previewLabel}>Sinh viên</div>
                  <div className="fw-semibold">
                    {previewRequest.student_email || "-"}
                  </div>
                </div>
                <div className={styles.previewItem}>
                  <div className={styles.previewLabel}>Nhãn</div>
                  <div className="fw-semibold">
                    {previewRequest.label || "Chưa gán"}
                  </div>
                </div>
                <div className={styles.previewItem}>
                  <div className={styles.previewLabel}>Thời gian tạo</div>
                  <div className="fw-semibold">
                    {formatDateTime(previewRequest.created_at)}
                  </div>
                </div>
                <div className={styles.previewItem}>
                  <div className={styles.previewLabel}>Cập nhật</div>
                  <div className="fw-semibold">
                    {formatDateTime(previewRequest.updated_at)}
                  </div>
                </div>
                <div className={styles.previewItem}>
                  <div className={styles.previewLabel}>Mã yêu cầu</div>
                  <div className="fw-semibold">{previewRequest._id}</div>
                </div>
              </div>
              <Button
                variant="outline-primary"
                onClick={() => handleOpenDetail(previewRequest)}
              >
                Mở trang chi tiết
              </Button>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
};

export default OfficerRequestsPage;
