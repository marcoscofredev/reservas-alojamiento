const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID, randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { hashPassword, verifyPassword } = require("../admin-password");
const { createApp } = require("../server");
const { createMemoryStore, createPostgresStore } = require("../reservation-store");

test("La contraseña se guarda con sal y scrypt, no en texto legible", async () => {
    const password = "PruebaSoloLocal!123";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    assert.notEqual(first, second);
    assert.equal(first.includes(password), false);
    assert.equal(await verifyPassword(password, first), true);
    assert.equal(await verifyPassword("incorrecta", first), false);
    assert.equal(await verifyPassword(password, "no-es-un-hash"), false);
    await assert.rejects(hashPassword("corta"));
    await assert.rejects(hashPassword("a".repeat(129)));
});

test("Sin configurar acceso, el panel no publica datos privados", async t => {
    const app = createApp({ store: createMemoryStore() });
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const url of ["/admin", "/admin-client.js", "/admin.css"]) assert.equal((await fetch(base + url)).status, 200);
    assert.match(await (await fetch(base + "/admin")).text(), /src="\/admin-client\.js"/);
    const response = await fetch(base + "/api/admin/reservas");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.text()).includes("guestEmail"), false);
    const client = await (await fetch(base + "/admin-client.js")).text();
    assert.equal(client.includes("password_hash"), false);
    assert.equal(/innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage/.test(client), false);
});

test("Panel con PostgreSQL: sesión, privacidad, cancelación, auditoría y bloqueo de intentos", {
    skip: process.env.PG_INTEGRATION !== "1"
}, async t => {
    const adminPool = require("../database");
    const { Pool } = require("pg");
    const schema = "test_admin_" + randomUUID().replaceAll("-", "");
    const secret = randomBytes(48).toString("hex");
    const password = "PruebaSoloLocal!123";
    let pool;
    let app;
    let server;
    let base;
    async function start() {
        app = createApp({
            store: createPostgresStore(pool), now: () => new Date(2026, 9, 29, 12),
            admin: { pool, secret, schemaName: schema, pruneSessionInterval: false }
        });
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        base = `http://127.0.0.1:${server.address().port}`;
    }
    async function stop() {
        if (server) {
            await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
            server = null;
        }
        if (app?.locals.adminSessions) await app.locals.adminSessions.close();
    }
    const get = (url, cookie) => fetch(base + url, { headers: cookie ? { Cookie: cookie } : {} });
    const post = (url, body, cookie, csrf) => fetch(base + url, {
        method: "POST", headers: {
            "Content-Type": "application/json", Origin: base,
            ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { "X-CSRF-Token": csrf } : {})
        }, body: JSON.stringify(body || {})
    });
    try {
        await adminPool.query(`CREATE SCHEMA "${schema}"`);
        pool = new Pool({ options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 });
        await pool.query(fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8"));
        await pool.query(fs.readFileSync(path.join(__dirname, "../database/migrations/002-admin-panel.sql"), "utf8"));
        const hash = await hashPassword(password);
        await pool.query("INSERT INTO admin_users(username, password_hash) VALUES ('prueba', $1)", [hash]);
        const reservation = await createPostgresStore(pool).create("2026-11-15", "2026-11-18", {
            name: "Huésped ficticio <b>texto</b>", email: "ficticio@example.com", phone: null
        });
        await start();
        assert.equal((await get("/api/admin/reservas")).status, 401);
        assert.equal((await post(`/api/admin/reservas/${reservation.id}/cancelar`)).status, 401);
        assert.equal((await post("/api/admin/login", { username: "prueba", password: "incorrecta" })).status, 401);
        const login = await post("/api/admin/login", { username: "prueba", password });
        assert.equal(login.status, 200);
        const setCookie = login.headers.get("set-cookie");
        assert.match(setCookie, /HttpOnly/i);
        assert.match(setCookie, /SameSite=Strict/i);
        assert.match(setCookie, /Path=\/api\/admin/);
        assert.equal(setCookie.includes(password), false);
        const cookie = setCookie.split(";")[0];
        const data = await login.json();
        assert.equal(data.username, "prueba");
        assert.match(data.csrfToken, /^[a-f0-9]{64}$/);
        assert.equal(JSON.stringify(data).includes(hash), false);
        const list = await get("/api/admin/reservas", cookie);
        assert.equal(list.status, 200);
        assert.equal(list.headers.get("cache-control"), "no-store");
        const privateData = await list.json();
        assert.equal(privateData.reservations[0].guestEmail, "ficticio@example.com");
        assert.equal(privateData.total, 1);
        const publicData = await (await get("/api/reservas")).text();
        assert.equal(publicData.includes("ficticio"), false);
        assert.equal((await get("/api/admin/reservas?limit=1000", cookie)).status, 400);
        const cancelPath = `/api/admin/reservas/${reservation.id}/cancelar`;
        assert.equal((await post(cancelPath, {}, cookie)).status, 403);
        assert.equal((await post(cancelPath, {}, cookie, "0".repeat(64))).status, 403);
        assert.equal((await (await get("/api/reservas")).json()).length, 1);
        // La sesión sobrevive a una nueva instancia del servidor con la misma clave.
        await stop();
        await start();
        assert.equal((await get("/api/admin/session", cookie)).status, 200);
        assert.equal((await post(cancelPath, {}, cookie, data.csrfToken)).status, 200);
        assert.equal((await (await get("/api/reservas")).json()).length, 0);
        assert.equal((await post(cancelPath, {}, cookie, data.csrfToken)).status, 200);
        assert.equal((await pool.query("SELECT count(*)::integer AS total FROM admin_events")).rows[0].total, 1);
        assert.equal((await (await get("/api/admin/reservas?status=cancelled", cookie)).json()).total, 1);
        const malformed = await post("/api/admin/reservas/no-valido/cancelar", {}, cookie, data.csrfToken);
        assert.equal(malformed.status, 400);
        const missing = await post(`/api/admin/reservas/${randomUUID()}/cancelar`, {}, cookie, data.csrfToken);
        assert.equal(missing.status, 404);
        const confirmed = await pool.query("INSERT INTO reservations(check_in, check_out, status) VALUES ('2026-12-01', '2026-12-02', 'confirmed') RETURNING id");
        assert.equal((await post(`/api/admin/reservas/${confirmed.rows[0].id}/cancelar`, {}, cookie, data.csrfToken)).status, 409);
        assert.equal((await post("/api/admin/logout", {}, cookie, data.csrfToken)).status, 200);
        assert.equal((await get("/api/admin/reservas", cookie)).status, 401);
        const relogin = await post("/api/admin/login", { username: "prueba", password });
        const newCookie = relogin.headers.get("set-cookie").split(";")[0];
        assert.notEqual(cookie, newCookie);
        await pool.query("UPDATE admin_sessions SET expire = CURRENT_TIMESTAMP - INTERVAL '1 hour'");
        assert.equal((await get("/api/admin/reservas", newCookie)).status, 401);
        // Cuenta deshabilitada: tampoco puede seguir utilizando una sesión existente.
        const finalLogin = await post("/api/admin/login", { username: "prueba", password });
        const finalCookie = finalLogin.headers.get("set-cookie").split(";")[0];
        await pool.query("UPDATE admin_users SET active = FALSE");
        assert.equal((await get("/api/admin/reservas", finalCookie)).status, 401);
        // Limitación del login se mide en otra instancia para no contar los accesos válidos anteriores.
        await stop();
        await start();
        for (let i = 0; i < 5; i++) assert.equal((await post("/api/admin/login", { username: "prueba", password: "incorrecta" })).status, 401);
        assert.equal((await post("/api/admin/login", { username: "prueba", password: "incorrecta" })).status, 429);
    } finally {
        await stop();
        if (pool) await pool.end();
        await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await adminPool.end();
    }
});
