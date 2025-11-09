import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestService } from '../services/api';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'academic',
    description: '',
    priority: 'medium'
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await requestService.getMyRequests();
      setRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestService.createRequest(formData);
      setFormData({
        subject: '',
        category: 'academic',
        description: '',
        priority: 'medium'
      });
      setShowForm(false);
      fetchRequests();
      alert('Yêu cầu đã được gửi thành công!');
    } catch (error) {
      alert('Có lỗi xảy ra khi gửi yêu cầu');
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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Xin chào, {user?.fullName}</h1>
          <p>{user?.email} | {user?.studentId}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Đóng' : '+ Tạo yêu cầu mới'}
        </button>
      </div>

      {showForm && (
        <div className="request-form">
          <h3>Tạo yêu cầu mới</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tiêu đề</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder="Nhập tiêu đề yêu cầu"
              />
            </div>

            <div className="form-group">
              <label>Danh mục</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="academic">Học vụ</option>
                <option value="administrative">Hành chính</option>
                <option value="scholarship">Học bổng</option>
                <option value="accommodation">Ký túc xá</option>
                <option value="transcript">Bảng điểm</option>
                <option value="certificate">Giấy chứng nhận</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="form-group">
              <label>Mức độ ưu tiên</label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>

            <div className="form-group">
              <label>Mô tả chi tiết</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="5"
                placeholder="Mô tả chi tiết yêu cầu của bạn..."
              />
            </div>

            <button type="submit" className="btn-primary">Gửi yêu cầu</button>
          </form>
        </div>
      )}

      <div className="requests-list">
        <h3>Yêu cầu của tôi ({requests.length})</h3>
        {loading ? (
          <p>Đang tải...</p>
        ) : requests.length === 0 ? (
          <p className="no-requests">Bạn chưa có yêu cầu nào</p>
        ) : (
          <div className="requests-grid">
            {requests.map((request) => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <h4>{request.subject}</h4>
                  {getStatusBadge(request.status)}
                </div>
                <p className="request-category">{getCategoryName(request.category)}</p>
                <p className="request-description">{request.description}</p>
                <div className="request-footer">
                  <span className="request-date">
                    {new Date(request.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className={`priority priority-${request.priority}`}>
                    {request.priority}
                  </span>
                </div>
                {request.response?.message && (
                  <div className="response-box">
                    <strong>Phản hồi:</strong>
                    <p>{request.response.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
