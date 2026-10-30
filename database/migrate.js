const fs = require("node:fs");
const path = require("node:path");
const pool = require("../database");

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '5s'");
        const directory = path.join(__dirname, "migrations");
        for (const file of fs.readdirSync(directory).filter(file => file.endsWith(".sql")).sort()) {
            await client.query(fs.readFileSync(path.join(directory, file), "utf8"));
        }
        await client.query("COMMIT");
        console.log("Base actualizada. Las reservas existentes se conservaron.");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

migrate().catch(error => {
    console.error("No se pudo actualizar la tabla:", error.code || error.name);
    process.exitCode = 1;
}).finally(() => pool.end());
