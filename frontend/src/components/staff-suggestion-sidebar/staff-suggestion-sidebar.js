import React, { useState } from 'react';
import { Card, ListGroup, Button } from 'react-bootstrap';

function StaffSuggestionSidebar({ onAssign }) {
  const [selectedStaff, setSelectedStaff] = useState(null);

  const staffList = [
    { id: 1, name: 'Thầy A', department: 'Phòng Đào tạo' },
    { id: 2, name: 'Cô B', department: 'Phòng Công tác sinh viên' },
  ];

  const handleSelect = (staff) => {
    setSelectedStaff(staff.id);
  };

  const handleAssignClick = () => {
    if (onAssign) {
      onAssign(selectedStaff);
    }
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>Đề xuất người xử lý</Card.Title>
        <ListGroup className="mb-3">
          {staffList.map((staff) => (
            <ListGroup.Item
              key={staff.id}
              action
              active={selectedStaff === staff.id}
              onClick={() => handleSelect(staff)}
            >
              <div className="fw-semibold">{staff.name}</div>
              <div className="text-muted" style={{ fontSize: 13 }}>
                {staff.department}
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
        <Button
          variant="primary"
          size="sm"
          disabled={!selectedStaff}
          onClick={handleAssignClick}
        >
          Gửi yêu cầu xử lý
        </Button>
      </Card.Body>
    </Card>
  );
}

export default StaffSuggestionSidebar;
