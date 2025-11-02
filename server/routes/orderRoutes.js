const express = require('express');
const router = express.Router();

const ctr = require('../controllers/orderController');

// If you have these, use them. Otherwise, use the no-op placeholders below.
let { requireAuth, requireAdmin } = (() => {
  try { return require('../middlewares/auth'); }
  catch { return {}; }
})();

// Fallback middlewares if not present (for local testing)
if (typeof requireAuth !== 'function') requireAuth = (_req, _res, next) => next();
if (typeof requireAdmin !== 'function') requireAdmin = requireAuth; // allow testing

// Small helper so missing handlers don't crash the server
function h(name) {
  if (typeof ctr[name] === 'function') return ctr[name];
  return (_req, res) => res.status(500).json({ message: `orderController.${name} is not defined` });
}

// Create order (customer)
router.post('/', requireAuth, h('createOrder'));

// Live orders (active: paid/preparing/ready)
router.get('/live', requireAuth, h('getLiveOrders'));

// Today (all today’s orders)
router.get('/today', requireAuth, h('getTodayOrders'));

// Admin list (SEARCH + PAGINATION)
router.get('/admin', requireAdmin, h('listOrdersAdmin')); // <-- THIS is the endpoint your UI calls

// Update status
router.patch('/:id/status', requireAdmin, h('updateStatus'));

// Mark paid (admin utility)
router.post('/mark-paid', requireAdmin, h('markPaid'));

// Current user's history
router.get('/history', requireAuth, h('getOrderHistory'));

// Single order (receipt)
router.get('/:id/receipt', requireAuth, h('getReceipt'));

module.exports = router;
