const express = require('express');
const { getCartItems, addToCart, clearCart } = require('../controllers/cartController');
const router = express.Router();

router.get('/', getCartItems);
router.post('/add', addToCart);
router.delete('/clear', clearCart);

module.exports = router;
