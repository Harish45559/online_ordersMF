// server/config/database.js
const { Sequelize } = require("sequelize");

// If dotenv isn’t already loaded elsewhere, uncomment the next line for local dev:
// require("dotenv").config();

const isProd = process.env.NODE_ENV === "production";
const hasUrl = !!process.env.DATABASE_URL;

let sequelize;

if (hasUrl) {
  // Render / prod path — single DATABASE_URL with SSL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: isProd
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {}, // no SSL locally even if DATABASE_URL exists
    logging: false,
  });
} else {
  // Local dev path — use discrete DB_* vars or sensible defaults
  const dbName = process.env.DB_NAME || "online_orders";
  const dbUser = process.env.DB_USER || "postgres";
  const dbPass = process.env.DB_PASS || "H@rish45559";
  const dbHost = process.env.DB_HOST || "127.0.0.1";
  const dbPort = Number(process.env.DB_PORT || 5432);

  sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    port: dbPort,
    dialect: "postgres",
    logging: false,
  });
}

// Optional: quick sanity log (won’t print secrets)
if (process.env.LOG_DB_BOOT === "true") {
  console.log(
    hasUrl
      ? "DB init: Using DATABASE_URL" + (isProd ? " (prod SSL)" : " (no SSL)")
      : `DB init: Using discrete params host=${process.env.DB_HOST || "127.0.0.1"} db=${process.env.DB_NAME || "online_orders"}`
  );
}

module.exports = sequelize;
