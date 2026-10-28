const path = require("node:path");
const { Pool } = require("pg");

process.loadEnvFile(path.join(__dirname, ".env"));

const pool = new Pool({
    connectionTimeoutMillis: 5000
});

pool.on("error", () => {
    console.error("Se interrumpió una conexión con PostgreSQL.");
});

module.exports = pool;