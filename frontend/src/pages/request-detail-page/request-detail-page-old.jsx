import React from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Card, Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';

import StaffSuggestionSidebar from '../../components/staff-suggestion-sidebar/staff-suggestion-sidebar';

function RequestDetailPage() {
  const { id } = useParams();

  const handleAssign = () => {
    toast.success(`Đã giao yêu cầu ${id} cho nhân viên được chọn`);
  };

  return (
    <Row>
      <Col lg={8}>
        <Card>
          <Card.Body>
            <div className="mb-3 d-flex align-items-center gap-2">
              <Form.Select style={{ maxWidth: 280 }} size="sm">
                <option>Chọn loại yêu cầu</option>
                <option value="hoc-vu">Học vụ</option>
                <option value="diem-so">Điểm số</option>
                <option value="giay-to">Giấy tờ</option>
                <option value="hoc-phi">Học phí</option>
              </Form.Select>
              <Button variant="primary" size="sm">
                Lưu phân nhãn
              </Button>
            </div>

            <h5>[{id}] Xin xác nhận giấy tờ tốt nghiệp</h5>
            <div className="text-muted mb-2">
              Nguyễn Văn A - SV001 • Lớp K18 • email@sv.hcmute.edu.vn
            </div>
            <hr />
            <p>
              Nội dung yêu cầu giống email: sinh viên xin xác nhận các giấy tờ
              liên quan đến tốt nghiệp, thời gian học, v.v...
            </p>
          </Card.Body>
        </Card>
      </Col>
      <Col lg={4}>
        <StaffSuggestionSidebar onAssign={handleAssign} />
      </Col>
    </Row>
  );
}

export default RequestDetailPage;
