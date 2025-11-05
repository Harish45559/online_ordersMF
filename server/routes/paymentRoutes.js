// server/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const db = require('../models');
const { Order, OrderItem } = db;

// ---------- helpers ----------
const normalizePrice = (p) => {
  if (typeof p === 'number' && Number.isFinite(p)) return p;
  if (typeof p === 'string') {
    const clean = p.replace(/[^0-9.\-]/g, '');
    const num = Number(clean);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
};

const toStripeAmount = (price) => Math.round(normalizePrice(price) * 100);

// ---------- POST /api/payment/create-checkout-session ----------
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { orderId, currency = 'gbp' } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.items || !order.items.length) {
      return res.status(400).json({ error: 'Order has no items' });
    }

    const line_items = [];
    for (const i of order.items) {
      const unit = toStripeAmount(i.price);
      if (!Number.isFinite(unit) || unit <= 0) {
        return res.status(400).json({ error: `Invalid price for "${i.name}" (got "${i.price}")` });
      }
      line_items.push({
        price_data: {
          currency: String(currency || 'gbp').toLowerCase(),
          product_data: { name: i.name || 'Item' },
          unit_amount: unit,
        },
        quantity: Number(i.quantity || 1),
      });
    }

    // Ensure this port matches your running frontend
    const success_url = `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`;
    const cancel_url  = `http://localhost:3000/checkout?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url,
      cancel_url,
      metadata: { orderId: String(order.id) },
    });

    // pending while user pays; store session id for reconciliation
    await Order.update(
      { status: 'pending_payment', stripeSessionId: session.id },
      { where: { id: order.id } }
    );

    return res.json({ url: session.url });
  } catch (e) {
    console.error('❌ create-checkout-session error:', e?.message || e);
    res.status(500).json({ error: 'failed to create session', detail: e.message });
  }
});

// ---------- POST /api/payment/confirm ----------
router.post('/confirm', async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });

    // 1) Retrieve the Checkout Session with expanded PaymentIntent
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    });

    // 2) Pull orderId from metadata
    const orderId = session?.metadata?.orderId;
    if (!orderId) {
      console.error('❌ /confirm: Missing orderId in session metadata');
      return res.status(400).json({ error: 'orderId missing in session metadata' });
    }

    // 3) Check Stripe statuses
    const paymentStatus = session.payment_status;                 // 'paid' when finalized
    const intentStatus = session?.payment_intent?.status || null; // 'succeeded' when PI is done
    const isPaid = paymentStatus === 'paid' || intentStatus === 'succeeded';

    // 4) Load order by PK and update directly (avoids silent "0 rows updated")
    const order = await Order.findByPk(orderId);
    if (!order) {
      console.error(`❌ /confirm: Order not found for id=${orderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    if (isPaid) {
      await order.update({
        status: 'paid',
        paymentIntentId: session.payment_intent?.id || null,
        stripeSessionId: session.id,
      });
      console.log(`✅ /confirm: Order ${order.id} marked as PAID (payment_status=${paymentStatus}, intent=${intentStatus})`);
    } else {
      console.warn(`⚠️ /confirm: Order ${order.id} not paid yet (payment_status=${paymentStatus}, intent=${intentStatus})`);
    }

    // 5) Return diagnostic info
    return res.json({
      ok: true,
      paid: isPaid,
      orderId: order.id,
      session_status: session.status,
      payment_status: paymentStatus,
      intent_status: intentStatus,
    });
  } catch (e) {
    console.error('❌ /confirm error:', e?.message || e);
    res.status(500).json({ error: 'confirm failed', detail: e.message });
  }
});

// ---------- POST /api/payment/confirm-by-order ----------
router.post('/confirm-by-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const order = await Order.findByPk(orderId);
    if (!order || !order.stripeSessionId) {
      return res.status(404).json({ error: 'Order or stripeSessionId not found' });
    }

    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId, {
      expand: ['payment_intent'],
    });

    const paid =
      session.payment_status === 'paid' ||
      session?.payment_intent?.status === 'succeeded';

    if (paid) {
      await order.update({
        status: 'paid',
        paymentIntentId: session.payment_intent?.id || null,
        stripeSessionId: session.id,
      });
      console.log(`✅ Order ${orderId} marked as PAID via confirm-by-order`);
    }

    res.json({
      ok: true,
      paid,
      orderId,
      session_status: session.status,
      payment_status: session.payment_status,
      intent_status: session?.payment_intent?.status || null,
    });
  } catch (e) {
    console.error('❌ confirm-by-order error:', e?.message || e);
    res.status(500).json({ error: 'confirm-by-order failed', detail: e.message });
  }
});

// ---------- POST /api/payment/reconcile-pending ----------
router.post('/reconcile-pending', async (_req, res) => {
  try {
    const pending = await Order.findAll({ where: { status: 'pending_payment' } });
    const results = [];

    for (const o of pending) {
      if (!o.stripeSessionId) {
        results.push({ orderId: o.id, updated: false, reason: 'no session' });
        continue;
      }
      try {
        const session = await stripe.checkout.sessions.retrieve(o.stripeSessionId, {
          expand: ['payment_intent'],
        });
        const paid =
          session.payment_status === 'paid' ||
          session?.payment_intent?.status === 'succeeded';

        if (paid) {
          await o.update({
            status: 'paid',
            paymentIntentId: session.payment_intent?.id || null,
            stripeSessionId: session.id,
          });
          console.log(`✅ Reconciled order ${o.id} to PAID`);
          results.push({
            orderId: o.id,
            updated: true,
            payment_status: session.payment_status,
            intent_status: session?.payment_intent?.status || null,
          });
        } else {
          results.push({
            orderId: o.id,
            updated: false,
            reason: session.payment_status,
            intent_status: session?.payment_intent?.status || null,
          });
        }
      } catch (err) {
        results.push({ orderId: o.id, updated: false, error: err.message });
      }
    }
 
    res.json({ ok: true, results });
  } catch (e) {
    console.error('❌ reconcile-pending error:', e?.message || e);
    res.status(500).json({ error: 'reconcile failed', detail: e.message });
  }
});

module.exports = router;
  