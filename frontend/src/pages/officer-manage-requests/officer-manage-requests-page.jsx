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
  Form,
} from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { getValuesFromParams, parsePageParam, parsePageSize } from "#utils";
import { useGetMyAssignedRequestsForManageQuery } from "#services/request-services";
import { formatDateTime } from "#utils";
import Filter from "#components/common/filter";
import SearchBar from "#components/common/search-bar";

import styles from "./officer-manage-requests-page.module.scss";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

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

const OfficerManageRequestsPage = () => {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [previewRequest, setPreviewRequest] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [page, setPage] = useState(parsePageParam(searchParams.get("page")));
  const [pageSize, setPageSize] = useState(parsePageSize(searchParams.get("limit")));
  const [requestParams, setRequestParams] = useState(() => {
    const params = getValuesFromParams(searchParams, controlledParams);
    params.page = page;
    params.limit = pageSize;
    return params;
  });

  // const requestParams = useMemo(() => {
  //   const params = getValuesFromParams(searchParams, controlledParams);
  //   params.page = currentPage;
  //   params.limit = pageSize;
  //   return params;
  // }, [searchParams, currentPage, pageSize]);
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetMyAssignedRequestsForManageQuery(requestParams, {
    skip: !requestParams,
  });
  const totalRequests = data?.dt?.total ?? 0;
  const totalForPagination = Math.max(totalRequests, 1);
  const totalPages = Math.max(Math.ceil(totalRequests / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const loading = isLoading || isFetching;

  const rawRequests = useMemo(() => {
    const list = Array.isArray(data?.dt?.requests) ? data.dt.requests : [];
    return list.map((item) => ({
      ...item,
      status: normalizeStatus(item.status),
    }));
  }, [data]);

  useEffect(() => {
    if (page !== currentPage) {
      const next = new URLSearchParams(searchParams);
      next.set("page", String(currentPage));
      next.set("limit", String(pageSize));
      setSearchParams(next);
    }
  }, [currentPage, page, pageSize, searchParams, setSearchParams]);

  const handleSearchSubmit = useCallback((nextParams) => {
    if (nextParams instanceof URLSearchParams) {
      console.log("Search submit params:", nextParams.toString());
      nextParams.set("page", "1");
      const params = getValuesFromParams(nextParams, controlledParams);
      params.limit = pageSize;
      setRequestParams(params);
      setSearchParams(nextParams, { replace: true });
    }
  }, [setSearchParams, pageSize]);

  const handleFilterSubmit = useCallback((nextParams) => {
    if (nextParams instanceof URLSearchParams) {
      console.log("Filter submit params:", nextParams.toString());
      nextParams.set("page", "1");
      const params = getValuesFromParams(nextParams, controlledParams);
      params.limit = pageSize;
      setRequestParams(params);
      setSearchParams(nextParams, { replace: true });
    }
  }, [setSearchParams, pageSize]);

  const handlePageChange = (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const params = new URLSearchParams(searchParams);
    params.set("page", String(safePage));
    params.set("limit", String(pageSize));
    setSearchParams(params);
    setPage(safePage);
  };

  const handlePageSizeChange = (event) => {
    const nextSize = parsePageSize(event.target.value);
    const params = new URLSearchParams(searchParams);
    params.set("limit", String(nextSize));
    params.set("page", "1");
    setSearchParams(params);
    setPageSize(nextSize);
    setPage(1);
  };

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


  const errorMessage = error
    ? error?.data?.em ||
    error?.error ||
    "Không thể tải danh sách yêu cầu"
    : "";

  // Start debug
  // useRenderCount("OfficerRequestsPage");
  useEffect(() => {
    console.log("Data changed:", data);
  }, [data]);
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
            <>
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

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">Hiển thị</span>
                  <Form.Select
                    size="sm"
                    style={{ width: 110 }}
                    value={pageSize}
                    onChange={handlePageSizeChange}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size} / trang</option>
                    ))}
                  </Form.Select>
                </div>
                <PaginationControl
                  page={currentPage}
                  between={2}
                  total={totalForPagination}
                  limit={pageSize}
                  changePage={handlePageChange}
                  ellipsis={1}
                  next={currentPage < totalPages}
                  last={currentPage + 1 < totalPages}
                />
              </div>
            </>
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

export default OfficerManageRequestsPage;
