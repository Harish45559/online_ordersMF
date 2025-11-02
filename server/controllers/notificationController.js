exports.notifyRestaurant = async (req, res) => {
  const { orderId, customerDetails, orderDetails } = req.body;
  try {
    // Logic to notify restaurant (via socket, email, etc.)
    console.log(`Order Received: ${orderId}, Customer: ${customerDetails.name}`);
    res.json({ message: 'Notification sent to restaurant' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending notification' });
  }
};
