// server/models/Otp.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Otp = sequelize.define(
  'Otp',
  {
    email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
    otp:   { type: DataTypes.STRING(6), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'otps', indexes: [{ fields: ['email'] }, { fields: ['expiresAt'] }] }
);

module.exports = Otp;
