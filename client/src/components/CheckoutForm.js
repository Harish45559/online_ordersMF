import React, { useMemo, useState, useEffect } from "react";
import api from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import "./CheckoutForm.css";

export default function CheckoutForm({
  orderItems: orderItemsProp,
  totalAmount: totalAmountProp,
  token: tokenProp,
  prefill,
  defaultPaymentMethod = "card",
}) {
  const navigate = useNavigate();

  // ---- Form fields ----
  const [name, setName] = useState(prefill?.name || "");
  const [mobile, setMobile] = useState(prefill?.mobile || "");
  const [address, setAddress] = useState(prefill?.address || "");
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod);
  const [orderNotes, setOrderNotes] = useState(localStorage.getItem("orderNotes") || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // keep notes synced
  useEffect(() => {
    localStorage.setItem("orderNotes", orderNotes);
  }, [orderNotes]);

  // ---- Helpers to get/normalize cart from storage ----
  const STORAGE_KEYS = ["cart", "cartItems", "cart_items", "mm_cart"];

  const safeParse = (raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const readFromStorages = () => {
    const stores = [
      { name: "localStorage", get: (k) => localStorage.getItem(k) },
      { name: "sessionStorage", get: (k) => sessionStorage.getItem(k) },
    ];
    for (const s of stores) {
      for (const key of STORAGE_KEYS) {
        const raw = (() => {
          try {
            return s.get(key);
          } catch {
            return null;
          }
        })();
        const parsed = safeParse(raw);
        if (parsed) {
          return { source: `${s.name}:${key}`, value: parsed };
        }
      }
    }
    return { source: null, value: null };
  };

  const normalizePrice = (p) => {
    if (typeof p === "number" && Number.isFinite(p)) return p;
    if (typeof p === "string") {
      const clean = p.replace(/[^0-9.\-]/g, "");
      const num = Number(clean);
      return Number.isFinite(num) ? num : 0;
    }
    return 0;
  };

  const normalizeItem = (it, idx) => {
    if (!it || typeof it !== "object") return null;
    const quantity = Number(it.quantity ?? it.qty ?? 1);
    const price = normalizePrice(it.price ?? it.unitPrice ?? it.amount);
    const id = it.id ?? it._id ?? it.productId ?? `idx_${idx}`;
    const name = it.name ?? it.title ?? it.productName ?? "Item";
    const imageUrl = it.imageUrl ?? it.image ?? it.photo ?? undefined;
    const category = it.category ?? it.type ?? undefined;
    return {
      id,
      name,
      price,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      imageUrl,
      category,
      ...it,
    };
  };

  const pickCartFromValue = (val) => {
    if (Array.isArray(val)) {
      return { items: val, total: null };
    }
    if (val && typeof val === "object") {
      if (Array.isArray(val.items)) return { items: val.items, total: val.total ?? null };
      if (Array.isArray(val.cart)) return { items: val.cart, total: val.total ?? null };
    }
    return { items: [], total: null };
  };

  const { itemsFromStorage, totalFromStorage, storageSource } = useMemo(() => {
    const { source, value } = readFromStorages();
    const picked = pickCartFromValue(value);
    const normalized = (picked.items || []).map(normalizeItem).filter(Boolean);
    const storageTotal = picked.total != null ? normalizePrice(picked.total) : null;
    return {
      itemsFromStorage: normalized,
      totalFromStorage: storageTotal,
      storageSource: source,
    };
  }, []);

  const orderItems = useMemo(() => {
    if (orderItemsProp && Array.isArray(orderItemsProp) && orderItemsProp.length) {
      return orderItemsProp.map(normalizeItem).filter(Boolean);
    }
    return itemsFromStorage;
  }, [orderItemsProp, itemsFromStorage]);

  const computedTotal = useMemo(() => {
    if (typeof totalAmountProp === "number" && Number.isFinite(totalAmountProp)) {
      return totalAmountProp;
    }
    if (typeof totalFromStorage === "number" && totalFromStorage > 0) {
      return totalFromStorage;
    }
    return (orderItems || []).reduce(
      (sum, it) => sum + normalizePrice(it.price) * (it.quantity || 1),
      0
    );
  }, [totalAmountProp, totalFromStorage, orderItems]);

  const token = useMemo(() => {
    if (tokenProp) return tokenProp;
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }, [tokenProp]);

  // ---- Validation ----
  const validate = () => {
    if (!name?.trim()) return "Please enter your name.";
    if (!mobile?.trim()) return "Please enter your mobile number.";
    if (!address?.trim()) return "Please enter your address.";
    if (!orderItems?.length) return "Your cart is empty.";
    if (!Number.isFinite(computedTotal) || computedTotal <= 0) return "Amount must be greater than 0.";
    return "";
  };

  // ---- Submit ----
  const handleCheckout = async (e) => {
    e?.preventDefault?.();
    setErrorMsg("");

    const v = validate();
    if (v) {
      setErrorMsg(v);
      return;
    }

    setSubmitting(true);
    try {
      const createRes = await api.post(
        "/api/orders",
        {
          customerName: name,
          customerMobile: mobile,
          address,
          paymentMethod,
          items: orderItems,
          totalAmount: computedTotal,
          notes: orderNotes, // 👈 NEW
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "Content-Type": "application/json",
          },
        }
      );

      const created = createRes?.data || {};
      const orderId = created?.id || created?.order?.id || created?.data?.id;
      if (!orderId) throw new Error("Order created but no ID returned from /api/orders");

      if (paymentMethod !== "card") {
        navigate(`/success?orderId=${encodeURIComponent(orderId)}&method=cod`);
        return;
      }

      const sessionRes = await api.post(
        "/api/payment/create-checkout-session",
        { orderId, currency: "gbp" },
        { headers: { "Content-Type": "application/json" } }
      );

      const url = sessionRes?.data?.url || sessionRes?.data?.session?.url;
      if (!url) throw new Error("No URL from /create-checkout-session");
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err?.response?.data || err?.message || err);
      const apiErr =
        err?.response?.data?.error ||
        err?.message ||
        "Something went wrong while placing your order.";
      setErrorMsg(apiErr);
    } finally {
      setSubmitting(false);
    }
  };

  const isEmpty = !orderItems?.length || computedTotal <= 0;

  return (
    <form onSubmit={handleCheckout} className="checkout-form">
      <h2>Checkout</h2>

      <div className="field">
        <label>Name</label>
        <input
          type="text"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Mobile</label>
        <input
          type="tel"
          placeholder="07xxxxxxxxx"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Address</label>
        <textarea
          placeholder="Flat, Street, City, Postcode"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
        />
      </div>

      <div className="field">
        <label>Payment Method</label>
        <div className="radio-row">
          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === "card"}
              onChange={() => setPaymentMethod("card")}
            />
            Card (Stripe)
          </label>
          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
            />
            Cash on Delivery
          </label>
        </div>
      </div>

      {/* --- Order Notes --- */}
      <div className="field">
        <label>Notes</label>
        <textarea
          placeholder="Add any special instructions (e.g. No onions, extra spicy...)"
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="summary">
        <h3>Order Summary</h3>
        {!isEmpty ? (
          <>
            {orderItems.map((it, idx) => (
              <div key={`${it.id || it._id || idx}`} className="summary-row">
                <span>{it.name} × {it.quantity}</span>
                <span>£{normalizePrice(it.price).toFixed(2)}</span>
              </div>
            ))}
            <div className="summary-total">
              <strong>Total</strong>
              <strong>£{normalizePrice(computedTotal).toFixed(2)}</strong>
            </div>
            {storageSource && <div className="muted">Cart source: {storageSource}</div>}
          </>
        ) : (
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <Link className="btn" to="/menu">Go to Menu</Link>
          </div>
        )}
      </div>

      {errorMsg && <div className="error" role="alert">{String(errorMsg)}</div>}

      <button type="submit" className="btn btn-primary" disabled={submitting || isEmpty}>
        {submitting ? "Processing..." : paymentMethod === "card" ? "Pay & Place Order" : "Place Order"}
      </button>
    </form>
  );
}
