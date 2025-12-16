import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import Layout from "./pages/layout";
import OverviewPage from "./pages/overview-page/overview-page";
import RequestListPage from "./pages/request-list-page/request-list-page";
import RequestDetailPage from "./pages/request-detail-page/request-detail-page";
import LoginPage from "#pages/auth-pages/login-page";

function App() {
  return (
    <>
      <Outlet />

      <Routes>
        <Route path="/dang-nhap" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/requests/overview" replace />} />
          {/* <Route path="/" element={<div style={{
          height: "200%",
          backgroundColor: "red"
        }}></div>} /> */}
          <Route path="/requests/overview" element={<OverviewPage />} />
          <Route path="/requests/processing" element={<RequestListPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
