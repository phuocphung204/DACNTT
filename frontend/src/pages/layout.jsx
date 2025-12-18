import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";

import Sidebar from "#components/layout/sidebar";
import Header from "#components/layout/header";

import "./layout.scss";
import "overlayscrollbars/overlayscrollbars.css";
import { createPortal } from "react-dom";
import { Flip, ToastContainer } from "react-toastify";
import ModalDialog from "#components/common/modal-dialog";

const Layout = () => {
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileSidebar, setIsMobileSidebar] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 990 : false
  );

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 990;
      setIsMobileSidebar(isMobile);
      if (!isMobile) {
        setShowOffcanvas(false);
        setIsCollapsed(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggleSidebar = () => {
    if (isMobileSidebar) {
      setShowOffcanvas((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <>
      <div className={`admin-wrapper ${isCollapsed && !isMobileSidebar ? "sidebar-collapsed" : ""}`}>
        <Sidebar
          isMobile={isMobileSidebar}
          show={isMobileSidebar ? showOffcanvas : true}
          onHide={() => {
            if (isMobileSidebar) {
              setShowOffcanvas(false);
            } else {
              setIsCollapsed(true);
            }
          }}
          collapsed={!isMobileSidebar && isCollapsed}
        />
        <Header handleToggleSidebar={handleToggleSidebar} />

        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      {/* Toast container cho thông báo */}
      {createPortal(<ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light" á
        transition={Flip}
      />, document.body)}

      {/* Modal Dialog */}
      <ModalDialog />
    </>
  );
}

export default Layout;
