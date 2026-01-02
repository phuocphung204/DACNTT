import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  Legend as ChartLegend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Stack,
  Table,
} from "react-bootstrap";
import { BsArrowRepeat } from "react-icons/bs";
import { Bar, Line } from "react-chartjs-2";
import styles from "./dashboard-page.module.scss";

import { REQUEST_STATUS } from "#components/_variables";
import {
  useGetAdvancedDashboardQuery,
  useGetDepartmentDashboardQuery,
} from "#services/dashboard-services";
import { useGetDepartmentsQuery } from "#services/department-services";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ChartTooltip, ChartLegend);

const colorPaletteHex = [
  "#0d6efd", // primary
  "#198754", // success
  "#0dcaf0", // info
  "#ffc107", // warning
  "#dc3545", // danger
  "#6c757d", // secondary
  "#212529", // dark
  "#6610f2", // purple
];
const colorPalette = ["primary", "success", "info", "warning", "danger", "secondary", "dark", "primary"];

const getInitialFilters = () => {
  const now = new Date();
  return {
    mode: "year",
    year: now.getFullYear(),
    quarter: Math.floor(now.getMonth() / 3) + 1,
    month: now.getMonth() + 1,
    week: 1,
    start: "",
    end: "",
    departmentId: "",
  };
};

const buildQueryParams = (filters) => {
  const { mode, year, quarter, month, week, start, end } = filters;
  switch (mode) {
    case "quarter":
      return { annual: Number(year), quarterly: Number(quarter) };
    case "month":
      return { annual: Number(year), monthly: Number(month) };
    case "week":
      return { annual: Number(year), monthly: Number(month), weekly: Number(week) };
    case "range":
      return { start: start || undefined, end: end || undefined };
    case "year":
    default:
      return { annual: Number(year) };
  }
};

const formatTimelineLabel = (item) => {
  if (item?.day) return `Ngày ${item.day}`;
  if (item?.week) return `Tuần ${item.week}`;
  if (item?.month) return `Tháng ${item.month}`;
  return "Khác";
};

const numberFormat = (value) => {
  if (typeof value !== "number") return "0";
  return value.toLocaleString("vi-VN");
};

const Legend = ({ labels, colors }) => (
  <div className="d-flex flex-wrap gap-2 small">
    {labels.length === 0 && <span className="text-muted">Chưa có nhãn</span>}
    {labels.map((label) => (
      <Badge bg={colors[label]} key={label} className="px-2 py-1">
        {label}
      </Badge>
    ))}
  </div>
);

const DashboardPage = () => {
  const [scope, setScope] = useState("overall"); // overall | department
  const [filters, setFilters] = useState(() => getInitialFilters());
  const [appliedFilters, setAppliedFilters] = useState(() => getInitialFilters());

  const timeParams = useMemo(() => buildQueryParams(appliedFilters), [appliedFilters]);

  const { data: advancedResponse, isFetching: loadingAdvanced, refetch: refetchAdvanced } =
    useGetAdvancedDashboardQuery(timeParams, { skip: scope !== "overall" });

  const {
    data: departmentResponse,
    isFetching: loadingDepartment,
    refetch: refetchDepartment,
  } = useGetDepartmentDashboardQuery(
    { departmentId: appliedFilters.departmentId, params: timeParams },
    { skip: scope !== "department" || !appliedFilters.departmentId }
  );

  const { data: departmentsResponse, isFetching: loadingDepartments } = useGetDepartmentsQuery();

  const departments = useMemo(
    () => (Array.isArray(departmentsResponse?.dt) ? departmentsResponse.dt : []),
    [departmentsResponse]
  );

  const advanced = advancedResponse?.dt || {};
  const department = departmentResponse?.dt || {};

  const isOverall = scope === "overall";
  const isDepartment = scope === "department";
  const isLoading = loadingAdvanced || (appliedFilters.departmentId ? loadingDepartment : false);

  const labels = useMemo(() => {
    const set = new Set();
    const source = isOverall ? advanced.by_label : department.by_label;
    (source || []).forEach((item) => item?.label && set.add(item.label));
    return Array.from(set);
  }, [advanced.by_label, department.by_label, isOverall]);

  const labelColors = useMemo(() => {
    const map = {};
    labels.forEach((label, idx) => {
      map[label] = colorPalette[idx % colorPalette.length];
    });
    return map;
  }, [labels]);

  const labelColorsHex = useMemo(() => {
    const map = {};
    labels.forEach((label, idx) => {
      map[label] = colorPaletteHex[idx % colorPaletteHex.length];
    });
    return map;
  }, [labels]);

  const getVariantHex = (variant) => {
    switch (variant) {
      case "primary": return "#0d6efd";
      case "success": return "#198754";
      case "info": return "#0dcaf0";
      case "warning": return "#ffc107";
      case "danger": return "#dc3545";
      case "secondary": return "#6c757d";
      case "dark": return "#212529";
      default: return "#6c757d";
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleScopeChange = (event) => {
    const nextScope = event.target.value;
    setScope(nextScope);
    if (nextScope === "overall") {
      setFilters((prev) => ({ ...prev, departmentId: "" }));
    }
  };

  const handleApplyFilter = (event) => {
    event.preventDefault();
    if (scope === "overall") {
      setAppliedFilters({ ...filters, departmentId: "" });
    } else {
      setAppliedFilters(filters);
    }
  };

  const handleReset = () => {
    const fresh = getInitialFilters();
    setFilters(fresh);
    setAppliedFilters(fresh);
  };

  const handleRefresh = () => {
    if (isOverall) refetchAdvanced();
    if (isDepartment && appliedFilters.departmentId) refetchDepartment();
  };

  const statusStats = isOverall ? (advanced.by_status || []) : (department.by_status || []);
  const labelStats = isOverall ? (advanced.by_label || []) : (department.by_label || []);
  const timelineGlobal = advanced.timeline_label || [];
  const timelineDepartment = department.timeline_label || [];

  const statusChartData = useMemo(() => ({
    labels: statusStats.map((item) => REQUEST_STATUS[item.status]?.label || item.status),
    datasets: [
      {
        label: "Số yêu cầu",
        data: statusStats.map((item) => item.count || 0),
        backgroundColor: statusStats.map((item) => getVariantHex(REQUEST_STATUS[item.status]?.variant || "secondary")),
        borderRadius: 6,
      },
    ],
  }), [statusStats]);

  const statusChartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${numberFormat(context.parsed.y || 0)}`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  }), []);

  const labelChartData = useMemo(() => ({
    labels: labelStats.map((item) => item.label),
    datasets: [
      {
        label: "Số yêu cầu",
        data: labelStats.map((item) => item.count || 0),
        backgroundColor: labelStats.map((item, idx) => labelColorsHex[item.label] || colorPaletteHex[idx % colorPaletteHex.length]),
        borderRadius: 6,
      },
    ],
  }), [labelStats, labelColorsHex]);

  const labelChartOptions = statusChartOptions;

  const buildTimelineLineData = (timeline) => {
    const timelineLabels = timeline.map((item) => formatTimelineLabel(item));
    const datasets = labels.map((label) => ({
      label,
      data: timeline.map((item) => (item.labels?.[label] || 0)),
      borderColor: labelColorsHex[label],
      backgroundColor: labelColorsHex[label],
      tension: 0.3,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
    })).filter((ds) => ds.data.some((v) => v > 0));
    return { labels: timelineLabels, datasets };
  };

  const buildTimelineStackedBarData = (timeline) => {
    const timelineLabels = timeline.map((item) => formatTimelineLabel(item));
    const datasets = labels.map((label) => ({
      label,
      data: timeline.map((item) => (item.labels?.[label] || 0)),
      backgroundColor: labelColorsHex[label],
      borderColor: labelColorsHex[label],
      borderWidth: 0,
      borderRadius: 4,
    })).filter((ds) => ds.data.some((v) => v > 0));
    return { labels: timelineLabels, datasets };
  };

  const timelineLineOptions = useMemo(() => ({
    responsive: true,
    interaction: { mode: "nearest", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${numberFormat(context.parsed.y || 0)} yêu cầu`,
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  }), []);

  const timelineStackedOptions = useMemo(() => ({
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${numberFormat(context.parsed.y || 0)} yêu cầu`,
        },
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    },
  }), []);

  const renderTimeline = (timeline, title, mode = "line") => {
    const chartData = mode === "stacked"
      ? buildTimelineStackedBarData(timeline)
      : buildTimelineLineData(timeline);

    console.log("Rendering timeline:", { timeline, chartData, mode });

    const options = mode === "stacked" ? timelineStackedOptions : timelineLineOptions;
    const legendLabels = chartData.datasets.map((ds) => ds.label);

    return (
      <Card className="h-100">
        <Card.Header className="d-flex align-items-center justify-content-between">
          <div className="fw-semibold">{title}</div>
          <Legend labels={legendLabels} colors={labelColors} />
        </Card.Header>
        <Card.Body>
          {timeline.length === 0 || chartData.datasets.length === 0 ? (
            <Alert variant="secondary" className="mb-0">
              Chưa có dữ liệu cho khoảng thời gian đã chọn.
            </Alert>
          ) : mode === "stacked" ? (
            <Bar data={chartData} options={options} height={200} />
          ) : (
            <Line data={chartData} options={options} height={180} />
          )}
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Bảng điều khiển</h4>
          <div className="text-muted">Theo dõi tiến độ xử lý yêu cầu theo thời gian</div>
        </div>
        <Button variant="outline-secondary" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? <Spinner animation="border" size="sm" /> : <BsArrowRepeat className="me-2" />} Tải lại
        </Button>
      </div>

      <Card className="mb-3">
        <Card.Header className="fw-semibold">Bộ lọc thời gian</Card.Header>
        <Card.Body>
          <Form onSubmit={handleApplyFilter} className="row g-3 align-items-end">
            <Col md={3} sm={6}>
              <Form.Label>Chế độ xem</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check
                  type="radio"
                  id="scope-overall"
                  label="Tổng quát"
                  value="overall"
                  checked={scope === "overall"}
                  onChange={handleScopeChange}
                />
                <Form.Check
                  type="radio"
                  id="scope-department"
                  label="Theo phòng ban"
                  value="department"
                  checked={scope === "department"}
                  onChange={handleScopeChange}
                />
              </div>
            </Col>
            <Col md={2} sm={6}>
              <Form.Label>Chế độ</Form.Label>
              <Form.Select name="mode" value={filters.mode} onChange={handleInputChange}>
                <option value="year">Theo năm</option>
                <option value="quarter">Theo quý</option>
                <option value="month">Theo tháng</option>
                <option value="week">Theo tuần</option>
                <option value="range">Khoảng ngày</option>
              </Form.Select>
            </Col>

            {filters.mode !== "range" && (
              <Col md={2} sm={6}>
                <Form.Label>Năm</Form.Label>
                <Form.Control
                  type="number"
                  name="year"
                  value={filters.year}
                  min={2000}
                  onChange={handleInputChange}
                />
              </Col>
            )}

            {filters.mode === "quarter" && (
              <Col md={2} sm={6}>
                <Form.Label>Quý</Form.Label>
                <Form.Select name="quarter" value={filters.quarter} onChange={handleInputChange}>
                  <option value="1">Quý 1</option>
                  <option value="2">Quý 2</option>
                  <option value="3">Quý 3</option>
                  <option value="4">Quý 4</option>
                </Form.Select>
              </Col>
            )}

            {(filters.mode === "month" || filters.mode === "week") && (
              <Col md={2} sm={6}>
                <Form.Label>Tháng</Form.Label>
                <Form.Select name="month" value={filters.month} onChange={handleInputChange}>
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                    <option key={m} value={m}>{`Tháng ${m}`}</option>
                  ))}
                </Form.Select>
              </Col>
            )}

            {filters.mode === "week" && (
              <Col md={2} sm={6}>
                <Form.Label>Tuần</Form.Label>
                <Form.Select name="week" value={filters.week} onChange={handleInputChange}>
                  {Array.from({ length: 5 }, (_, idx) => idx + 1).map((w) => (
                    <option key={w} value={w}>{`Tuần ${w}`}</option>
                  ))}
                </Form.Select>
              </Col>
            )}

            {filters.mode === "range" && (
              <>
                <Col md={3} sm={6}>
                  <Form.Label>Từ ngày</Form.Label>
                  <Form.Control
                    type="date"
                    name="start"
                    value={filters.start}
                    onChange={handleInputChange}
                  />
                </Col>
                <Col md={3} sm={6}>
                  <Form.Label>Đến ngày</Form.Label>
                  <Form.Control
                    type="date"
                    name="end"
                    value={filters.end}
                    onChange={handleInputChange}
                  />
                </Col>
              </>
            )}

            <Col md={3} sm={6}>
              <Form.Label>Phòng ban</Form.Label>
              <Form.Select
                name="departmentId"
                value={filters.departmentId}
                onChange={handleInputChange}
                disabled={loadingDepartments || scope === "overall"}
              >
                <option value="">Tất cả (toàn hệ thống)</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md="auto" className="d-flex gap-2">
              <Button type="submit" variant="primary">Áp dụng</Button>
              <Button variant="outline-secondary" onClick={handleReset}>Đặt lại</Button>
            </Col>
          </Form>
        </Card.Body>
      </Card>

      {isOverall && (
        <Row className="g-3 mb-3">
          <Col md={4} sm={6}>
            <Card className={`${styles.statCard} ${styles.primary} h-100`}>
              <Card.Body>
                <div className="text-muted small">Tổng yêu cầu</div>
                <div className="display-6 fw-semibold">{numberFormat(advanced.total_requests || 0)}</div>
                <div className="text-muted small">Trong phạm vi lọc</div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} sm={6}>
            <Card className={`${styles.statCard} ${styles.info} h-100`}>
              <Card.Body>
                <div className="text-muted small">Trạng thái phổ biến</div>
                <div className="h4 fw-semibold mb-1">
                  {statusStats?.[0]?.status
                    ? REQUEST_STATUS[statusStats[0].status]?.label || statusStats[0].status
                    : "Chưa có"}
                </div>
                <div className="text-muted small">
                  {statusStats?.[0]?.count ? `${numberFormat(statusStats[0].count)} yêu cầu` : "Không có dữ liệu"}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4} sm={6}>
            <Card className={`${styles.statCard} ${styles.success} h-100`}>
              <Card.Body>
                <div className="text-muted small">Số nhãn đang theo dõi</div>
                <div className="display-6 fw-semibold">{labels.length}</div>
                <div className="text-muted small">Dựa trên dữ liệu trả về</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {isDepartment && appliedFilters.departmentId && (
        <Row className="g-3 mb-3">
          <Col md={3} sm={6}>
            <Card className={`${styles.statCard} ${styles.primary} h-100`}>
              <Card.Body>
                <div className="text-muted small">Tổng yêu cầu (phòng ban)</div>
                <div className="h3 fw-semibold">{numberFormat(department.total_requests || 0)}</div>
                <div className="text-muted small">Bao gồm tất cả trạng thái</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className={`${styles.statCard} ${styles.warning} h-100`}>
              <Card.Body>
                <div className="text-muted small">Yêu cầu trễ hạn</div>
                <div className="display-6 fw-semibold">{numberFormat(department.total_overdue_requests || 0)}</div>
                <div className="text-muted small">Riêng phòng ban đã chọn</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className={`${styles.statCard} ${styles.success} h-100`}>
              <Card.Body>
                <div className="text-muted small">Đã dùng gợi ý phân loại</div>
                <div className="h3 fw-semibold">{numberFormat(department.total_prediction_used || 0)}</div>
                <div className="text-muted small">Số yêu cầu đã áp dụng AI</div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className={`${styles.statCard} ${styles.info} h-100`}>
              <Card.Body>
                <div className="text-muted small">Nhãn nhiều nhất (phòng ban)</div>
                <div className="h4 fw-semibold mb-1">
                  {department.by_label?.[0]?.label || "Chưa có"}
                </div>
                <div className="text-muted small">
                  {department.by_label?.[0]?.count
                    ? `${numberFormat(department.by_label[0].count)} yêu cầu`
                    : "Không có dữ liệu"}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Row className="g-3 mb-3">
        {isOverall && (
          <>
            <Col lg={6}>
              <Card className="h-100">
                <Card.Header className="fw-semibold">Phân bố trạng thái</Card.Header>
                <Card.Body>
                  {loadingAdvanced ? (
                    <div className="text-center py-4"><Spinner animation="border" /></div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      <Bar data={statusChartData} options={statusChartOptions} height={180} />
                      <div className="d-flex flex-wrap gap-2 small">
                        {statusStats.length === 0 && <span className="text-muted">Chưa có dữ liệu.</span>}
                        {statusStats.map((item) => (
                          <Badge key={item.status} bg={REQUEST_STATUS[item.status]?.variant || "secondary"}>
                            {REQUEST_STATUS[item.status]?.label || item.status}: {numberFormat(item.count)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="h-100">
                <Card.Header className="fw-semibold">Phân bố nhãn</Card.Header>
                <Card.Body>
                  {loadingAdvanced ? (
                    <div className="text-center py-4"><Spinner animation="border" /></div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      <Bar data={labelChartData} options={labelChartOptions} height={180} />
                      <div className="d-flex flex-wrap gap-2 small">
                        {labelStats.length === 0 && <span className="text-muted">Chưa có dữ liệu.</span>}
                        {labelStats.map((item) => (
                          <Badge key={item.label} bg={labelColors[item.label] || "secondary"}>
                            {item.label}: {numberFormat(item.count)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </>
        )}

        {isDepartment && (
          <>
            <Col lg={6}>
              <Card className="h-100">
                <Card.Header className="fw-semibold">Phân bố trạng thái (phòng ban)</Card.Header>
                <Card.Body>
                  {loadingDepartment ? (
                    <div className="text-center py-4"><Spinner animation="border" /></div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      <Bar data={statusChartData} options={statusChartOptions} height={180} />
                      <div className="d-flex flex-wrap gap-2 small">
                        {statusStats.length === 0 && <span className="text-muted">Chưa có dữ liệu.</span>}
                        {statusStats.map((item) => (
                          <Badge key={item.status} bg={REQUEST_STATUS[item.status]?.variant || "secondary"}>
                            {REQUEST_STATUS[item.status]?.label || item.status}: {numberFormat(item.count)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col lg={6}>
              <Card className="h-100">
                <Card.Header className="fw-semibold">Phân bố nhãn (phòng ban)</Card.Header>
                <Card.Body>
                  {loadingDepartment ? (
                    <div className="text-center py-4"><Spinner animation="border" /></div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      <Bar data={labelChartData} options={labelChartOptions} height={180} />
                      <div className="d-flex flex-wrap gap-2 small">
                        {labelStats.length === 0 && <span className="text-muted">Chưa có dữ liệu.</span>}
                        {labelStats.map((item) => (
                          <Badge key={item.label} bg={labelColors[item.label] || "secondary"}>
                            {item.label}: {numberFormat(item.count)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Row className="g-3 mb-3">
        {isOverall && (
          <Col lg={12}>
            {loadingAdvanced ? (
              <Card className="h-100">
                <Card.Body className="text-center py-4"><Spinner animation="border" /></Card.Body>
              </Card>
            ) : (
              renderTimeline(timelineGlobal, "Nhãn theo thời gian (toàn hệ thống)", "line")
            )}
          </Col>
        )}

        {isDepartment && (
          <Col lg={12}>
            {scope === "department" && !appliedFilters.departmentId ? (
              <Card className="h-100">
                <Card.Body className="text-center py-4 text-muted">
                  Chọn một phòng ban để xem biểu đồ.
                </Card.Body>
              </Card>
            ) : loadingDepartment ? (
              <Card className="h-100">
                <Card.Body className="text-center py-4"><Spinner animation="border" /></Card.Body>
              </Card>
            ) : (
              renderTimeline(timelineDepartment, "Nhãn theo thời gian (phòng ban)", "stacked")
            )}
          </Col>
        )}
      </Row>

      {isDepartment && appliedFilters.departmentId && (
        <Card className="mb-3">
          <Card.Header className="fw-semibold">Yêu cầu trễ hạn theo người xử lý</Card.Header>
          <Card.Body>
            {loadingDepartment ? (
              <div className="text-center py-4"><Spinner animation="border" /></div>
            ) : department.overdue_by_assignee?.length ? (
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle">
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Email</th>
                      <th>Chức vụ</th>
                      <th>Vai trò</th>
                      <th className="text-end">Số yêu cầu trễ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {department.overdue_by_assignee.map((item) => (
                      <tr key={item.account_id || item.email}>
                        <td>{item.name || "-"}</td>
                        <td>{item.email || "-"}</td>
                        <td>{item.position || "-"}</td>
                        <td>{item.role || "-"}</td>
                        <td className="text-end fw-semibold">{numberFormat(item.count || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <Alert variant="success" className="mb-0">Phòng ban không có yêu cầu trễ hạn.</Alert>
            )}
          </Card.Body>
        </Card>
      )}

      {(loadingAdvanced || loadingDepartment) && (
        <Stack direction="horizontal" gap={2} className="mt-2 text-muted small">
          <Spinner animation="grow" size="sm" />
          <span>Đang tải dữ liệu dashboard...</span>
        </Stack>
      )}
    </Container>
  );
};

export default DashboardPage;
