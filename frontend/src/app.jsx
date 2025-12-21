import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { enableMapSet } from "immer";

import Layout from "./pages/layout";
import OverviewPage from "./pages/overview-page/overview-page";
import RequestListPage from "./pages/request-list-page/request-list-page";
import RequestDetailsPage from "./pages/request-details/request-details-page";
import LoginPage from "#pages/auth/login-page";
import ManageRequestPage from "#pages/manage-requests/manage-request-page";
import ResetPasswordPage from "#pages/auth/reset-password-page";
import OfficerRequestsPage from "#pages/officer-requests/officer-requests-page";
import SocketIoSetupPage from "#pages/socket-io-setup/socket-io-setup-page";

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
          <Route path="/yeu-cau" element={<OfficerRequestsPage />} />
          <Route path="socket-io-setup" element={<SocketIoSetupPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
