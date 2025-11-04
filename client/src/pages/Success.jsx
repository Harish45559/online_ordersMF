// client/src/pages/Success.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('confirming'); // confirming | paid | notpaid | error

  useEffect(() => {
    const run = async () => {
      const session_id = searchParams.get('session_id');
      const order_id = searchParams.get('order_id');

      if (!session_id || !order_id) {
        setStatus('error');
        return;
      }

      try {
        // Ask server to confirm + mark order as paid
        const { data } = await api.post('/api/payment/confirm', {
          session_id,
          order_id,
        });

        if (data?.paid) {
          // clear any local cart
          try {
            localStorage.removeItem('cart');
          } catch {}

          setStatus('paid');
        } else {
          setStatus('notpaid');
        }
      } catch (err) {
        console.error('Confirm error:', err?.message || err);
        setStatus('error');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToMenu = () => {
    // Adjust the path to your actual menu route
    navigate('/menu');
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
      {status === 'confirming' && (
        <>
          <h2>Payment successful 🎉</h2>
          <p>Finalising your order…</p>
        </>
      )}

      {status === 'paid' && (
        <>
          <h2>Payment successful 🎉</h2>
          <p>Your order has been placed and will now appear in Live Orders.</p>
          <button style={{ marginTop: 16 }} onClick={goToMenu}>
            Back to Menu
          </button>
        </>
      )}

      {status === 'notpaid' && (
        <>
          <h2>Payment not completed</h2>
          <p>If money was taken, it may be pending—please contact support with your order ID.</p>
          <button style={{ marginTop: 16 }} onClick={goToMenu}>
            Back to Menu
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <h2>We couldn’t verify your payment</h2>
          <p>Please try again or contact support.</p>
          <button style={{ marginTop: 16 }} onClick={goToMenu}>
            Back to Menu
          </button>
        </>
      )}
    </div>
  );
}
