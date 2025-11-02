const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Orders table (integer PK, camelCase columns)
 * Includes address fields and notes for delivery display.
 */
const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },

    customerName: { type: DataTypes.STRING, allowNull: true },
    customerMobile: { type: DataTypes.STRING, allowNull: true },

    // ✅ New delivery fields (snapshot of address)
    addressLine1: { type: DataTypes.STRING, allowNull: true },
    addressLine2: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    county: { type: DataTypes.STRING, allowNull: true },
    postcode: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true, defaultValue: 'United Kingdom' },

    paymentMethod: { type: DataTypes.STRING, allowNull: true },
    totalAmount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },

    displayNo: { type: DataTypes.INTEGER, allowNull: true },
    displayCode: { type: DataTypes.STRING(32), allowNull: true },

    notes: { type: DataTypes.TEXT, allowNull: true },

    status: {
      type: DataTypes.ENUM(
        'pending_payment',
        'paid',
        'preparing',
        'ready',
        'delivered',
        'completed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending_payment',
    },

    stripeSessionId: { type: DataTypes.STRING, allowNull: true },
    paymentIntentId: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: 'orders',
    timestamps: true,
    underscored: false,
    indexes: [
      { fields: ['createdAt'] },
      { fields: ['status'] },
      { fields: ['displayCode'], unique: false },
    ],
  }
);

module.exports = Order;
