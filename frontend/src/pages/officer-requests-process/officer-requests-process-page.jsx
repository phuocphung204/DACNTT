import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Dropdown,
  Form,
  Nav,
  Offcanvas,
  Spinner,
  Table,
} from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { BsBoxArrowUpRight, BsEye, BsThreeDotsVertical } from "react-icons/bs";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { useGetMyAssignedRequestsQuery } from "#services/request-services";
import { formatDateTime } from "#utils/format";
import { PAGE_SIZE_OPTIONS, PRIORITY, REQUEST_PRIORITY_MODEL, REQUEST_STATUS, TIME_RANGE } from "#components/_variables";
import FilterClient from "#components/common/filter-cliend";

import styles from "./officer-requests-process-page.module.scss";
import { useDispatch, useSelector } from "react-redux";
import SearchBar from "#components/common/search-bar";
import { setValuesState } from "#redux/filter-slice";
import { removeVietnameseTones } from "#utils/normalize";

const PRIORITY_SLA_HOURS = {
  0: 48,
  1: 24,
  2: 8,
  3: 4,
};

const DUE_SOON_MS = 24 * 60 * 60 * 1000;

const normalizeStatus = (status) => {
  if (
    status === "Assigned" ||
    status === "InProgress" ||
    status === "Resolved" ||
    status === "Pending"
  ) {
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

const RequestTable = ({ data, onPreview, onViewDetail }) => {
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
          <Badge bg={REQUEST_PRIORITY_MODEL[info.getValue()]?.variant}>
            {REQUEST_PRIORITY_MODEL[info.getValue()]?.label}
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
              <span className="text-danger fw-semibold" title="Quá hạn">
                {formatDateTime(dueAt)}
              </span>
            );
          }
          if (dueState === "due") {
            return (
              <span className="text-warning fw-semibold" title="Sắp đến hạn">
                {formatDateTime(dueAt)}
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
          return (
            <Dropdown align="end">
              <Dropdown.Toggle
                bsPrefix="btn"
                variant="outline-secondary"
                size="sm"
                className="d-inline-flex align-items-center justify-content-center p-1"
                aria-label="Tùy chọn"
              >
                <BsThreeDotsVertical />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => onPreview?.(row.original)}>
                  <BsEye className="me-2" />
                  Xem tổng quát
                </Dropdown.Item>
                <Dropdown.Item onClick={() => onViewDetail?.(row.original)}>
                  <BsBoxArrowUpRight className="me-2" />
                  Xem chi tiết
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          );
        },
      },
    ],
    [onPreview, onViewDetail]
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row._id,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table striped hover responsive size="sm" className="align-middle">
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

const OfficerRequestsProcessPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const filterValues = useSelector((state) => state.filter.filterValues);
  const [previewRequest, setPreviewRequest] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [clientFilterValues, setClientFilterValues] = useState({
    priority: filterValues?.priority || [],
    status: filterValues?.status || [],
    searchText: filterValues?.searchText || "",
  });
  const currentSearchText = clientFilterValues?.searchText;


  const [activeTab, setActiveTab] = useState("assigned");
  const [pageSize, setPageSize] = useState(20);
  const [pageByTab, setPageByTab] = useState({
    assigned: 1,
    inProgress: 1,
    resolved: 1,
  });

  const [requestParams, setRequestParams] = useState({ timeRange: filterValues?.timeRange || "today" });

  const {
    data: requestsResponse,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetMyAssignedRequestsQuery(requestParams, {
    skip: !requestParams,
  });

  const requestBuckets = useMemo(() => {
    const data = requestsResponse?.dt || {};
    return {
      assigned: data?.assigned?.requests || [],
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

    const filterSearchText = (list) => {
      if (!clientFilterValues.searchText || clientFilterValues.searchText.trim() === "") return list;
      const searchTextLower = removeVietnameseTones(clientFilterValues.searchText.trim());
      return list.filter((item) => {
        const subject = item.subject || "";
        const studentEmail = item.student_email || "";
        return (
          removeVietnameseTones(subject).toLowerCase().includes(searchTextLower) ||
          removeVietnameseTones(studentEmail).toLowerCase().includes(searchTextLower)
        );
      });
    }

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

    const assigned = filterSearchText(filterStatus(filterPriority(applyDecorators(requestBuckets.assigned, "Assigned"))));
    const inProgress = filterSearchText(filterStatus(filterPriority(applyDecorators(requestBuckets.inProgress, "InProgress"))));
    const resolved = filterSearchText(filterStatus(filterPriority(applyDecorators(requestBuckets.resolved, "Resolved"))));

    return { assigned, inProgress, resolved };
  }, [requestBuckets, clientFilterValues]);
  // }, [requestBuckets, filterValues.priority, filterValues.status]);
  const groupList = useMemo(
    () => [
      {
        key: "assigned",
        title: "Mới nhận",
        variant: "secondary",
        data: filteredBuckets.assigned,
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
    setPageByTab({ assigned: 1, inProgress: 1, resolved: 1 });
  };

  const handleRefresh = () => {
    refetch?.();
  };

  const handlePreview = useCallback((request) => {
    if (!request) return;
    setPreviewRequest(request);
    setShowPreview(true);
  }, []);

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const handleOpenDetail = useCallback(
    (request) => {
      if (!request?._id) return;
      navigate(`/yeu-cau/${request._id}`);
    },
    [navigate]
  );

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
              setPageByTab({ assigned: 1, inProgress: 1, resolved: 1 });
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

  const handleSearchBarSubmit = (newParams) => {
    const q = newParams.get("q") || "";
    dispatch(setValuesState({ param: "searchText", values: q }));
    setClientFilterValues((prev) => ({ ...prev, searchText: q }));
  }

  const previewStatus = previewRequest
    ? normalizeStatus(previewRequest.status)
    : null;
  const previewStatusLabel = previewStatus
    ? REQUEST_STATUS[previewStatus]?.label || "Khác"
    : "";
  const previewStatusVariant = previewStatus
    ? REQUEST_STATUS[previewStatus]?.variant || "secondary"
    : "secondary";
  const previewPriorityLabel = previewRequest
    ? REQUEST_PRIORITY_MODEL[Number(previewRequest.priority)]?.label || "Trung bình"
    : "";
  const previewPriorityVariant = previewRequest
    ? REQUEST_PRIORITY_MODEL[Number(previewRequest.priority)]?.variant || "secondary"
    : "secondary";
  const previewLabel =
    previewRequest?.label || previewRequest?.prediction?.label || "Chưa gán";
  const previewCreatedAt =
    previewRequest?.created_at || previewRequest?.createdAt;
  const previewUpdatedAt =
    previewRequest?.updated_at || previewRequest?.updatedAt;
  const previewSubject = previewRequest?.subject || "Không có tiêu đề";
  const previewStudentEmail =
    previewRequest?.student_email || previewRequest?.studentEmail || "-";
  const previewId = previewRequest?._id || previewRequest?.id || "-";

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.headerTitle}>Xử lý yêu cầu</div>
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
          Làm mới
        </Button>
      </div>

      <Card className={`mb-3 ${styles.filtersCard}`}>
        <Card.Body>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="w-100">
              <SearchBar
                initialValue={currentSearchText}
                placeholder="Tìm kiếm theo tiêu đề, mã sinh viên"
                onSubmit={handleSearchBarSubmit}
              />
            </div>
            <FilterClient onSubmit={handleFilterSubmit}
              selectedFilterOptions={[TIME_RANGE, PRIORITY]}
              defaultValues={[{
                optionKey: TIME_RANGE,
                optionLabel: "Thời gian",
                displayValues: ["Hôm nay"],
              }]}
            />
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
            onSelect={(k) => setActiveTab(k || "assigned")}
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
                onPreview={handlePreview}
                onViewDetail={handleOpenDetail}
              />
              {renderPagination()}
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
              Chọn một yêu cầu và nhấn "Xem tổng quát" để hiển thị thông tin.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex flex-wrap gap-2">
                <Badge bg={previewStatusVariant}>{previewStatusLabel}</Badge>
                <Badge bg={previewPriorityVariant}>{previewPriorityLabel}</Badge>
              </div>
              <div className="border rounded bg-light p-3 d-flex flex-column gap-2">
                <div>
                  <div className="text-muted small">Tiêu đề</div>
                  <div className="fw-semibold">{previewSubject}</div>
                </div>
                <div>
                  <div className="text-muted small">Sinh viên</div>
                  <div className="fw-semibold">{previewStudentEmail}</div>
                </div>
                <div>
                  <div className="text-muted small">Nhãn</div>
                  <div className="fw-semibold">{previewLabel}</div>
                </div>
                <div>
                  <div className="text-muted small">Thời gian tạo</div>
                  <div className="fw-semibold">
                    {previewCreatedAt ? formatDateTime(previewCreatedAt) : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted small">Cập nhật</div>
                  <div className="fw-semibold">
                    {previewUpdatedAt ? formatDateTime(previewUpdatedAt) : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted small">Mã yêu cầu</div>
                  <div className="fw-semibold">{previewId}</div>
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

export default OfficerRequestsProcessPage;
