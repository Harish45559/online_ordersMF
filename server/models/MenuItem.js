const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Category = require('./Category');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false, // required so it shows in category groups
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'name is required' },
      len: { args: [1, 255], msg: 'name must be 1–255 chars' },
    },
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  // DB shows "double precision" – map to FLOAT/DOUBLE
  price: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    validate: {
      isFloat: { msg: 'price must be a number' },
      min: { args: [0], msg: 'price must be ≥ 0' },
    },
  },
  imageUrl: {
  type: DataTypes.STRING(255),
  allowNull: false,
  validate: {
    notEmpty: { msg: 'imageUrl is required' },
  },
},

}, {
  tableName: 'menu_items',  // your table
  timestamps: true,         // createdAt / updatedAt exist
  hooks: {
    beforeValidate(menu) {
      if (typeof menu.name === 'string') menu.name = menu.name.trim();
      if (typeof menu.imageUrl === 'string') menu.imageUrl = menu.imageUrl.trim();
    },
  },
});

// association (optional but useful for includes)
MenuItem.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = MenuItem;
