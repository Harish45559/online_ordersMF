import React, { useState } from 'react';
import api from '../services/api';
import '../styles/VerifyOtp.css';
import { useNavigate } from 'react-router-dom';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const email = localStorage.getItem('signupEmail');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    try {
      const res = await api.post('/api/auth/verify-otp', { email, otp });
      setMessage('Account verified successfully');
      setVerified(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/api/auth/resend-otp', { email });
      setMessage('OTP resent to your email');
    } catch (err) {
      setMessage('Error resending OTP');
    }
  };

  return (
    <div className="verify-container">
      <h2>Verify OTP</h2>
      <input type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
      <button onClick={handleVerify}>Verify</button>
      <button onClick={handleResend} className="resend-btn">Resend OTP</button>
      {verified && (
        <button className="continue-btn" onClick={() => navigate('/login')}>Continue to Login</button>
      )}
      {message && <p>{message}</p>}
    </div>
  );
};

export default VerifyOtp;
