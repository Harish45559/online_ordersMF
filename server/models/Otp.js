// server/models/Otp.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Minimal OTP storage for email verification.
 * Table: otps
 * Columns:
 *  - id (PK)
 *  - email (required)
 *  - otp (6-digit string)
 *  - expiresAt (DATE)
 *  - createdAt / updatedAt
 */
const Otp = sequelize.define(
  'Otp',
  {
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { isEmail: true },
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'otps',
    indexes: [
      { fields: ['email'] },
      { fields: ['expiresAt'] },
    ],
  }
);

module.exports = Otp;
