import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import "../styles/LiveOrders.css";
import { startOrderAlert, stopOrderAlert } from "../utils/orderAlert";

function formatOrderCode(id) {
  if (typeof id === "string") return id.slice(-6).toUpperCase();
  const n = Number(id);
  return Number.isFinite(n) ? String(n).padStart(6, "0") : String(id || "");
}
function fmtGBP(v) {
  const n = Number(v || 0);
  return `£${n.toFixed(2)}`;
}
function countItems(items) {
  return (items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
}

const ACTIVE = new Set(["paid", "preparing", "ready"]);
const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

export default function LiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState({});
  const prevCountRef = useRef(0);
  const dayKeyRef = useRef(new Date().toDateString());

  const fetchToday = async () => {
    try {
      const { data } = await api.get("/api/orders/today");
      setOrders(Array.isArray(data) ? data : []);
      // 🟢 play alert when new orders appear
      if (data.length > prevCountRef.current) {
        startOrderAlert();
      }
      prevCountRef.current = data.length;
    } catch (e) {
      console.error("today orders error:", e?.response?.data || e);
      if (e?.response?.status === 401) window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
    const poll = setInterval(() => {
      const nowKey = new Date().toDateString();
      if (nowKey !== dayKeyRef.current) {
        dayKeyRef.current = nowKey;
        setLoading(true);
      }
      fetchToday();
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  const derived = useMemo(() => {
    
    const RANK = { paid: 1, preparing: 2, ready: 3, completed: 4, cancelled: 5, pending_payment: 6 };
    const list = [...orders].sort((a, b) => {
      const ra = RANK[a?.status] ?? 99;
      const rb = RANK[b?.status] ?? 99;
      if (ra !== rb) return ra - rb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const counts = { active: 0, completed: 0, all: list.length };
    list.forEach((o) => {
      if (ACTIVE.has(o.status)) counts.active++;
      if (o.status === "completed") counts.completed++;
    });

    const filtered = list.filter((o) => {
      const byTab =
        tab === "all"
          ? true
          : tab === "active"
          ? ACTIVE.has(o.status)
          : o.status === "completed";
      const text = `${o?.customerName ?? ""} ${o?.customerMobile ?? ""} ${o?.address ?? ""} ${formatOrderCode(o?.id)}`.toLowerCase();
      const bySearch = !search || text.includes(search.toLowerCase().trim());
      return byTab && bySearch;
    });

    return { filtered, counts };
  }, [orders, tab, search]);

  // ---- actions ----
  const setStatusOptimistic = (id, nextStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: nextStatus } : o)));
  };

  const updateStatus = async (order, status) => {
    if (!order?.id) return;
    if (!["paid", "preparing", "ready", "completed", "cancelled"].includes(status)) {
      alert("Invalid status");
      return;
    }
    const prev = order.status;
    setBusy((b) => ({ ...b, [order.id]: true }));
    setStatusOptimistic(order.id, status);
    try {
      await api.patch(`/api/orders/${order.id}/status`, { status });
      if (status === "preparing" || status === "cancelled") stopOrderAlert(); // 🟢 stop tone when accepted/rejected
    } catch (e) {
      setStatusOptimistic(order.id, prev);
      console.error("updateStatus error:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Failed to update status");
    } finally {
      setBusy((b) => {
        const c = { ...b };
        delete c[order.id];
        return c;
      });
    }
  };

  const renderActions = (o) => {
    const isBusy = !!busy[o.id];
    const s = o?.status;
    if (s === "completed" || s === "cancelled") return null;

    return (
      <div className="lo-actions">
        {s === "paid" && (
          <>
            <button
              className="lo-btn lo-btn-ok"
              disabled={isBusy}
              onClick={() => updateStatus(o, "preparing")}
            >
              ✅ Accept
            </button>
            <button
              className="lo-btn lo-btn-bad"
              disabled={isBusy}
              onClick={() => updateStatus(o, "cancelled")}
            >
              ❌ Reject
            </button>
          </>
        )}
        {s === "preparing" && (
          <button
            className="lo-btn lo-btn-info"
            disabled={isBusy}
            onClick={() => updateStatus(o, "ready")}
          >
            Mark Ready
          </button>
        )}
        {s === "ready" && (
          <button
            className="lo-btn lo-btn-ok"
            disabled={isBusy}
            onClick={() => updateStatus(o, "completed")}
          >
            Complete
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="lo-wrap">
        <header className="lo-header">
          <div className="lo-title">
            <h2>Today’s Orders</h2>
            <span className="lo-sub">Loading…</span>
          </div>
        </header>
        <div className="lo-skeleton">
          <div className="lo-skel-card" />
          <div className="lo-skel-card" />
          <div className="lo-skel-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="lo-wrap">
      <header className="lo-header">
        <div className="lo-title">
          <h2>Live Orders</h2>
          <span className="lo-sub">
            {new Date().toLocaleDateString()} • {derived.counts.all} total
          </span>
        </div>

        <div className="lo-controls">
          <div className="lo-filters" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`lo-filter ${tab === t.key ? "is-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="lo-chip">
                  {t.key === "all"
                    ? derived.counts.all
                    : t.key === "active"
                    ? derived.counts.active
                    : derived.counts.completed}
                </span>
              </button>
            ))}
          </div>

          <div className="lo-search">
            <input
              placeholder="Search name, mobile, address, order #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {derived.filtered.length === 0 ? (
        <div className="lo-empty">
          <div className="lo-empty-icon">🍽️</div>
          <div className="lo-empty-title">No orders</div>
        </div>
      ) : (
        <div className="lo-grid">
          {derived.filtered.map((o) => {
            const code = o?.displayCode || formatOrderCode(o?.id);
            const items = Array.isArray(o?.items) ? o.items : [];
            const totalQty = countItems(items);

            return (
              <article className="lo-card" key={o.id}>
                <div className="lo-card-head">
                  <div className="lo-card-id">
                    <span className="lo-hash">#</span>
                    {code}
                  </div>
                  <span className={`lo-status lo-${o?.status || "paid"}`}>{o?.status}</span>
                </div>

                <div className="lo-meta">
                  <div className="lo-meta-row">
                    <span className="lo-meta-key">Customer</span>
                    <span className="lo-meta-val">{o?.customerName || "-"}</span>
                  </div>
                  <div className="lo-meta-row">
                    <span className="lo-meta-key">Mobile</span>
                    <span className="lo-meta-val">{o?.customerMobile || "-"}</span>
                  </div>
                  <div className="lo-meta-row">
                    <span className="lo-meta-key">Address</span>
                    <span className="lo-meta-val lo-notes">{o?.address || "-"}</span>
                  </div>
                  <div className="lo-meta-row">
                    <span className="lo-meta-key">Total</span>
                    <span className="lo-meta-val">{fmtGBP(o?.totalAmount)}</span>
                  </div>
                  <div className="lo-meta-row">
                    <span className="lo-meta-key">Items</span>
                    <span className="lo-meta-val" style={{ fontWeight: 800 }}>
                      {totalQty}
                    </span>
                  </div>
                </div>

                <ul className="lo-items">
                  {items.map((it, idx) => (
                    <li className="lo-item" key={it.id || idx}>
                      <span className="lo-bullet">•</span>
                      <span className="lo-item-name">
                        <strong>{it.quantity}</strong> × {it.name}
                      </span>
                      <span className="lo-item-price">{fmtGBP(it.price)}</span>
                    </li>
                  ))}
                </ul>

                <div className="lo-card-foot">
                  <time className="lo-time">
                    {o.createdAt
                      ? new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </time>
                  {o.paymentMethod && <span className="lo-tag">{o.paymentMethod}</span>}
                </div>

                {renderActions(o)}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
