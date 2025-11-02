const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UK_POSTCODE_REGEX =
  /^(GIR\s?0AA|BFPO\s?[0-9]{1,4}|(ASCN|STHL|TDCU|BBND|BIQQ|FIQQ|GX11|PCRN|SIQQ|TKCA)\s?1ZZ|[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})$/i;

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Core identity
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // Role
    role: {
      type: DataTypes.STRING(50),
      defaultValue: 'user',
    },

    // Optional contact / personal
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    // UK Address
    addressLine1: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    addressLine2: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    county: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    postcode: {
      type: DataTypes.STRING(12),
      allowNull: true,
      // Client & server already normalize/validate, but this adds
      // an extra guard at the model layer (DB constraint still applies).
      validate: {
        isUkPostcodeOrNull(value) {
          if (value == null || value === '') return; // allow null/blank (blank will be normalized to null server-side)
          const v = String(value).trim();
          if (!UK_POSTCODE_REGEX.test(v)) {
            throw new Error('Invalid UK postcode');
          }
        },
      },
    },
    country: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: 'United Kingdom',
    },

    // Timestamps (Sequelize manages these when timestamps: true)
    createdAt: {
      type: DataTypes.DATE,
      field: 'createdAt',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updatedAt',
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    // Keep camelCase column names to match your controller & SQL
    underscored: false,
    indexes: [
      { unique: true, fields: ['email'] },
      // Optional: useful if you search by postcode often
      { fields: ['postcode'] },
    ],
  }
);

// Associations (adjust if you have an Order model, etc.)
User.associate = (models) => {
  // Example: User.hasMany(models.Order, { foreignKey: 'userId' });
};

module.exports = User;
