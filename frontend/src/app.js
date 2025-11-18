import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AdminLayout from './layouts/admin-layout/admin-layout';
import OverviewPage from './pages/overview-page/overview-page';
import RequestListPage from './pages/request-list-page/request-list-page';
import RequestDetailPage from './pages/request-detail-page/request-detail-page';

function App() {
  return (

    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Navigate to="/requests/overview" replace />} />
        <Route path="/requests/overview" element={<OverviewPage />} />
        <Route path="/requests/processing" element={<RequestListPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
      </Route>
    </Routes>
  );
}

export default App;
