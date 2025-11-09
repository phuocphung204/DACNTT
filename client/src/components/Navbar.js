import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h2>🎓 University Email System</h2>
        </div>
        <div className="navbar-menu">
          <span className="user-info">
            {user?.fullName} ({user?.role === 'admin' ? 'Quản trị viên' : 'Sinh viên'})
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
