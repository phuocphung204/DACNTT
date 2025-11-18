import React, { useMemo } from 'react';
import { Table } from 'react-bootstrap';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';

function RequestListTable({ data, onRowClick }) {
  const columns = useMemo(
    () => [
      {
        header: 'Tiêu đề',
        accessorKey: 'title',
      },
      {
        header: 'Sinh viên',
        accessorKey: 'studentName',
      },
      {
        header: 'Mã SV',
        accessorKey: 'studentCode',
      },
      {
        header: 'Thời gian',
        accessorKey: 'time',
      },
      {
        header: 'Trạng thái',
        accessorKey: 'status',
        cell: (info) => {
          const value = info.getValue();
          return value === 'new'
            ? 'Chưa xử lý'
            : value === 'pending'
            ? 'Chờ xử lý'
            : 'Đã xử lý';
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table hover size="sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onRowClick && onRowClick(row)}
            style={{ cursor: 'pointer' }}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default RequestListTable;
