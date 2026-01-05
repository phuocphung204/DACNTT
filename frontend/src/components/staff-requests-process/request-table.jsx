import { useMemo } from "react";
import { Badge, Button, Table } from "react-bootstrap";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { REQUEST_PRIORITY, REQUEST_STATUS_ENUM } from "#components/_variables";
import { formatDateTime } from "#utils/format";

import styles from "../../pages/staff-requests-process/staff-requests-process-page.module.scss";
import { BsEye } from "react-icons/bs";

const RequestTable = ({ data, onViewDetail, onSendReminder, remindLoadingId }) => {
  const columns = useMemo(
    () => [
      {
        header: "Mã",
        accessorKey: "_id",
        cell: (info) => {
          const value = info.getValue();
          if (!value) return "_";
          return String(value).slice(-6).toUpperCase();
        },
      },
      {
        header: "Tiêu đề",
        accessorKey: "subject",
        cell: (info) => info.getValue() || "_",
      },
      {
        header: "Email",
        accessorKey: "student_email",
        cell: (info) => info.getValue() || "_",
      },
      {
        header: "Ưu tiên",
        accessorKey: "priority",
        cell: (info) => {
          const isPending = info.row.original.status === REQUEST_STATUS_ENUM.PENDING;
          if (isPending) return "_";
          return (
            <Badge bg={REQUEST_PRIORITY[info.getValue()]?.variant}>
              {REQUEST_PRIORITY[info.getValue()]?.label}
            </Badge>
          );
        },
      },
      {
        header: "Thời gian",
        accessorKey: "created_at",
        cell: (info) => (
          <span className="text-nowrap">{formatDateTime(info.getValue())}</span>
        ),
      },
      {
        header: "Dự kiến",
        accessorKey: "dueAt",
        cell: (info) => {
          const isPending = info.row.original.status === REQUEST_STATUS_ENUM.PENDING;
          if (isPending) return "_";
          const dueAt = info.getValue();
          const dueState = info.row.original.dueState;
          if (!dueAt) return "_";
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
          return <span className="text-muted" title="Dự kiến hoàn thành">{formatDateTime(dueAt)}</span>;
        },
      },
      {
        header: "Thao tác",
        id: "actions",
        cell: ({ row }) => {
          return (
            <div className="d-flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => onViewDetail(row.original)}
              >
                <BsEye />
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
      <tbody className="fw-light">
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

export default RequestTable;
