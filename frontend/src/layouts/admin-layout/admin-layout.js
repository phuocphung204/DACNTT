import { Container, Row, Col } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';

import SiderMenu from '../../components/sider-menu/sider-menu';
import HeaderBar from '../../components/header-bar/header-bar';

import './admin-layout.scss';

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <HeaderBar />
      <Container fluid>
        <Row>
          <Col xs={12} md={3} lg={2} className="admin-layout__sider">
            <SiderMenu />
          </Col>
          <Col xs={12} md={9} lg={10} className="admin-layout__content">
            <Outlet />
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default AdminLayout;
