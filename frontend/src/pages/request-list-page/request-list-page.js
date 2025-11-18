import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'react-bootstrap';

import RequestFilterBar from '../../components/request-filter-bar/request-filter-bar';
import RequestListTable from '../../components/request-list-table/request-list-table';

function RequestListPage() {
  const navigate = useNavigate();

  const data = useMemo(
    () => [
      {
        id: 'REQ-001',
        title: 'Xin xác nhận giấy tờ tốt nghiệp',
        studentName: 'Nguyễn Văn A',
        studentCode: 'SV001',
        time: '08:30',
        status: 'pending',
      },
      {
        id: 'REQ-002',
        title: 'Xem lại điểm môn MMDS',
        studentName: 'Trần Thị B',
        studentCode: 'SV002',
        time: '09:15',
        status: 'new',
      },
    ],
    []
  );

  const handleRowClick = (row) => {
    navigate(`/requests/${row.original.id}`);
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>Xử lý yêu cầu</Card.Title>
        <RequestFilterBar />
        <RequestListTable data={data} onRowClick={handleRowClick} />
      </Card.Body>
    </Card>
  );
}

export default RequestListPage;
