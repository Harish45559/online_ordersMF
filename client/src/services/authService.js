import api from './api';

// Use the shared axios instance so it respects REACT_APP_API_URL

export const signup = (username, email, password) =>
  api.post(`/api/auth/signup`, { username, email, password });

export const login = (email, password) =>
  api.post(`/api/auth/login`, { email, password });

export const forgotPassword = (email) =>
  api.post(`/api/auth/forgot-password`, { email });

// Resend OTP
export const resendOtp = (email) =>
  api.post(`/api/auth/resend-otp`, { email });

// Reset password
export const resetPassword = (token, password) =>
  api.post(`/api/auth/reset-password/${token}`, { password });
