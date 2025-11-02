const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Category name is required' },
      len: {
        args: [1, 100],
        msg: 'Category name must be 1–100 characters',
      },
      isNotOnlySpaces(value) {
        if (typeof value === 'string' && value.trim().length === 0) {
          throw new Error('Category name cannot be empty');
        }
      },
    },
  },
}, {
  tableName: 'categories',
  timestamps: false,
  hooks: {
    beforeValidate(category) {
      if (typeof category.name === 'string') {
        category.name = category.name.trim();
      }
    },
  },
});

module.exports = Category;
