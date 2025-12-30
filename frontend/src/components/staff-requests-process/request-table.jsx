import { useMemo } from "react";
import { Badge, Button, Table } from "react-bootstrap";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { REQUEST_PRIORITY_MODEL } from "#components/_variables";
import { formatDateTime } from "#utils/format";

import styles from "../../pages/staff-requests-process/staff-requests-process-page.module.scss";

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
          <Badge bg={REQUEST_PRIORITY_MODEL[info.getValue()]?.variant}>
            {REQUEST_PRIORITY_MODEL[info.getValue()]?.label}
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
