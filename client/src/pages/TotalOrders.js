import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "../styles/TotalOrders.css";

const PAGE_SIZES = [10, 20, 50, 100];
const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "paid", label: "Paid" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function TotalOrders() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState("DESC");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [expanded, setExpanded] = useState({}); // id -> bool

  const pageCount = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count, pageSize]);

  const token = useMemo(() => {
    try { return localStorage.getItem("token") || ""; } catch { return ""; }
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/orders/admin", {
        params: { query, userId, status, page, pageSize, sort, dir },
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setRows(res.data?.rows || []);
      setCount(Number(res.data?.count || 0));
    } catch (err) {
      console.error("fetchOrders error:", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sort, dir]); // fetch on page/sort changes

  const onSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const changeSort = (col) => {
    if (sort === col) setDir((d) => (d === "ASC" ? "DESC" : "ASC"));
    else {
      setSort(col);
      setDir("ASC");
    }
  };

  return (
    <div className="to-wrap">
      <div className="to-head">
        <h2>Total Orders</h2>
      </div>

      {/* Filters */}
      <form className="to-filters" onSubmit={onSearch}>
        <input
          className="to-search"
          placeholder="Search id, code, name, mobile, address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          className="to-user"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <select
          className="to-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button className="to-btn" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
        <div className="to-grow" />
        <label className="to-psize">
          Page size
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </form>

      {/* Table */}
      <div className="to-table-wrap">
        <table className="to-table">
          <thead>
            <tr>
              <Th title="#" col="id" sort={sort} dir={dir} onSort={changeSort} />
              <Th title="Code" col="displayCode" sort={sort} dir={dir} onSort={changeSort} />
              <Th title="User ID" col="userId" sort={sort} dir={dir} onSort={changeSort} />
              <Th title="Customer" col="customerName" sort={sort} dir={dir} onSort={changeSort} />
              <Th title="Mobile" col="customerMobile" sort={sort} dir={dir} onSort={changeSort} />
              <Th title="Total" col="totalAmount" sort={sort} dir={dir} onSort={changeSort} align="right" />
              <Th title="Status" col="status" sort={sort} dir={dir} onSort={changeSort} />
              <Th title="Created" col="createdAt" sort={sort} dir={dir} onSort={changeSort} />
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} className="to-empty">No orders found.</td></tr>
            )}

            {rows.map((o) => {
              const created = o.createdAt ? new Date(o.createdAt) : null;
              const createdStr = created ? created.toLocaleString() : "-";
              const total = Number(o.totalAmount || 0).toFixed(2);
              const items = Array.isArray(o.items) ? o.items : [];
              const isOpen = !!expanded[o.id];

              return (
                <React.Fragment key={o.id}>
                  <tr>
                    <td>{o.id}</td>
                    <td>{o.displayCode || "-"}</td>
                    <td>{o.userId ?? "-"}</td>
                    <td>{o.customerName || "-"}</td>
                    <td>{o.customerMobile || "-"}</td>
                    <td className="to-right">£{total}</td>
                    <td><span className={`to-badge to-${o.status || "paid"}`}>{o.status || "paid"}</span></td>
                    <td>{createdStr}</td>
                    <td>
                      <button className="to-link" onClick={() => toggleExpand(o.id)}>
                        {isOpen ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="to-detail-row">
                      <td colSpan={9}>
                        <div className="to-detail">
                          <div className="to-detail-col">
                            <div className="to-detail-title">Contact / Address</div>
                            <div><strong>Name:</strong> {o.customerName || "-"}</div>
                            <div><strong>Mobile:</strong> {o.customerMobile || "-"}</div>
                            <div><strong>Address:</strong> {o.address || "-"}</div>
                            <div><strong>Payment:</strong> {o.paymentMethod || "-"}</div>
                            <div><strong>Notes:</strong> {o.notes || <span className="to-muted">No notes</span>}</div>
                          </div>

                          <div className="to-detail-col">
                            <div className="to-detail-title">Items</div>
                            {items.length === 0 ? (
                              <div className="to-muted">No items</div>
                            ) : (
                              <ul className="to-items">
                                {items.map((it, idx) => (
                                  <li key={idx}>
                                    <span>{it.name}</span>
                                    <span>× {it.quantity}</span>
                                    <span>£{Number(it.price || 0).toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="to-pager">
        <button className="to-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          ‹ Prev
        </button>
        <span className="to-page">
          Page <strong>{page}</strong> of <strong>{pageCount}</strong> — {count} orders
        </span>
        <button className="to-btn" disabled={page >= pageCount || loading} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
          Next ›
        </button>
      </div>
    </div>
  );
}

function Th({ title, col, sort, dir, onSort, align }) {
  const active = sort === col;
  return (
    <th
      className={`to-th ${align === "right" ? "to-right" : ""}`}
      onClick={() => onSort(col)}
      title={active ? `Sorted ${dir}` : "Click to sort"}
      role="button"
    >
      <span>{title}</span>
      <span className={`to-caret ${active ? `is-${dir.toLowerCase()}` : ""}`} />
    </th>
  );
}
