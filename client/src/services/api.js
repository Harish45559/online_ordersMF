// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000", // fallback for local dev only
  withCredentials: true, // if you use cookies/sessions
});




// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // ensure you set this on login
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* =====================
   AUTHENTICATION
   ===================== */
export const loginUser = async (email, password) => {
  const { data } = await api.post('/api/auth/login', { email, password });
  // Optional convenience: store token right here if your backend returns it
  if (data?.token) localStorage.setItem('token', data.token);
  return data;
};

export const requestOtp = async (name, email, password) => {
  const { data } = await api.post('/api/auth/request-otp', { name, email, password });
  return data;
};

export const verifyOtp = async (email, otp) => {
  const { data } = await api.post('/api/auth/verify-otp', { email, otp });
  // Optional: if verify returns token, store it
  if (data?.token) localStorage.setItem('token', data.token);
  return data;
};

export const registerUser = async (userData) => {
  const { data } = await api.post('/api/auth/request-otp', userData);
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await api.post('/api/auth/forgot-password', { email });
  return data;
};

/* =====================
   MENU & CATEGORIES
   (keep these paths if your server exposes them this way)
   ===================== */
export const fetchMenuItems = async (categoryId = 'all', q = '') => {
  const params = new URLSearchParams();
  if (categoryId && categoryId !== 'all') params.set('categoryId', String(categoryId));
  if (q && q.trim()) params.set('q', q.trim());
  const qs = params.toString() ? `?${params.toString()}` : '';
  const { data } = await api.get(`/api/menu${qs}`);
  return data; // expect { items: [...] }
};

export const addMenuItem = async (item) => {
  if (!item?.categoryId || isNaN(Number(item.categoryId))) {
    throw new Error('Please select a category');
  }
  const { data } = await api.post('/api/menu/add', item);
  return data;
};

export const fetchCategories = async () => {
  const { data } = await api.get('/api/category');
  return data;
};

export const addCategory = async (name) => {
  const { data } = await api.post('/api/category/add', { name });
  return data;
};

/* =====================
   CART (if you’re using server cart APIs)
   ===================== */
export const addToCart = async (item) => {
  const { data } = await api.post('/api/cart/add', item);
  return data;
};

export const getCartItems = async () => {
  const { data } = await api.get('/api/cart');
  return data;
};

export const clearCart = async () => {
  const { data } = await api.delete('/api/cart/clear');
  return data;
};

/* =====================
   ORDERS (token protected)
   ===================== */

// Create order → returns the created order (with its id)
export const createOrder = async (orderData) => {
  // NOTE: backend route is plural: /api/orders
  const { data } = await api.post('/api/orders', orderData);
  return data; // full order including id
};

// (If you still call placeOrder elsewhere, keep an alias)
export const placeOrder = createOrder;

// Get current user’s order status/history/etc. (adjust path if needed)
export const getOrderStatus = async (orderId) => {
  const { data } = await api.get(`/api/orders/${orderId}`);
  return data;
};

// Live Orders (admin/staff screen) — token required
export const getLiveOrders = async () => {
  const { data } = await api.get('/api/orders/live');
  return data; // expect an array
};

/* =====================
   STRIPE CHECKOUT
   ===================== */

// 1) Create Checkout Session — must send orderId (NOT cartItems)
export const createCheckoutSession = async (orderId, currency = 'gbp') => {
  const { data } = await api.post('/api/payment/create-checkout-session', { orderId, currency });
  return data; // { url }
};

// 2) Confirm on success page
export const confirmCheckoutSession = async (session_id) => {
  const { data } = await api.post('/api/payment/confirm', { session_id });
  return data; // { ok, paid, ... }
};

// (optional) Admin rescue: confirm one stuck order by id
export const confirmByOrderId = async (orderId) => {
  const { data } = await api.post('/api/payment/confirm-by-order', { orderId });
  return data; // { ok, paid, orderId, ... }
};

// (optional) Admin rescue: sweep all pending_payment
export const reconcilePending = async () => {
  const { data } = await api.post('/api/payment/reconcile-pending', {});
  return data; // { ok, results: [...] }
};

export default api;
