// server/models/index.js
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const db = {};

// Core exports
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.User = require('./User');
db.Order = require('./Order');
db.OrderItem = require('./OrderItem');
db.MenuItem = require('./MenuItem'); // keep if you use it elsewhere

// ------- Associations -------
// User 1<--->* Order
db.User.hasMany(db.Order, {
  foreignKey: 'userId',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE',
});
db.Order.belongsTo(db.User, {
  foreignKey: 'userId',
});

// Order 1<--->* OrderItem
db.Order.hasMany(db.OrderItem, {
  as: 'items',               // <-- matches your controller include: { as: 'items' }
  foreignKey: 'orderId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
db.OrderItem.belongsTo(db.Order, {
  foreignKey: 'orderId',
});

// (Optional) If your OrderItem references a MenuItem via menuItemId, you can add:
// db.MenuItem.hasMany(db.OrderItem, { foreignKey: 'menuItemId' });
// db.OrderItem.belongsTo(db.MenuItem, { foreignKey: 'menuItemId' });

module.exports = db;
