import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';

import './request-filter-bar.scss';

function RequestFilterBar() {
  return (
    <div className="request-filter-bar mb-3">
      <Row className="g-2">
        <Col xs={12} md={4}>
          <Form.Control placeholder="Tìm theo tiêu đề, mã SV..." size="sm" />
        </Col>
        <Col xs={6} md={3}>
          <Form.Select size="sm">
            <option>Trạng thái</option>
            <option value="new">Chưa xử lý</option>
            <option value="pending">Chờ xử lý</option>
            <option value="done">Đã xử lý</option>
          </Form.Select>
        </Col>
        <Col xs={6} md={3}>
          <Form.Select size="sm">
            <option>Sort</option>
            <option value="time-desc">Mới nhất</option>
            <option value="time-asc">Cũ nhất</option>
          </Form.Select>
        </Col>
      </Row>
    </div>
  );
}

export default RequestFilterBar;
