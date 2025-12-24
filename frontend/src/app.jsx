import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { enableMapSet } from "immer";

import Layout from "./pages/layout";
import OverviewPage from "./pages/overview-page/overview-page";
import RequestListPage from "./pages/request-list-page/request-list-page";
import RequestDetailsPage from "./pages/request-details/request-details-page";
import LoginPage from "#pages/auth/login-page";
import ManageRequestPage from "#pages/manage-requests/manage-request-page";
import ResetPasswordPage from "#pages/auth/reset-password-page";
import OfficerManageRequestsPage from "#pages/officer-manage-requests/officer-manage-requests-page";
import SocketIoSetupPage from "#pages/socket-io-setup/socket-io-setup-page";
import StaffRequestsPage from "#pages/staff-requests/staff-requests-page";
import ManageAccountsPage from "#pages/manage-accounts/manage-accounts-page";
import TestPage from "#pages/test-page/test-page";

enableMapSet();

function App() {
  return (
    <>
      <Outlet />

      <Routes>
        <Route path="dang-nhap" element={<LoginPage />} />
        <Route path="quen-mat-khau" element={<ResetPasswordPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/requests/overview" replace />} />
          {/* <Route path="/" element={<div style={{
          height: "200%",
          backgroundColor: "red"
        }}></div>} /> */}
          <Route path="/requests/overview" element={<OverviewPage />} />
          <Route path="/requests/processing" element={<RequestListPage />} />
          <Route path="/yeu-cau/:id" element={<RequestDetailsPage />} />
          <Route path="/quan-ly-yeu-cau" element={<ManageRequestPage />} />
          <Route path="/yeu-cau" element={<OfficerManageRequestsPage />} />
          <Route path="/xu-ly-yeu-cau" element={<StaffRequestsPage />} />
          <Route path="/quan-ly-tai-khoan" element={<ManageAccountsPage />} />
          <Route path="socket-io-setup" element={<SocketIoSetupPage />} />
          <Route path="test-page" element={<TestPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
