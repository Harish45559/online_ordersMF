// server/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const stripeWebhook = require('./routes/stripeWebhook');

dotenv.config();

const app = express();

// ====== CORS first ======
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// ====== Stripe webhook (MUST be before any JSON/body parsers) ======
app.post(
  '/api/payment/stripe-webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/stripeWebhook') // if this file exports a handler function
);

// ====== Now enable JSON for the rest of the app ======
app.use(bodyParser.json());

// ====== Test route ======
app.get('/', (req, res) => {
  res.send('API is running...');
});

// ====== Import Routes ======
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const cartRoutes = require('./routes/cartRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// ====== Mount Routes ======
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notification', notificationRoutes);

// NOTE: If routes/stripeWebhook.js is an Express Router (not a single handler),
// you can mount it like this instead of the raw POST above:
// app.use('/api/stripe', stripeWebhook);

// ====== Global Error Handling ======
app.use((err, req, res, next) => {
  console.error('Error:', err.message || err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ====== 404 fallback ======
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ====== Start Server ======
sequelize
  .sync({ alter: true })
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
    });
  })
  .catch((err) => console.error('❌ Database connection error:', err));
