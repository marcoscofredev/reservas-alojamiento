const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createApp } = require("../server");
const { createMemoryStore } = require("../reservation-store");

async function start(t) {
    const server = createApp({ store: createMemoryStore(), now: () => new Date(2026, 9, 29, 12) }).listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    return {
        base,
        get: (url, headers = {}) => fetch(base + url, { headers }),
        post: (body = {}, headers = {}) => fetch(base + "/api/reservas", {
            method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body)
        })
    };
}

test("Las cabeceras bloquean scripts ajenos y marcos, conservando el mapa", async t => {
    const api = await start(t);
    const response = await api.get("/");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    const policy = response.headers.get("content-security-policy");
    assert.match(policy, /script-src 'self';/);
    assert.match(policy, /style-src 'self';/);
    assert.match(policy, /frame-src https:\/\/www\.google\.com(?:;|$)/);
    assert.match(policy, /frame-ancestors 'none';/);
    assert.equal(policy.includes("unsafe-inline"), false);
    assert.equal(policy.includes("upgrade-insecure-requests"), false);
    const html = await response.text();
    assert.equal(/\sstyle\s*=|\son\w+\s*=/i.test(html), false);
    assert.equal((await api.get("/script.js")).status, 200);
    assert.equal((await api.get("/style.css")).status, 200);
});

test("No publica configuración, módulos privados, pruebas ni archivos fuera de imágenes", async t => {
    const api = await start(t);
    for (const url of ["/.env", "/.env.example", "/.git/config", "/database.js", "/security.js", "/guest.js",
        "/admin-routes.js", "/admin-password.js", "/admin-store.js",
        "/package-lock.json", "/tests/server.test.cjs", "/database/schema.sql", "/docs/datos-del-huesped.md",
        "/imagenes/%2e%2e%2f.env", "/api/admin/reservas"]) {
        const response = await api.get(url);
        assert.notEqual(response.status, 200, url);
        const body = await response.text();
        assert.equal(body.includes("PGPASSWORD"), false, url);
        assert.equal(body.includes("at Layer"), false, url);
        assert.equal(body.includes("Error:"), false, url);
    }
});

test("Rechaza escrituras desde otro sitio y acepta el origen local exacto", async t => {
    const api = await start(t);
    for (const headers of [{ Origin: "https://otro.example" }, { Origin: "null" }, { "Sec-Fetch-Site": "cross-site" }]) {
        assert.equal((await api.post({}, headers)).status, 403);
    }
    // El origen válido pasa a la validación normal del cuerpo, no crea una reserva vacía.
    assert.equal((await api.post({}, { Origin: api.base, "Sec-Fetch-Site": "same-origin" })).status, 400);
    const foreignHostStatus = await new Promise((resolve, reject) => {
        const request = http.get(api.base + "/", { headers: { Host: "ajeno.example" } }, response => {
            response.resume();
            resolve(response.statusCode);
        });
        request.on("error", reject);
    });
    assert.equal(foreignHostStatus, 400);
});

test("Limita los intentos repetidos de reserva sin crear datos", async t => {
    const api = await start(t);
    for (let attempt = 0; attempt < 10; attempt++) assert.equal((await api.post()).status, 400);
    const response = await api.post();
    assert.equal(response.status, 429);
    assert.ok(response.headers.get("retry-after"));
    assert.equal(typeof (await response.json()).error, "string");
    assert.deepEqual(await (await api.get("/api/reservas")).json(), []);
});

test("Limita consultas repetidas y evita caché incluso en errores", async t => {
    const api = await start(t);
    for (let attempt = 0; attempt < 120; attempt++) {
        const response = await api.get("/api/disponibilidad");
        assert.equal(response.status, 400);
        assert.equal(response.headers.get("cache-control"), "no-store");
    }
    const response = await api.get("/api/disponibilidad");
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("cache-control"), "no-store");
});

test("No permite elegir un estado confirmado ni devolver datos del huésped", async t => {
    const api = await start(t);
    const response = await api.post({
        checkIn: "2026-12-01", checkOut: "2026-12-02", status: "confirmed", id: "elegido-por-cliente",
        guest: { name: "O'Connor <b>prueba</b>", email: "prueba@example.com", phone: "" }
    });
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.equal(data.reservation.status, "demo");
    assert.notEqual(data.reservation.id, "elegido-por-cliente");
    assert.equal(JSON.stringify(data).includes("O'Connor"), false);
    const list = await (await api.get("/api/reservas")).json();
    assert.deepEqual(list, [{ checkIn: "2026-12-01", checkOut: "2026-12-02" }]);
    const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
    assert.equal(/innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(/.test(script), false);
});
