// controllers/paymentController.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create Stripe checkout session.
 * Assumes you've just created an Order row with status 'pending_payment'
 * and you pass that orderId from the frontend request.
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { orderId, items, customerName, customerMobile, address } = req.body;

    // Convert your items to Stripe line_items
    const line_items = (items || []).map(i => ({
      price_data: {
        currency: 'gbp', // change if needed
        product_data: { name: i.name },
        unit_amount: Math.round(Number(i.price) * 100), // in pence
      },
      quantity: Number(i.quantity) || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
      metadata: {
        orderId,                     // 👈 critical
        customerName,
        customerMobile,
        address,
      },
    });

    // (Optional) save session.id on the order right now
    // await Order.update({ stripeSessionId: session.id }, { where: { id: orderId } });

    res.json({ url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error:', err);
    res.status(500).json({ message: 'Failed to create checkout session' });
  }
};
