import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Read normalized role; fallback to empty string
  const role = (localStorage.getItem('role') || '').toLowerCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <h2>Mirchi Mafiya</h2>
      <ul>
        <li><Link to="/menu">Menu</Link></li>

        {role === 'admin' && (
          <li><Link to="/master-data">Master Data</Link></li>
        )}
        {role === 'admin' && (
          <li><Link to="/live-orders">Live Orders</Link></li>
        )}

        {/* ✅ Fixed path (no space). Must match App.js route */}
        {role === 'admin' && (
          <li><Link to="/admin/orders">Total Orders</Link></li>
        )}

        <li><Link to="/profile">Profile</Link></li>
        <li><Link to="/orders">Order History</Link></li>
        <li>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
