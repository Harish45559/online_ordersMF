const { Cart } = require('../models/Cart');

// Get items in the cart
exports.getCartItems = async (req, res) => {
  try {
    const items = await Cart.findAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving cart items' });
  }
};

// Add an item to the cart
exports.addToCart = async (req, res) => {
  const { itemName, price, quantity } = req.body;
  try {
    const item = await Cart.create({ itemName, price, quantity });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error adding to cart' });
  }
};

// Clear the cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.destroy({ where: {} });
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing cart' });
  }
};
