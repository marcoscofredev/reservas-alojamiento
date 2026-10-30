const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { createApp } = require("../server");
const { createPostgresStore } = require("../reservation-store");

test("PostgreSQL: persistencia, concurrencia, límites de estadía y cancelaciones", {
    skip: process.env.PG_INTEGRATION !== "1"
}, async t => {
    // Un esquema temporal mantiene las pruebas separadas de las reservas del usuario.
    const admin = require("../database");
    const { Pool } = require("pg");
    const schema = "test_reservations_" + randomUUID().replaceAll("-", "");
    let pool;
    let server;
    try {
        await admin.query(`CREATE SCHEMA "${schema}"`);
        pool = new Pool({ options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
        await pool.query(fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8"));
        // Simula la tabla anterior: migrar no debe borrar reservas ni exigir datos históricos.
        await pool.query("ALTER TABLE reservations DROP COLUMN guest_name, DROP COLUMN guest_email, DROP COLUMN guest_phone");
        await pool.query("INSERT INTO reservations(check_in, check_out) VALUES ('2026-12-01', '2026-12-03')");
        const migration = fs.readFileSync(path.join(__dirname, "../database/migrations/001-guest-details.sql"), "utf8");
        await pool.query(migration);
        await pool.query(migration);
        const historical = await pool.query("SELECT guest_name, guest_email, guest_phone FROM reservations");
        assert.deepEqual(historical.rows, [{ guest_name: null, guest_email: null, guest_phone: null }]);
        await pool.query("DELETE FROM reservations");
        const options = () => ({ store: createPostgresStore(pool), now: () => new Date(2026, 9, 28, 12) });
        async function start() {
            server = createApp(options()).listen(0, "127.0.0.1");
            await once(server, "listening");
            return `http://127.0.0.1:${server.address().port}`;
        }
        async function stop() {
            if (!server) return;
            await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
            server = null;
        }
        let base = await start();
        const post = dates => fetch(base + "/api/reservas", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...dates, guest: { name: "Huésped de prueba", email: "huesped@example.com", phone: "+54 2942 123456" } })
        });
        const dates = { checkIn: "2026-11-15", checkOut: "2026-11-18" };
        const responses = await Promise.all([post(dates), post(dates)]);
        assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
        const created = await responses.find(response => response.status === 201).json();
        assert.deepEqual(created.reservation.checkIn, dates.checkIn);
        assert.equal(created.nights, 3);
        assert.equal(created.reservation.guest, undefined);
        const storedGuest = await pool.query("SELECT guest_name, guest_email, guest_phone FROM reservations WHERE id = $1", [created.reservation.id]);
        assert.deepEqual(storedGuest.rows[0], { guest_name: "Huésped de prueba", guest_email: "huesped@example.com", guest_phone: "+54 2942 123456" });
        await stop();
        // Otra aplicación y otro pool: las reservas sobreviven al cierre de las conexiones.
        await pool.end();
        pool = new Pool({ options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
        base = await start();
        const persistedGuest = await pool.query("SELECT guest_name, guest_email FROM reservations WHERE id = $1", [created.reservation.id]);
        assert.deepEqual(persistedGuest.rows[0], { guest_name: "Huésped de prueba", guest_email: "huesped@example.com" });
        const list = await (await fetch(base + "/api/reservas")).json();
        assert.deepEqual(list, [dates]);
        assert.equal((await (await fetch(base + "/api/disponibilidad?checkIn=2026-11-16&checkOut=2026-11-19")).json()).available, false);
        assert.equal((await post({ checkIn: "2026-11-18", checkOut: "2026-11-20" })).status, 201);
        assert.equal((await post({ checkIn: "2026-11-12", checkOut: "2026-11-15" })).status, 201);
        assert.equal((await post({ checkIn: "2026-11-14", checkOut: "2026-11-21" })).status, 409);
        assert.equal((await post({ checkIn: "2026-11-15", checkOut: "2026-11-15" })).status, 400);
        await pool.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [created.reservation.id]);
        assert.equal((await (await fetch(base + "/api/disponibilidad?checkIn=2026-11-15&checkOut=2026-11-18")).json()).available, true);
        assert.equal((await post(dates)).status, 201);
        assert.equal((await (await fetch(base + "/api/reservas")).json()).length, 3);
        // La base también rechaza escrituras inválidas que omitan la API.
        await assert.rejects(pool.query("INSERT INTO reservations(check_in, check_out) VALUES ('2026-12-02', '2026-12-01')"), { code: "23514" });
        const literalName = "O'Connor <b>prueba</b>";
        const literal = await createPostgresStore(pool).create("2026-12-10", "2026-12-11", {
            name: literalName, email: "prueba@example.com", phone: null
        });
        const literalRow = await pool.query("SELECT guest_name FROM reservations WHERE id = $1", [literal.id]);
        assert.equal(literalRow.rows[0].guest_name, literalName);
        assert.equal(JSON.stringify(await createPostgresStore(pool).list()).includes("O'Connor"), false);
    } finally {
        if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
        if (pool) await pool.end();
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.end();
    }
});
