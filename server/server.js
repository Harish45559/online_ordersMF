// server/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const path = require('path');

// Load env vars
dotenv.config();

const app = express();

/* =====================================================
   1. CORS FIRST — before any routes or body parsers
===================================================== */
const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g. https://online-ordersmf.onrender.com
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    console.warn(`❌ CORS blocked origin: ${origin}`);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

/* =====================================================
   2. STRIPE WEBHOOK — mount before JSON/body parser
===================================================== */
app.post(
  '/api/payment/stripe-webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/stripeWebhook')
);

/* =====================================================
   3. Body Parsers for JSON & URL-encoded payloads
===================================================== */
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* =====================================================
   4. Health Check (for Render)
===================================================== */
app.get('/healthz', (req, res) => res.status(200).send('ok'));

/* =====================================================
   5. Test Route
===================================================== */
app.get('/', (req, res) => {
  res.send('API is running...');
});

/* =====================================================
   6. Import & Mount Routes
===================================================== */
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const cartRoutes = require('./routes/cartRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notification', notificationRoutes);

/* =====================================================
   7. Global Error Handling
===================================================== */
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.message || err);
  res.status(500).json({ message: 'Internal Server Error' });
});

/* =====================================================
   8. 404 Fallback
===================================================== */
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/* =====================================================
   9. Start Server after DB connects
===================================================== */
sequelize
  .sync({ alter: true })
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err);
  });
