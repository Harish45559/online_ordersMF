import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/Dashboard.css";


const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px' }}>
      <h2>Welcome to the Dashboard</h2>
     
    </div>
  );
};

export default Dashboard;
