import React from 'react';
import { Navbar, Container } from 'react-bootstrap';
import { FaBell } from 'react-icons/fa';

import './header-bar.scss';

function HeaderBar() {
  return (
    <Navbar bg="light" expand="lg" className="header-bar">
      <Container fluid>
        <Navbar.Brand className="header-bar__brand">
          Hệ thống yêu cầu sinh viên
        </Navbar.Brand>
        <div className="header-bar__right">
          <FaBell className="header-bar__icon" />
          <span className="header-bar__user">Admin</span>
        </div>
      </Container>
    </Navbar>
  );
}

export default HeaderBar;
