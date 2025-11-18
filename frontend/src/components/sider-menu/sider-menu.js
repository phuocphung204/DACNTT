import React from 'react';
import { NavLink } from 'react-router-dom';
import { Nav } from 'react-bootstrap';
import { FaInbox, FaChartPie, FaCheckCircle, FaHourglassHalf } from 'react-icons/fa';

import './sider-menu.scss';

function SiderMenu() {
  return (
    <div className="sider-menu">
      <Nav className="flex-column">
        <div className="sider-menu__group-title">Yêu cầu sinh viên</div>

        <NavLink
          to="/requests/overview"
          className={({ isActive }) =>
            'sider-menu__item' + (isActive ? ' sider-menu__item--active' : '')
          }
        >
          <FaChartPie className="sider-menu__icon" />
          <span>Tổng quan</span>
        </NavLink>

        <NavLink
          to="/requests/processing"
          className={({ isActive }) =>
            'sider-menu__item' + (isActive ? ' sider-menu__item--active' : '')
          }
        >
          <FaInbox className="sider-menu__icon" />
          <span>Xử lý yêu cầu</span>
        </NavLink>

        <NavLink
          to="/requests/status/pending"
          className={({ isActive }) =>
            'sider-menu__item' + (isActive ? ' sider-menu__item--active' : '')
          }
        >
          <FaHourglassHalf className="sider-menu__icon" />
          <span>Chờ xử lý</span>
        </NavLink>

        <NavLink
          to="/requests/status/done"
          className={({ isActive }) =>
            'sider-menu__item' + (isActive ? ' sider-menu__item--active' : '')
          }
        >
          <FaCheckCircle className="sider-menu__icon" />
          <span>Đã xử lý</span>
        </NavLink>
      </Nav>
    </div>
  );
}

export default SiderMenu;
