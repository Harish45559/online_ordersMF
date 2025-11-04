// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000", // fallback for local dev
  withCredentials: true, // only relevant if you use cookies/sessions
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* =====================
   AUTHENTICATION
   ===================== */
export const loginUser = async (email, password) => {
  const { data } = await api.post("/api/auth/login", { email, password });
  if (data?.token) localStorage.setItem("token", data.token);
  return data;
};

// Keep signature used by your Signup page
export const requestOtp = async (name, email, password) => {
  const { data } = await api.post("/api/auth/request-otp", { name, email, password });
  return data;
};

// Accept an object so we can include name/password for first-time users
export const verifyOtp = async (payload /* { email, otp, name?, password? } */) => {
  const { data } = await api.post("/api/auth/verify-otp", payload);
  if (data?.token) localStorage.setItem("token", data.token);
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await api.post("/api/auth/forgot-password", { email });
  return data;
};

/* =====================
   MENU & CATEGORIES
   ===================== */
export const fetchMenuItems = async (categoryId = "all", q = "") => {
  const params = new URLSearchParams();
  if (categoryId && categoryId !== "all") params.set("categoryId", String(categoryId));
  if (q && q.trim()) params.set("q", q.trim());
  const qs = params.toString() ? `?${params.toString()}` : "";
  const { data } = await api.get(`/api/menu${qs}`);
  return data;
};

export const addMenuItem = async (item) => {
  if (!item?.categoryId || isNaN(Number(item.categoryId))) {
    throw new Error("Please select a category");
  }
  const { data } = await api.post("/api/menu/add", item);
  return data;
};

export const fetchCategories = async () => {
  const { data } = await api.get("/api/category");
  return data;
};

export const addCategory = async (name) => {
  const { data } = await api.post("/api/category/add", { name });
  return data;
};

/* =====================
   CART
   ===================== */
export const addToCart = async (item) => {
  const { data } = await api.post("/api/cart/add", item);
  return data;
};

export const getCartItems = async () => {
  const { data } = await api.get("/api/cart");
  return data;
};

export const clearCart = async () => {
  const { data } = await api.delete("/api/cart/clear");
  return data;
};

/* =====================
   ORDERS
   ===================== */
export const createOrder = async (orderData) => {
  const { data } = await api.post("/api/orders", orderData);
  return data;
};
export const placeOrder = createOrder;

export const getOrderStatus = async (orderId) => {
  const { data } = await api.get(`/api/orders/${orderId}`);
  return data;
};

export const getLiveOrders = async () => {
  const { data } = await api.get("/api/orders/live");
  return data;
};

/* =====================
   STRIPE CHECKOUT
   ===================== */
export const createCheckoutSession = async (orderId, currency = "gbp") => {
  const { data } = await api.post("/api/payment/create-checkout-session", { orderId, currency });
  return data; // { url }
};

export const confirmCheckoutSession = async (session_id) => {
  const { data } = await api.post("/api/payment/confirm", { session_id });
  return data;
};

export const confirmByOrderId = async (orderId) => {
  const { data } = await api.post("/api/payment/confirm-by-order", { orderId });
  return data;
};

export const reconcilePending = async () => {
  const { data } = await api.post("/api/payment/reconcile-pending", {});
  return data;
};

export default api;
