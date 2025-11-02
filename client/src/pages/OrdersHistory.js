// client/src/pages/OrdersHistory.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/OrdersHistory.css';

const OrdersHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/api/orders/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Could not load your order history.');
    } finally {
      setLoading(false);
    }
  };

  const openReceipt = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(`/api/orders/${orderId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedOrder(res.data);
    } catch (err) {
      console.error('Failed to fetch receipt:', err);
      setSelectedOrder(null);
      alert('Could not open receipt. Please try again.');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="order-history-container">
      <h2>Your Order History</h2>

      {loading && <div className="oh-skeleton">Loading your orders…</div>}
      {error && <div className="oh-error">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="oh-empty">No orders yet.</div>
      )}

      {!loading && !error && orders.length > 0 && (
        <table className="order-history-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Mobile</th>
              <th>Address</th>
              <th>Status</th>
              <th>Total</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td>{o.customerName || '-'}</td>
                <td>{o.customerMobile || '-'}</td>
                <td className="oh-address">{o.address || '-'}</td>
                <td>
                  <span className={`oh-badge ${o.status}`}>{o.status.replace('_', ' ')}</span>
                </td>
                <td>£{Number(o.totalAmount).toFixed(2)}</td>
                <td>
                  <button className="receipt-btn" onClick={() => openReceipt(o.id)}>🧾 Receipt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Receipt Modal */}
      {selectedOrder && (
        <div className="oh-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="oh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="oh-modal-header">
              <h3>Receipt — Order #{selectedOrder.id}</h3>
              <button className="oh-close" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>
            <div className="oh-receipt-body">
              <div className="oh-receipt-row"><strong>Name:</strong> {selectedOrder.customerName || '-'}</div>
              <div className="oh-receipt-row"><strong>Mobile:</strong> {selectedOrder.customerMobile || '-'}</div>
              <div className="oh-receipt-row"><strong>Address:</strong> {selectedOrder.address || '-'}</div>
              <div className="oh-receipt-row"><strong>Payment:</strong> {selectedOrder.paymentMethod || '-'}</div>
              <div className="oh-receipt-line" />

              <table className="oh-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((it) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>{it.quantity}</td>
                      <td>£{Number(it.price).toFixed(2)}</td>
                      <td>£{Number(it.price * it.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="oh-total">
                <div><strong>Total:</strong> £{Number(selectedOrder.totalAmount).toFixed(2)}</div>
                <div className={`oh-badge ${selectedOrder.status}`}>{selectedOrder.status.replace('_', ' ')}</div>
              </div>
            </div>

            <div className="oh-modal-actions">
              <button className="oh-print" onClick={() => window.print()}>Print</button>
              <button className="oh-close2" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersHistory;
