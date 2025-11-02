import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { loginUser } from '../services/api';
import '../styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { setIsAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await loginUser(email, password);

      // Save token and a normalized role from response.user.role
      localStorage.setItem('token', response.token);
      const normalizedRole = (response?.user?.role || '').toLowerCase();
      localStorage.setItem('role', normalizedRole);

      setIsAuthenticated(true);
      navigate('/');
    } catch (err) {
      setMessage('Invalid email or password');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="login-container">
      {/* ===== Top Brand Header ===== */}
      <div className="top-bar">
        <div className="brand">Online Orders</div>
        <div className="actions">
          <Link to="/">Home</Link>
          <Link to="/signup">Sign Up</Link>
        </div>
      </div>

      <div className="login-box">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {message && <p className="error-message">{message}</p>}
          <button type="submit">Login</button>
        </form>

        <div className="login-links">
          <Link to="/signup">Create Account</Link>
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
