// src/api.js
import axios from "axios";

/** Resolve base URL:
 * - Prefer REACT_APP_API_URL (Render Static Site env).
 * - In production, do NOT silently fall back to localhost (fail fast).
 * - In local dev, fall back to http://localhost:5000
 */
const envBase = process.env.REACT_APP_API_URL;
const isProd = process.env.NODE_ENV === "production";
const fallbackLocal = "http://localhost:5000";

if (isProd && !envBase) {
  // Help surface misconfiguration early in production builds
  // eslint-disable-next-line no-console
  console.error("REACT_APP_API_URL is not set in production build!");
}

const api = axios.create({
  baseURL: envBase || (!isProd ? fallbackLocal : undefined),
  // Set this to true only if your backend sets cookies (sessions)
  withCredentials: true,
  timeout: 15000, // 15s safety timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
  },
});

// ---- Token helpers (header-based auth) ----
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.Authorization;
  }
};

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Centralized error handler -> always throws a normalized error
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const message =
      data?.message ||
      data?.error ||
      err?.message ||
      "Something went wrong. Please try again.";

    // Optional: auto-logout on 401
    if (status === 401) {
      // setAuthToken(null); // uncomment if you want to auto-clear token
    }

    // Shape a consistent error for UI layers
    return Promise.reject({
      status,
      message,
      data,
    });
  }
);

/* =====================
   AUTHENTICATION
   ===================== */

// NOTE: Most OTP flows only require { email }.
// If your backend requires name/password at this stage, keep them.
// Otherwise, prefer sending only { email } for request-otp.
export const requestOtp = async (email /*, name, password */) => {
  const payload = { email };
  const { data } = await api.post("/api/auth/request-otp", payload);
  return data;
};

export const verifyOtp = async (email, otp) => {
  const { data } = await api.post("/api/auth/verify-otp", { email, otp });
  if (data?.token) setAuthToken(data.token);
  return data;
};

export const loginUser = async (email, password) => {
  const { data } = await api.post("/api/auth/login", { email, password });
  if (data?.token) setAuthToken(data.token);
  return data;
};

// If your backend expects a separate endpoint for final registration,
// change this to '/api/auth/register'. For now, keeping as you had:
export const registerUser = async (userData) => {
  const { data } = await api.post("/api/auth/request-otp", userData);
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
  return data; // expect { items: [...] }
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
