import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, Spinner, Table } from "react-bootstrap";
import { PaginationControl } from "react-bootstrap-pagination-control";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BsArrowRepeat, BsEye, BsPencil, BsPlus } from "react-icons/bs";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { userModalDialogStore, useShallow } from "#custom-hooks";
import { ACCOUNT_ROLES, ACCOUNT_ROLES_ENUM, GENDER, GENDER_ENUM, PAGE_SIZE_OPTIONS, WORK_STATUS, WORK_STATUS_ENUM } from "#components/_variables";
import {
  useCreateAccountMutation,
  useGetAccountByIdQuery,
  useGetAccountsQuery,
  useUpdateAccountMutation,
} from "#services/account-services";
import { useGetDepartmentsQuery } from "#services/department-services";
import { createAccountSchema, updateAccountSchema } from "#schemas";
import { formatDate, parsePageSize, parsePageParam } from "#utils";
import Filter from "#components/common/filter";
import RoleGuard from "#components/common/role-guard";

import styles from "./manage-accounts-page.module.scss";

const buildFilterFromSearchParams = (params) => {
  const nextFilter = {};
  const roles = params.getAll("role");
  const workStatuses = params.getAll("work_status");
  const activeStates = params.getAll("active");

  if (roles.length > 0) nextFilter.role = roles;
  if (workStatuses.length > 0) nextFilter.work_status = workStatuses;
  if (activeStates.length > 0) {
    nextFilter.active = activeStates.map((item) => item === "true" || item === true);
  }
  return nextFilter;
};

const mapAccountToFormValues = (account = {}) => ({
  _id: account?._id || "",
  name: account?.name || "",
  email: account?.email || "",
  position: account?.position || "",
  gender: account?.gender || GENDER_ENUM.MALE,
  role: account?.role || ACCOUNT_ROLES_ENUM.OFFICER,
  department_id: typeof account?.department_id === "object"
    ? account?.department_id?._id || ""
    : account?.department_id || "",
  work_status: account?.work_status || WORK_STATUS_ENUM.ACTIVE,
  active: typeof account?.active === "boolean" ? account?.active : true,
});

const AccountDetailBody = ({ accountId }) => {
  const { data, isFetching } = useGetAccountByIdQuery(accountId, { skip: !accountId });
  const account = data?.dt;

  if (isFetching) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  if (!account) {
    return <Alert variant="warning">Không tìm thấy thông tin tài khoản.</Alert>;
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h5 className="mb-1">{account.name}</h5>
          <div className="text-muted">{account.email}</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Badge bg={account.active ? "success" : "secondary"}>
            {account.active ? "Đang hoạt động" : "Đã khóa"}
          </Badge>
          <Badge bg={WORK_STATUS[account.work_status]?.variant || "secondary"}>
            {WORK_STATUS[account.work_status]?.label || account.work_status}
          </Badge>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="text-muted small">Vai trò</div>
          <div className="fw-semibold">{ACCOUNT_ROLES[account.role]?.label || account.role}</div>
        </div>
        <div className="col-md-6">
          <div className="text-muted small">Giới tính</div>
          <div className="fw-semibold">{GENDER[account.gender]?.label || account.gender}</div>
        </div>
        <div className="col-md-6">
          <div className="text-muted small">Phòng ban</div>
          <div className="fw-semibold">
            {typeof account?.department_id === "object"
              ? account?.department_id?.name
              : account?.department_id || "-"}
          </div>
        </div>
        <div className="col-md-6">
          <div className="text-muted small">Chức vụ</div>
          <div className="fw-semibold">{account.position || "-"}</div>
        </div>
        <div className="col-md-6">
          <div className="text-muted small">Ngày tạo</div>
          <div className="fw-semibold">{formatDate(account.created_at)}</div>
        </div>
        <div className="col-md-6">
          <div className="text-muted small">Cập nhật</div>
          <div className="fw-semibold">{formatDate(account.updated_at)}</div>
        </div>
      </div>
    </div>
  );
};

const AccountFormBody = ({ mode = "create", defaultValues, onSubmit, submitting, formId = "account-form" }) => {
  const { data: departmentsResponse, isFetching: loadingDepartments } = useGetDepartmentsQuery();
  const departments = useMemo(() => Array.isArray(departmentsResponse?.dt) ? departmentsResponse.dt : [], [departmentsResponse]);

  const schema = mode === "create" ? createAccountSchema : updateAccountSchema;
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, dirtyFields },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (mode === "create" && departments.length > 0 && !getValues("department_id")) {
      reset({ ...getValues(), department_id: departments[0]._id });
    }
  }, [departments, getValues, mode, reset]);

  const handleFormSubmit = (values) => {
    onSubmit?.(values, dirtyFields, reset);
  };

  return (
    <Form id={formId} onSubmit={handleSubmit(handleFormSubmit)}>
      <div className="row g-3">
        <div className="col-md-6">
          <Form.Group controlId={`${formId}-name`}>
            <Form.Label>Họ và tên</Form.Label>
            <Form.Control
              type="text"
              placeholder="Nhập họ và tên"
              isInvalid={!!errors.name}
              {...register("name")}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </div>
        <div className="col-md-6">
          <Form.Group controlId={`${formId}-email`}>
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="ten@donvi.vn"
              isInvalid={!!errors.email}
              autoComplete="email"
              {...register("email")}
            />
            <Form.Control.Feedback type="invalid">
              {errors.email?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </div>

        <div className="col-md-6">
          <Form.Group controlId={`${formId}-position`}>
            <Form.Label>Chức vụ</Form.Label>
            <Form.Control
              type="text"
              placeholder="Nhân viên hỗ trợ..."
              isInvalid={!!errors.position}
              {...register("position")}
            />
            <Form.Control.Feedback type="invalid">
              {errors.position?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </div>
        <div className="col-md-6">
          <Form.Group controlId={`${formId}-department`}>
            <Form.Label>Phòng ban</Form.Label>
            <Form.Select
              {...register("department_id")}
              isInvalid={!!errors.department_id}
              disabled={loadingDepartments}
            >
              {loadingDepartments && <option value="" disabled>Đang tải danh sách...</option>}
              {!loadingDepartments && departments.length === 0 && <option value="" disabled>Chưa có phòng ban</option>}
              {!loadingDepartments && departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors.department_id?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </div>

        <div className="col-md-6">
          <Form.Group controlId={`${formId}-gender`}>
            <Form.Label>Giới tính</Form.Label>
            <div className="d-flex align-items-center gap-3">
              <Form.Check
                inline
                type="radio"
                id={`${formId}-gender-male`}
                label="Nam"
                value="Male"
                {...register("gender")}
              />
              <Form.Check
                inline
                type="radio"
                id={`${formId}-gender-female`}
                label="Nữ"
                value="Female"
                {...register("gender")}
              />
            </div>
            <Form.Control.Feedback type="invalid" className="d-block">
              {errors.gender?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </div>
        <div className="col-md-6">
          <Form.Group controlId={`${formId}-role`}>
            <Form.Label>Vai trò</Form.Label>
            <Form.Select {...register("role")} isInvalid={!!errors.role}>
              <option value={ACCOUNT_ROLES_ENUM.OFFICER}>Cán bộ</option>
              <option value={ACCOUNT_ROLES_ENUM.STAFF}>Nhân viên</option>
              <option value={ACCOUNT_ROLES_ENUM.ADMIN}>Quản trị viên</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors.role?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </div>

        <div className="col-md-6">
          <Form.Group controlId={`${formId}-work-status`}>
            <Form.Label>Trạng thái công việc</Form.Label>
            <Form.Select {...register("work_status")} isInvalid={!!errors.work_status}>
              <option value={WORK_STATUS_ENUM.ACTIVE}>Đang làm việc</option>
              <option value={WORK_STATUS_ENUM.ON_LEAVE}>Nghỉ phép</option>
              <option value={WORK_STATUS_ENUM.RETIRED}>Đã nghỉ</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {errors.work_status?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </div>
        <div className="col-md-6 d-flex align-items-center">
          <Form.Check
            type="switch"
            id={`${formId}-active`}
            label="Kích hoạt tài khoản"
            {...register("active")}
            className="mt-4"
          />
        </div>
      </div>

      <div className="mt-3 d-flex align-items-center gap-2 text-muted small">
        <Spinner animation="grow" size="sm" className={submitting ? "" : "invisible"} />
        {submitting ? "Đang xử lý yêu cầu..." : "Kiểm tra kỹ thông tin trước khi lưu"}
      </div>
    </Form>
  );
};

const AccountTable = ({ data, onViewDetail, onEdit }) => {
  const columns = useMemo(
    () => [
      {
        header: "Họ tên",
        accessorKey: "name",
        cell: (info) => info.getValue() || "-",
      },
      {
        header: "Email",
        accessorKey: "email",
        cell: (info) => <span className="text-nowrap">{info.getValue() || "-"}</span>,
      },
      {
        header: "Phòng ban",
        accessorKey: "department_id",
        cell: (info) => {
          const dept = info.row.original.department_id;
          if (!dept) return "-";
          if (typeof dept === "string") return dept;
          return dept?.name || "-";
        },
      },
      {
        header: "Vai trò",
        accessorKey: "role",
        cell: (info) => (
          <Badge bg="info" text="dark">
            {ACCOUNT_ROLES[info.getValue()]?.label || info.getValue()}
          </Badge>
        ),
      },
      {
        header: "Hoạt động",
        accessorKey: "active",
        cell: (info) => {
          const active = info.getValue();
          return (
            <Badge bg={active ? "success" : "secondary"} className={styles.badgePill}>
              {active ? "Đang hoạt động" : "Đã khóa"}
            </Badge>
          );
        },
      },
      {
        header: "Trạng thái",
        accessorKey: "work_status",
        cell: (info) => {
          const status = info.getValue();
          return (
            <Badge bg={WORK_STATUS[status]?.variant || "secondary"} className={styles.badgePill}>
              {WORK_STATUS[status]?.label || status}
            </Badge>
          );
        },
      },
      {
        header: "Ngày tạo",
        accessorKey: "created_at",
        cell: (info) => <span className="text-nowrap">{formatDate(info.getValue())}</span>,
      },
      {
        id: "actions",
        header: "Thao tác",
        cell: ({ row }) => (
          <div className={styles.tableActions}>
            <Button
              size="sm"
              variant="outline-secondary"
              title="Chi tiết"
              onClick={() => onViewDetail?.(row.original)}
            >
              <BsEye />
            </Button>
            <RoleGuard allowRoles={[ACCOUNT_ROLES_ENUM.ADMIN]}>
              <Button
                size="sm"
                variant="outline-primary"
                title="Chỉnh sửa"
                onClick={() => onEdit?.(row.original)}
              >
                <BsPencil />
              </Button>
            </RoleGuard>
          </div>
        ),
      },
    ],
    [onEdit, onViewDetail]
  );

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table responsive hover className="align-middle">
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
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

const ManageAccountsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [pageSize, setPageSize] = useState(parsePageSize(searchParams.get("limit")));
  const [filterState, setFilterState] = useState(buildFilterFromSearchParams(searchParams));

  const { push, resetModal } = userModalDialogStore(
    useShallow((state) => ({
      push: state.push,
      resetModal: state.reset,
    }))
  );

  const { data: accountsResponse, isLoading, isFetching, error, refetch } = useGetAccountsQuery({
    page,
    limit: pageSize,
    filter: filterState,
  });

  const [createAccount, { isLoading: isCreating }] = useCreateAccountMutation();
  const [updateAccount, { isLoading: isUpdating }] = useUpdateAccountMutation();

  const accounts = useMemo(() => {
    if (Array.isArray(accountsResponse?.dt)) return accountsResponse.dt;
    if (Array.isArray(accountsResponse?.dt?.accounts)) return accountsResponse.dt.accounts;
    return [];
  }, [accountsResponse]);

  const totalItems = accountsResponse?.dt?.total ?? accounts.length;
  const totalForPagination = Math.max(totalItems, 1);
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const loading = isLoading || isFetching;

  const getErrorMessage = (err) => err?.em || err?.message || "Không thể tải dữ liệu";
  const displayError = error ? getErrorMessage(error) : "";

  // useEffect(() => {
  //   console.log("Sync page and pageSize with URL params");
  //   if (page !== currentPage) {
  //     const next = new URLSearchParams(searchParams);
  //     next.set("page", String(currentPage));
  //     next.set("limit", String(pageSize));
  //     setSearchParams(next);
  //   }
  // }, [currentPage, page, pageSize, searchParams, setSearchParams]);

  // useEffect(() => {
  //   console.log("Update page, pageSize and filterState from URL params");
  //   setPage(parsePageParam(searchParams.get("page")));
  //   setPageSize(parsePageSize(searchParams.get("limit")));
  //   setFilterState(buildFilterFromSearchParams(searchParams));
  // }, [searchParams]);

  const handleFilterSubmit = (nextParams) => {
    const params = new URLSearchParams(nextParams);
    params.set("page", "1");
    params.set("limit", String(pageSize));
    setSearchParams(params);
    setFilterState(buildFilterFromSearchParams(params));
    setPage(1);
  };

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

  const handleCreateAccountSubmit = async (values) => {
    const payload = {
      name: values.name,
      email: values.email,
      position: values.position,
      gender: values.gender,
      role: values.role,
      department_id: values.department_id,
      work_status: values.work_status || WORK_STATUS_ENUM.ACTIVE,
      active: typeof values.active === "boolean" ? values.active : true,
    };
    try {
      const response = await createAccount(payload).unwrap();
      const success = response?.ec === 201 || response?.ec === 200;
      if (!success) throw new Error(response?.em || "Không thể tạo tài khoản");
      toast.success("Tạo tài khoản thành công");
      resetModal();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUpdateAccountSubmit = async (accountId, values, dirtyFields) => {
    const changedKeys = Object.keys(dirtyFields || {});
    if (changedKeys.length === 0) {
      toast.info("Bạn chưa thay đổi thông tin nào.");
      return;
    }
    const payload = {};
    changedKeys.forEach((key) => {
      payload[key] = values[key];
    });
    try {
      const response = await updateAccount({ accountId, payload }).unwrap();
      const success = response?.ec === 200 || response?.ec === 201;
      if (!success) throw new Error(response?.em || "Không thể cập nhật tài khoản");
      toast.success("Cập nhật tài khoản thành công");
      resetModal();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openCreateModal = () => {
    const formId = "account-form-create";
    const defaultValues = mapAccountToFormValues({
      role: ACCOUNT_ROLES_ENUM.OFFICER,
      work_status: WORK_STATUS_ENUM.ACTIVE,
      active: true,
      gender: GENDER_ENUM.MALE,
    });
    push({
      title: "Tạo tài khoản mới",
      bodyComponent: AccountFormBody,
      bodyProps: {
        mode: "create",
        defaultValues,
        onSubmit: handleCreateAccountSubmit,
        submitting: isCreating,
        formId,
      },
      size: "lg",
      buttons: [
        <Button key="submit-create" form={formId} type="submit" variant="primary" disabled={isCreating}>
          {isCreating && <Spinner animation="border" size="sm" className="me-2" />}
          Tạo tài khoản
        </Button>
      ],
    });
  };

  const openEditModal = (account) => {
    if (!account?._id) return;
    const formId = `account-form-${account?._id || "edit"}`;
    const defaultValues = mapAccountToFormValues(account);
    push({
      title: "Chỉnh sửa tài khoản",
      bodyComponent: AccountFormBody,
      bodyProps: {
        mode: "edit",
        defaultValues,
        onSubmit: (values, dirtyFields) => handleUpdateAccountSubmit(account?._id, values, dirtyFields),
        submitting: isUpdating,
        formId,
      },
      size: "lg",
      buttons: [
        <Button key="submit-edit" form={formId} type="submit" variant="primary" disabled={isUpdating}>
          {isUpdating && <Spinner animation="border" size="sm" className="me-2" />}
          Lưu thay đổi
        </Button>
      ],
    });
  };

  const openDetailModal = (account) => {
    if (!account?._id) return;
    push({
      title: "Thông tin tài khoản",
      bodyComponent: AccountDetailBody,
      bodyProps: { accountId: account?._id },
      size: "lg",
      buttons: [],
    });
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.headerTitle}>Quản lý tài khoản</div>
          <div className={styles.metaText}>Quản lý danh sách cán bộ, nhân viên và quyền truy cập</div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            <BsArrowRepeat className="me-1" />
            Làm mới
          </Button>
          <RoleGuard allowRoles={[ACCOUNT_ROLES_ENUM.ADMIN]}>
            <Button size="sm" onClick={openCreateModal}>
              <BsPlus className="me-1" />
              Thêm tài khoản
            </Button>
          </RoleGuard>
        </div>
      </div>

      <Card className="mb-3">
        <Card.Body className="d-flex flex-wrap gap-3 align-items-center">
          <Filter selectedFilterOptions={["role", "work_status", "active"]} onSubmit={handleFilterSubmit} />
          {loading && <Spinner animation="border" size="sm" />}
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          {displayError && (
            <Alert variant="danger" className="mb-3">
              {displayError}
            </Alert>
          )}

          {!loading && accounts.length === 0 ? (
            <div className="text-muted">Chưa có tài khoản nào.</div>
          ) : (
            <>
              <AccountTable
                data={accounts}
                onViewDetail={openDetailModal}
                onEdit={openEditModal}
              />

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
    </div>
  );
};

export default ManageAccountsPage;
