// server/routes/stripeWebhook.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const db = require('../models');
const { Order } = db;

// IMPORTANT: This route needs RAW body (see server.js mounting below)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // set in .env

  let event;
  try {
    event = endpointSecret
      ? stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
      : req.body; // dev fallback (not for prod)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session?.metadata?.orderId;
      if (orderId) {
        await Order.update(
          {
            status: 'paid',
            paymentIntentId: session.payment_intent || null,
            stripeSessionId: session.id,
          },
          { where: { id: orderId } }
        );
        console.log(`✅ Order ${orderId} marked PAID via webhook`);
      }
    }
    // (optional) handle other events if you want
    return res.json({ received: true });
  } catch (e) {
    console.error('❌ Webhook handler error:', e);
    return res.status(500).end();
  }
});

module.exports = router;
