import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Success() {
  const [state, setState] = useState({ checking: true, ok: false, error: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get('session_id');
    const order_id = params.get('order_id'); // optional, helpful for debugging

    if (!session_id) {
      setState({ checking: false, ok: false, error: 'Missing session_id' });
      return;
    }

    (async () => {
      try {
        console.log('Success.jsx session_id:', session_id, 'order_id:', order_id);

        const { data } = await axios.post(
          'http://localhost:5000/api/payment/confirm',
          { session_id },
          { headers: { 'Content-Type': 'application/json' } }
        );

        console.log('Confirm response:', data);
        setState({ checking: false, ok: !!data.paid, error: '' });

        // Optional: redirect after confirm
        // if (data.paid) setTimeout(() => window.location.href = '/live-orders', 800);
      } catch (e) {
        console.error('Confirm failed:', e?.response?.data || e);
        setState({ checking: false, ok: false, error: 'Confirm failed' });
      }
    })();
  }, []);

  if (state.checking) return <div style={{ padding: 24 }}>Confirming your payment…</div>;
  if (!state.ok) return <div style={{ padding: 24 }}>We couldn’t confirm payment. {state.error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Payment successful 🎉</h2>
      <p>Your order has been placed and will now appear in Live Orders.</p>
    </div>
  );
}
