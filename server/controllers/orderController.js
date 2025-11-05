const db = require('../models');
const { Op } = require('sequelize');
const { sequelize, Order, OrderItem } = db;
// const { User } = db; // if you have it

/**
 * Create order (from checkout)
 * Keeps a single 'address' string as in your existing model.
 */
async function createOrder(req, res) {
  const t = await sequelize.transaction();
  try {
    const {
      customerName,
      customerMobile,
      address,
      paymentMethod,
      items,
      totalAmount,
      notes,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'No items to order.' });
    }

    // === PER-DAY COUNTER ===
    const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // ensure counter table exists (Postgres)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS order_counters (
        counter_date DATE PRIMARY KEY,
        last_no INTEGER NOT NULL DEFAULT 0
      );
    `, { transaction: t });

    // atomic increment or insert
    const [rows] = await sequelize.query(
      `
      INSERT INTO order_counters (counter_date, last_no)
      VALUES ($1, 1)
      ON CONFLICT (counter_date)
      DO UPDATE SET last_no = order_counters.last_no + 1
      RETURNING last_no;
      `,
      { bind: [todayISO], transaction: t }
    );

    const newNo = Array.isArray(rows) ? rows[0].last_no : rows.last_no || 1;
    const yymmdd = todayISO.replace(/-/g, '').slice(2);
    const displayCode = `MF${yymmdd}-${String(newNo).padStart(3, '0')}`;

    // === CREATE ORDER ===
    const order = await Order.create(
      {
        userId: req.user?.id || null,
        customerName,
        customerMobile,
        address,
        paymentMethod,
        totalAmount: Number(totalAmount || 0),
        status: paymentMethod === 'cod' ? 'paid' : 'pending_payment',
        displayNo: newNo,
        displayCode,
        notes: (typeof notes === 'string' && notes.trim() !== '') ? notes.trim() : null,
      },
      { transaction: t }
    );

    // === ITEMS ===
    const rowsToInsert = items.map((it) => ({
      orderId: order.id,
      name: it.name,
      price: Number(it.price || 0),
      quantity: Number(it.quantity || 1),
    }));
    await OrderItem.bulkCreate(rowsToInsert, { transaction: t });

    const full = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
    });

    await t.commit();
    res.status(201).json(full);
  } catch (err) {
    await t.rollback();
    console.error('createOrder error', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
}

/** Mark order as paid (e.g., Stripe confirm/webhook) */
async function markPaid(req, res) {
  try {
    const { orderId, paymentIntentId, stripeSessionId } = req.body;
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    await order.update({
      status: 'paid',
      paymentIntentId: paymentIntentId || order.paymentIntentId,
      stripeSessionId: stripeSessionId || order.stripeSessionId,
    });

    const full = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });
    res.json(full);
  } catch (err) {
    console.error('markPaid error', err);
    res.status(500).json({ message: 'Failed to mark paid' });
  }
}

/** Live orders (admin/kitchen): paid | preparing | ready */
async function getLiveOrders(_req, res) {
  try {
    const live = await Order.findAll({
      where: { status: { [Op.in]: ['paid', 'preparing', 'ready'] } },
      order: [['createdAt', 'DESC']],
      include: [{ model: OrderItem, as: 'items' }],
    });
    res.json(live);
  } catch (err) {
    console.error('getLiveOrders error', err);
    res.status(500).json({ message: 'Failed to fetch live orders' });
  }
}

/** Update order status (admin) */
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['paid', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    await order.update({ status });

    const full = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });
    res.json(full);
  } catch (err) {
    console.error('updateStatus error', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
}

/** Current user's order history */
async function getOrderHistory(req, res) {
  try {
    const raw = (req.query.userId && req.user?.role === 'admin')
      ? req.query.userId
      : req.user?.id;
    const userId = Number(raw);
    if (!raw || Number.isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid or missing userId' });
    }

    const history = await Order.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [{ model: OrderItem, as: 'items' }],
    });
    res.json(history);
  } catch (err) {
    console.error('getOrderHistory error', err);
    res.status(500).json({ message: 'Failed to fetch order history' });
  }
}

/** Single order (receipt) */
async function getReceipt(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isOwner = req.user && String(order.userId) === String(req.user.id);
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this receipt' });
    }

    res.json(order);
  } catch (err) {
    console.error('getReceipt error', err);
    res.status(500).json({ message: 'Failed to fetch receipt' });
  }
}

/** Today’s orders (all statuses) */
async function getTodayOrders(_req, res) {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const today = await Order.findAll({
      where: { createdAt: { [Op.between]: [start, end] } },
      order: [['createdAt', 'DESC']],
      include: [{ model: OrderItem, as: 'items' }],
    });

    res.json(today);
  } catch (err) {
    console.error('getTodayOrders error', err);
    res.status(500).json({ message: 'Failed to fetch today orders' });
  }
}

/** Admin: list orders with search & pagination */
async function listOrdersAdmin(req, res) {
  try {
    const {
      query = "",
      userId,
      status,
      page = 1,
      pageSize = 20,
      sort = "createdAt",
      dir = "DESC",
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const sizeNum = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (pageNum - 1) * sizeNum;

    const where = {};

    if (status && typeof status === "string") {
      where.status = status;
    }

    if (userId != null && userId !== "") {
      const uid = Number(userId);
      if (!Number.isNaN(uid)) where.userId = uid;
    }

    if (query && query.trim()) {
      const q = query.trim();
      const numericId = Number(q);
      const or = [
        { displayCode: { [Op.iLike]: `%${q}%` } },
        { customerName: { [Op.iLike]: `%${q}%` } },
        { customerMobile: { [Op.iLike]: `%${q}%` } },
        { address: { [Op.iLike]: `%${q}%` } },
      ];
      if (!Number.isNaN(numericId)) {
        or.push({ id: numericId });
      }
      where[Op.or] = or;
    }

    const allowedSort = new Set(["createdAt", "totalAmount", "status", "id", "displayCode"]);
    const sortCol = allowedSort.has(String(sort)) ? String(sort) : "createdAt";
    const sortDir = String(dir).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const result = await Order.findAndCountAll({
      where,
      include: [{ model: OrderItem, as: "items" }],
      order: [[sortCol, sortDir]],
      limit: sizeNum,
      offset,
    });

    res.json({
      rows: result.rows,
      count: result.count,
      page: pageNum,
      pageSize: sizeNum,
      pageCount: Math.ceil(result.count / sizeNum),
    });
  } catch (err) {
    console.error("listOrdersAdmin error", err);
    res.status(500).json({ message: "Failed to list orders" });
  }
}

module.exports = {
  createOrder,
  markPaid,
  getLiveOrders,
  updateStatus,
  getOrderHistory,
  getReceipt,
  getTodayOrders,
  listOrdersAdmin,
};
