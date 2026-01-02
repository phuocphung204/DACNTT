import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, Nav, Spinner } from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { toast } from "react-toastify";

import { userModalDialogStore, useShallow } from "#custom-hooks";
import { useGetRequestsQuery, useSendReminderMutation } from "#services/request-services";
import { PAGE_SIZE_OPTIONS, PRIORITY, TIME_RANGE } from "#components/_variables";
import FilterClient from "#components/common/filter-cliend";
import SearchBar from "#components/common/search-bar";
import RequestTable from "../../components/staff-requests-process/request-table";
import RequestDetailModalBody from "../../components/staff-requests-process/request-detail-modal-body";
import { getErrorMessage } from "../../components/staff-requests-process/helpers";

import styles from "./staff-requests-process-page.module.scss";
import { removeVietnameseTones } from "#utils/normalize";

const PRIORITY_SLA_HOURS = {
  0: 48,
  1: 36,
  2: 24,
  3: 12,
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
  const priority = Number(request?.priority) || 0;
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

const StaffRequestsProcessPage = () => {
  const { push } = userModalDialogStore(
    useShallow((state) => ({
      push: state.push,
    }))
  );
  // TODO: sử dụng state từ điều hướng để thiết lập bộ lọc ban đầu
  // const { state: { qState = "", dateState = "", requestIdState = "" } = {} } = useLocation(); // Lấy state từ điều hướng

  const [clientFilterValues, setClientFilterValues] = useState({
    priority: [],
    status: [],
    searchText: "",
  });

  const [activeTab, setActiveTab] = useState("pending");
  const [pageSize, setPageSize] = useState(20);
  const [pageByTab, setPageByTab] = useState({
    pending: 1,
    inProgress: 1,
    resolved: 1,
  });
  const [remindLoadingId, setRemindLoadingId] = useState("");

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

    const pending = filterSearchText(filterStatus(filterPriority(applyDecorators(requestBuckets.pending, "Pending"))));
    const assigned = filterSearchText(filterStatus(filterPriority(applyDecorators(requestBuckets.assigned, "Assigned"))));
    const inProgress = filterSearchText(filterStatus(filterPriority(applyDecorators(requestBuckets.inProgress, "InProgress"))));
    const resolved = filterSearchText(filterStatus(filterPriority(applyDecorators(requestBuckets.resolved, "Resolved"))));

    return { pending, inProgress, resolved, assigned };
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
        key: "assigned",
        title: "Đã phân công",
        variant: "info",
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
    setClientFilterValues(prev => ({ ...prev, status, priority }));
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
        activeTab: activeTab,
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

  const handleSearchBarSubmit = (newParams) => {
    const q = newParams.get("q") || "";
    setClientFilterValues((prev) => ({ ...prev, searchText: q }));
  }

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
          Làm mới
        </Button>
      </div>

      <Card className={`mb-3 ${styles.filtersCard}`}>
        <Card.Body>
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="w-100">
              <SearchBar
                placeholder="Tìm kiếm theo tiêu đề, mã sinh viên"
                onSubmit={handleSearchBarSubmit}
              />
            </div>
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
