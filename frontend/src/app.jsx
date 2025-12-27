import { Routes, Route } from "react-router-dom";
import { useSelector } from "react-redux";

import RequireAuth from "./components/common/require-auth";

import Layout from "./pages/layout";
import RequestDetailsPage from "./pages/request-details/request-details-page";
import LoginPage from "#pages/auth/login-page";
import StaffRequestsProcessPage from "#pages/staff-requests-process/staff-requests-process-page";
import ResetPasswordPage from "#pages/auth/reset-password-page";
import OfficerManageRequestsPage from "#pages/officer-manage-requests/officer-manage-requests-page";
import SocketIoSetupPage from "#pages/socket-io-setup/socket-io-setup-page";
import ManageAccountsPage from "#pages/manage-accounts/manage-accounts-page";
import TestPage from "#pages/test-page/test-page";
import OfficerRequestsProcessPage from "#pages/officer-requests-process/officer-requests-process-page";
import { ACCOUNT_ROLES_ENUM } from "#components/_variables";

function App() {
  const accountRole = useSelector((state) => state.auth?.role);

  return (
    <Routes>
      <Route path="dang-nhap" element={<LoginPage />} />
      <Route path="quen-mat-khau" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<div>Trang chủ</div>} />
        <Route path="yeu-cau/:id" element={<RequestDetailsPage />} />
        <Route path="yeu-cau" element={<OfficerManageRequestsPage />} />
        <Route
          path="xu-ly-yeu-cau"
          element={
            (() => {
              if (accountRole === ACCOUNT_ROLES_ENUM.STAFF) {
                return <StaffRequestsProcessPage />;
              } else if (accountRole === ACCOUNT_ROLES_ENUM.OFFICER) {
                return <OfficerRequestsProcessPage />;
              }
              return <div>Vai trò không hợp lệ</div>;
            })()}
        />
        <Route path="quan-ly-tai-khoan" element={<ManageAccountsPage />} />
        <Route path="socket-io-setup" element={<SocketIoSetupPage />} />
        <Route path="test-page" element={<TestPage />} />
      </Route>
    </Routes>
  );
}

export default App;