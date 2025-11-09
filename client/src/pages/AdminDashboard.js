import React, { useState, useEffect } from 'react';
import { requestService } from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const [requestsRes, statsRes] = await Promise.all([
        requestService.getAllRequests(filter),
        requestService.getStatistics()
      ]);
      setRequests(requestsRes.data.requests);
      setStatistics(statsRes.data.statistics);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      await requestService.updateRequestStatus(requestId, {
        status,
        responseMessage
      });
      setResponseMessage('');
      setSelectedRequest(null);
      fetchData();
      alert('Cập nhật trạng thái thành công!');
    } catch (error) {
      alert('Có lỗi xảy ra khi cập nhật');
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { text: 'Chờ xử lý', class: 'badge-warning' },
      'in-progress': { text: 'Đang xử lý', class: 'badge-info' },
      'resolved': { text: 'Đã giải quyết', class: 'badge-success' },
      'rejected': { text: 'Từ chối', class: 'badge-danger' }
    };
    const statusInfo = statusMap[status] || { text: status, class: 'badge-default' };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const getCategoryName = (category) => {
    const categoryMap = {
      'academic': 'Học vụ',
      'administrative': 'Hành chính',
      'scholarship': 'Học bổng',
      'accommodation': 'Ký túc xá',
      'transcript': 'Bảng điểm',
      'certificate': 'Giấy chứng nhận',
      'other': 'Khác'
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="admin-container">
      <h1>Quản lý yêu cầu</h1>

      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{statistics.total}</h3>
            <p>Tổng yêu cầu</p>
          </div>
          <div className="stat-card pending">
            <h3>{statistics.byStatus.pending}</h3>
            <p>Chờ xử lý</p>
          </div>
          <div className="stat-card progress">
            <h3>{statistics.byStatus.inProgress}</h3>
            <p>Đang xử lý</p>
          </div>
          <div className="stat-card resolved">
            <h3>{statistics.byStatus.resolved}</h3>
            <p>Đã giải quyết</p>
          </div>
        </div>
      )}

      <div className="filters">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ xử lý</option>
          <option value="in-progress">Đang xử lý</option>
          <option value="resolved">Đã giải quyết</option>
          <option value="rejected">Từ chối</option>
        </select>

        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
        >
          <option value="">Tất cả danh mục</option>
          <option value="academic">Học vụ</option>
          <option value="administrative">Hành chính</option>
          <option value="scholarship">Học bổng</option>
          <option value="accommodation">Ký túc xá</option>
          <option value="transcript">Bảng điểm</option>
          <option value="certificate">Giấy chứng nhận</option>
          <option value="other">Khác</option>
        </select>
      </div>

      <div className="requests-table">
        {loading ? (
          <p>Đang tải...</p>
        ) : requests.length === 0 ? (
          <p className="no-data">Không có yêu cầu nào</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Sinh viên</th>
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Mức độ</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <React.Fragment key={request._id}>
                  <tr>
                    <td>
                      <strong>{request.userId.fullName}</strong><br />
                      <small>{request.userId.email}</small><br />
                      <small>MSSV: {request.userId.studentId}</small>
                    </td>
                    <td>{request.subject}</td>
                    <td>{getCategoryName(request.category)}</td>
                    <td>
                      <span className={`priority priority-${request.priority}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>{new Date(request.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <button
                        className="btn-small"
                        onClick={() => setSelectedRequest(
                          selectedRequest === request._id ? null : request._id
                        )}
                      >
                        {selectedRequest === request._id ? 'Đóng' : 'Chi tiết'}
                      </button>
                    </td>
                  </tr>
                  {selectedRequest === request._id && (
                    <tr className="detail-row">
                      <td colSpan="7">
                        <div className="request-detail">
                          <h4>Chi tiết yêu cầu</h4>
                          <p><strong>Mô tả:</strong> {request.description}</p>
                          
                          {request.response?.message && (
                            <div className="response-section">
                              <strong>Phản hồi trước:</strong>
                              <p>{request.response.message}</p>
                            </div>
                          )}

                          <div className="action-section">
                            <h5>Cập nhật trạng thái</h5>
                            <textarea
                              placeholder="Nhập phản hồi..."
                              value={responseMessage}
                              onChange={(e) => setResponseMessage(e.target.value)}
                              rows="3"
                            />
                            <div className="action-buttons">
                              <button
                                className="btn-success"
                                onClick={() => handleStatusUpdate(request._id, 'resolved')}
                              >
                                Đã giải quyết
                              </button>
                              <button
                                className="btn-info"
                                onClick={() => handleStatusUpdate(request._id, 'in-progress')}
                              >
                                Đang xử lý
                              </button>
                              <button
                                className="btn-danger"
                                onClick={() => handleStatusUpdate(request._id, 'rejected')}
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
