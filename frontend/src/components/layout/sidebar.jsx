import { useMemo, useState } from "react";
import { Collapse, Offcanvas } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import UserActions from "./user-actions";
import { ACCOUNT_ROLES_ENUM } from "#components/_variables";
import { useSelector } from "react-redux";
import { id } from "zod/v4/locales";

const scrollbarOptions = {
  scrollbars: {
    theme: "os-theme-light",
    autoHide: "leave",
    clickScroll: true,
  },
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Tổng quan", icon: "bi-speedometer", to: "/tong-quan", allowRoles: [ACCOUNT_ROLES_ENUM.ADMIN] },
  // {
  //   id: "layout",
  //   label: "Layout Options",
  //   icon: "bi-clipboard",
  //   badge: "6",
  //   children: [
  //     { id: "default", label: "Default Sidebar", to: "#" },
  //     { id: "fixed-sidebar", label: "Fixed Sidebar", to: "#" },
  //     { id: "fixed-header", label: "Fixed Header", to: "#" },
  //     { id: "fixed-footer", label: "Fixed Footer", to: "#" },
  //     { id: "fixed-complete", label: "Fixed Complete", to: "#" },
  //     { id: "layout-custom", label: "Layout + Custom Area", to: "#" },
  //   ],
  // },
  // { id: "manage-requests", label: "Quản lý yêu cầu", icon: "bi-folder-check", to: "/quan-ly-yeu-cau" },
  // { id: "socket-io-setup", label: "Socket.io Setup", icon: "bi-plug", to: "/socket-io-setup" },
  { id: "staff-requests-process", label: "Xử lý yêu cầu", icon: "bi-people", to: "/xu-ly-yeu-cau", allowRoles: [ACCOUNT_ROLES_ENUM.STAFF] },
  { id: "officer-requests-process", label: "Xử lý yêu cầu", icon: "bi-people", to: "/xu-ly-yeu-cau", allowRoles: [ACCOUNT_ROLES_ENUM.OFFICER] },
  { id: "manage-accounts", label: "Quản lý tài khoản", icon: "bi-person-lines-fill", to: "/quan-ly-tai-khoan", allowRoles: [ACCOUNT_ROLES_ENUM.ADMIN] },
  { id: "manage-departments", label: "Quản lý phòng ban", icon: "bi-building", to: "/quan-ly-phong-ban", allowRoles: [ACCOUNT_ROLES_ENUM.ADMIN] },
  // { id: "test-page", label: "Test Page", icon: "bi-file-earmark-code", to: "/test-page" },
];

const SidebarNav = ({ expanded, onToggle, collapsed }) => {
  const navItems = useMemo(() => NAV_ITEMS, []);
  const accountRole = useSelector((state) => state.auth?.role);
  return (
    <div className="admin-sidebar__inner">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__brand-logo">A</div>
        <div className="admin-sidebar__brand-text">
          <span className="admin-sidebar__brand-title">Admin Panel</span>
        </div>
      </div>

      <OverlayScrollbarsComponent
        className="admin-sidebar__scroll"
        options={scrollbarOptions}
        defer
      >
        <nav className="admin-sidebar__nav">
          {navItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const isOpen = expanded[item.id];
            if (item.allowRoles && !item.allowRoles.includes(accountRole)) return null;
            if (!hasChildren) {
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={({ isActive }) =>
                    `admin-sidebar__link ${collapsed ? "is-collapsed" : ""} ${isActive ? "is-active" : ""}`
                  }
                >
                  <span className={`admin-sidebar__icon bi ${item.icon}`} aria-hidden="true" />
                  <span className="admin-sidebar__label">{item.label}</span>
                  {/* {item.badge && !collapsed && <span className="admin-sidebar__badge">{item.badge}</span>} */}
                </NavLink>
              );
            }

            return (
              <div key={item.id} className={`admin-sidebar__group ${isOpen ? "is-open" : ""}`}>
                <button
                  type="button"
                  className={`admin-sidebar__link ${collapsed ? "is-collapsed" : ""}`}
                  onClick={() => onToggle(item.id)}
                >
                  <span className={`admin-sidebar__icon bi ${item.icon}`} aria-hidden="true" />
                  <span className="admin-sidebar__label">{item.label}</span>
                  {/* {item.badge && <span className="admin-sidebar__badge">{item.badge}</span>} */}
                  <span className={`admin-sidebar__chevron bi bi-chevron-right`} aria-hidden="true" />
                </button>

                <Collapse in={isOpen}>
                  <div className="admin-sidebar__children">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.to}
                        end={child.to === "/admin" || child.to === "/admin/dashboard"}
                        className={({ isActive }) =>
                          `admin-sidebar__child ${isActive ? "is-active" : ""}`
                        }
                      >
                        <span className="admin-sidebar__bullet bi bi-dot" aria-hidden="true" />
                        <span className="admin-sidebar__label">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </Collapse>
              </div>
            );
          })}
        </nav>
      </OverlayScrollbarsComponent>
      <hr className="mt-auto" />
      <UserActions />
    </div>
  );
};

const Sidebar = ({ isMobile, show = false, onHide, collapsed }) => {
  const [expandedSections, setExpandedSections] = useState(() =>
    NAV_ITEMS.reduce((acc, item) => {
      if (item.children?.length) {
        acc[item.id] = false;
      }
      return acc;
    }, {})
  );

  const handleToggleSection = (sectionId) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const content = (
    <SidebarNav
      expanded={expandedSections}
      onToggle={handleToggleSection}
      collapsed={collapsed}
    />
  );

  if (isMobile) {
    return (
      <Offcanvas
        show={show || collapsed}
        onHide={onHide}
        placement="start"
        className="admin-sidebar__offcanvas"
        scroll={false}
        backdrop
      >
        <Offcanvas.Body className="p-0">{content}</Offcanvas.Body>
      </Offcanvas>
    );
  }

  return (
    <aside className={`admin-sidebar ${collapsed ? "is-collapsed" : ""}`} data-bs-theme="dark">
      {content}
    </aside>
  );
};

export default Sidebar;
