import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, Spinner, Table } from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { BsArrowRepeat, BsEye, BsPencilSquare } from "react-icons/bs";
import { toast } from "react-toastify";

import { userModalDialogStore, useShallow } from "#custom-hooks";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "#components/_variables";
import { useGetDepartmentsQuery, useUpdateDepartmentMutation } from "#services/department-services";

import styles from "./manage-departments-page.module.scss";

const DepartmentSummary = ({ department }) => {
  if (!department) {
    return <Alert variant="warning">Không tìm thấy dữ liệu phòng ban.</Alert>;
  }

  const labels = Array.isArray(department.labels) ? department.labels : [];

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-start justify-content-between">
        <div>
          <h5 className="mb-1">{department.name || "Chưa đặt tên"}</h5>
          <div className="text-muted small">{department.email || "Chưa có email"}</div>
        </div>
        <Badge bg="info" text="dark" className={styles.badgePill}>
          {labels.length} nhãn
        </Badge>
      </div>

      <div>
        <div className="text-muted small">Mô tả</div>
        <div className={styles.descBox}>
          {department.description || "Chưa có mô tả"}
        </div>
      </div>

      <div>
        <div className="text-muted small mb-1">Danh sách nhãn</div>
        <div className="d-flex flex-wrap gap-2">
          {labels.length === 0 && <span className="text-muted">Chưa có nhãn</span>}
          {labels.map((item) => (
            <Badge key={item.label_id || item.label} bg="light" text="dark" className={styles.badgePill}>
              {item.label || item.label_id}
            </Badge>
          ))}
        </div>
      </div>

      <div className="row g-3 text-muted small">
        <div className="col-md-6">
          <div>Số điện thoại</div>
          <div className="fw-semibold text-dark">{department.phone_number || "Chưa có"}</div>
        </div>
        <div className="col-md-6">
          <div>Phòng</div>
          <div className="fw-semibold text-dark">{department.room || "Chưa có"}</div>
        </div>
      </div>
    </div>
  );
};

const DepartmentForm = ({ defaultValues, onSubmit, submitting }) => {
  const [formValues, setFormValues] = useState(() => ({
    name: defaultValues?.name || "",
    description: defaultValues?.description || "",
    email: defaultValues?.email || "",
    phone_number: defaultValues?.phone_number || "",
    room: defaultValues?.room || "",
  }));

  useEffect(() => {
    setFormValues({
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      email: defaultValues?.email || "",
      phone_number: defaultValues?.phone_number || "",
      room: defaultValues?.room || "",
    });
  }, [defaultValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(formValues);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3" controlId="dept-name">
        <Form.Label>Tên phòng ban</Form.Label>
        <Form.Control
          name="name"
          value={formValues.name}
          onChange={handleChange}
          required
          placeholder="Nhập tên phòng ban"
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="dept-description">
        <Form.Label>Mô tả</Form.Label>
        <Form.Control
          className={styles.descBox}
          as="textarea"
          rows={3}
          name="description"
          value={formValues.description}
          onChange={handleChange}
          required
          placeholder="Mô tả ngắn gọn chức năng, nhiệm vụ"
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="dept-email">
        <Form.Label>Email</Form.Label>
        <Form.Control
          type="email"
          name="email"
          value={formValues.email}
          onChange={handleChange}
          placeholder="contact@donvi.vn"
        />
      </Form.Group>

      <div className="row g-3">
        <div className="col-md-6">
          <Form.Group controlId="dept-phone">
            <Form.Label>Số điện thoại</Form.Label>
            <Form.Control
              name="phone_number"
              value={formValues.phone_number}
              onChange={handleChange}
              placeholder="0123 456 789"
            />
          </Form.Group>
        </div>
        <div className="col-md-6">
          <Form.Group controlId="dept-room">
            <Form.Label>Phòng</Form.Label>
            <Form.Control
              name="room"
              value={formValues.room}
              onChange={handleChange}
              placeholder="Tầng 3 - P.301"
            />
          </Form.Group>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 text-muted small mt-3">
        <Spinner animation="grow" size="sm" className={submitting ? "" : "invisible"} />
        {submitting ? "Đang lưu thay đổi..." : "Kiểm tra thông tin trước khi lưu"}
      </div>

      <div className="mt-3 text-end">
        <Button type="submit" disabled={submitting}>Lưu</Button>
      </div>
    </Form>
  );
};

const DepartmentTable = ({ data, onView, onEdit }) => {
  const columns = useMemo(
    () => [
      {
        header: "Tên phòng ban",
        accessorKey: "name",
        cell: (info) => info.getValue() || "-",
      },
      {
        header: "Email",
        accessorKey: "email",
        cell: (info) => info.getValue() || "-",
      },
      {
        header: "Điện thoại",
        accessorKey: "phone_number",
        cell: (info) => info.getValue() || "-",
      },
      {
        header: "Phòng",
        accessorKey: "room",
        cell: (info) => info.getValue() || "-",
      },
      {
        id: "actions",
        header: "Thao tác",
        cell: ({ row }) => (
          <div className={styles.tableActions}>
            <Button
              size="sm"
              variant="outline-primary"
              title="Chỉnh sửa"
              onClick={() => onEdit?.(row.original)}
            >
              <BsPencilSquare />
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              title="Xem tổng quát"
              onClick={() => onView?.(row.original)}
            >
              <BsEye />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onView]
  );

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  return (
    <Table striped responsive hover className="align-middle">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="text-center text-muted py-3">
              Chưa có phòng ban nào.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
};

const ManageDepartmentsPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { push, resetModal } = userModalDialogStore(
    useShallow((state) => ({
      push: state.push,
      resetModal: state.reset,
    }))
  );

  const { data, isLoading, isFetching, error, refetch } = useGetDepartmentsQuery();
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();

  const departments = useMemo(() => (Array.isArray(data?.dt) ? data.dt : []), [data]);

  const totalItems = departments.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const loading = isLoading || isFetching;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return departments.slice(start, start + pageSize);
  }, [departments, page, pageSize]);

  const handlePageChange = (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
  };

  const handlePageSizeChange = (event) => {
    const nextSize = Number(event.target.value) || DEFAULT_PAGE_SIZE;
    setPageSize(nextSize);
    setPage(1);
  };

  const handleView = (dept) => {
    if (!dept) return;
    push({
      title: "Thông tin phòng ban",
      bodyComponent: DepartmentSummary,
      bodyProps: { department: dept },
      size: "lg",
      buttons: [],
    });
  };

  const handleEdit = (dept) => {
    if (!dept?._id) return;
    push({
      title: "Chỉnh sửa phòng ban",
      bodyComponent: DepartmentForm,
      bodyProps: {
        defaultValues: dept,
        submitting: isUpdating,
        onSubmit: async (values) => {
          try {
            console.log("Submitting values:", values);
            const response = await updateDepartment({ departmentId: dept._id, payload: values }).unwrap();
            const success = response?.ec === 200 || response?.ec === 201;
            if (!success) throw new Error(response?.em || "Không thể cập nhật phòng ban");
            toast.success("Cập nhật phòng ban thành công");
            resetModal?.();
            refetch?.();
          } catch (err) {
            toast.error(err?.em || err?.message || "Không thể cập nhật phòng ban");
          }
        },
      },
      size: "lg",
      buttons: [],
    });
  };

  const getErrorMessage = (err) => err?.em || err?.message || "Không thể tải dữ liệu phòng ban.";

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.headerTitle}>Quản lý phòng ban</div>
          <div className={styles.metaText}>Xem danh sách phòng ban, nhãn và thông tin liên hệ</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button size="sm" variant="outline-secondary" onClick={refetch} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <BsArrowRepeat className="me-2" />}Làm mới
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-3">{getErrorMessage(error)}</Alert>}

      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="text-muted small">Tổng số: {totalItems}</div>
            {loading && <Spinner animation="border" size="sm" />}
          </div>

          <DepartmentTable
            data={paginatedData}
            onView={handleView}
            onEdit={handleEdit}
          />

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small">Hiển thị</span>
              <Form.Select
                size="sm"
                style={{ width: 130 }}
                value={pageSize}
                onChange={handlePageSizeChange}
                aria-label="Chọn số dòng mỗi trang"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} / trang</option>
                ))}
              </Form.Select>
            </div>
            <PaginationControl
              page={page}
              between={2}
              total={Math.max(totalItems, 1)}
              limit={pageSize}
              changePage={handlePageChange}
              ellipsis={1}
              next={page < totalPages}
              last={page + 1 < totalPages}
            />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ManageDepartmentsPage;
