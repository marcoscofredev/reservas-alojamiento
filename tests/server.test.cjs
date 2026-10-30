const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../server");
const { createMemoryStore } = require("../reservation-store");

async function start(t, options = {}) {
    const app = createApp({
        store: createMemoryStore([
            { checkIn: "2026-11-10", checkOut: "2026-11-15" },
            { checkIn: "2026-11-20", checkOut: "2026-11-25" }
        ]),
        now: () => new Date(2026, 9, 28, 12), ...options
    });
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    return {
        get: (path) => fetch(base + path),
        post: (body) => fetch(base + "/api/reservas", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guest: { name: "Huésped de prueba", email: "huesped@example.com", phone: "" }, ...body })
        }),
        rawPost: (body, type) => fetch(base + "/api/reservas", {
            method: "POST", headers: { "Content-Type": type }, body
        })
    };
}
test("La consulta HTTP calcula noches libres y detecta las ocupadas", async t => {
    const api = await start(t);
    const free = await api.get("/api/disponibilidad?checkIn=2026-11-15&checkOut=2026-11-18");
    assert.deepEqual(await free.json(), { available: true, nights: 3, demo: true });
    const occupied = await api.get("/api/disponibilidad?checkIn=2026-11-21&checkOut=2026-11-24");
    assert.deepEqual(await occupied.json(), { available: false, nights: 3, demo: true });
    assert.equal(free.headers.get("cache-control"), "no-store");
});
test("La API rechaza fechas inexistentes, sin completar, fuera de rango y parámetros repetidos", async t => {
    const api = await start(t);
    for (const path of ["", "?checkIn=2026-11-15", "?checkIn=2026-11-20&checkOut=2026-11-19",
        "?checkIn=2026-02-30&checkOut=2026-03-02", "?checkIn=2026-10-27&checkOut=2026-11-01",
        "?checkIn=2027-10-28&checkOut=2027-10-29", "?checkIn=2026-11-15&checkIn=2026-11-16&checkOut=2026-11-18"]) {
        const response = await api.get("/api/disponibilidad" + path);
        assert.equal(response.status, 400);
        assert.equal(typeof (await response.json()).error, "string");
    }
});
test("Crea una reserva simulada y luego bloquea sus noches", async t => {
    const api = await start(t);
    const response = await api.post({ checkIn: "2026-11-15", checkOut: "2026-11-18" });
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.equal(data.demo, true);
    assert.equal(data.nights, 3);
    assert.equal(data.reservation.status, "demo");
    assert.equal(typeof data.reservation.id, "string");
    const reservations = await (await api.get("/api/reservas")).json();
    assert.equal(reservations.length, 3);
    assert.deepEqual(reservations[2], { checkIn: "2026-11-15", checkOut: "2026-11-18" });
    const check = await (await api.get("/api/disponibilidad?checkIn=2026-11-16&checkOut=2026-11-19")).json();
    assert.equal(check.available, false);
    assert.equal((await api.post({ checkIn: "2026-11-18", checkOut: "2026-11-20" })).status, 201);
});
test("Vuelve a comprobar disponibilidad al crear, aunque antes estuviera libre", async t => {
    const api = await start(t);
    const dates = { checkIn: "2026-11-15", checkOut: "2026-11-18" };
    assert.equal((await (await api.get("/api/disponibilidad?checkIn=2026-11-15&checkOut=2026-11-18")).json()).available, true);
    assert.equal((await api.post(dates)).status, 201);
    assert.equal((await api.post(dates)).status, 409);
});
test("Dos solicitudes simultáneas no crean dos reservas para las mismas noches en esta instancia", async t => {
    const api = await start(t);
    const dates = { checkIn: "2026-12-01", checkOut: "2026-12-04" };
    const responses = await Promise.all([api.post(dates), api.post(dates)]);
    assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
    assert.equal((await (await api.get("/api/reservas")).json()).length, 3);
});
test("Solicitudes inválidas no alteran las reservas", async t => {
    const api = await start(t);
    for (const body of [{}, [], { checkIn: 12, checkOut: "2026-11-18" },
        { checkIn: "2026-11-18", checkOut: "2026-11-18" },
        { checkIn: "2026-02-30", checkOut: "2026-03-02" }]) {
        assert.equal((await api.post(body)).status, 400);
    }
    assert.equal((await api.rawPost("{", "application/json")).status, 400);
    assert.equal((await api.rawPost("texto", "text/plain")).status, 415);
    assert.equal((await api.post({ checkIn: "2026-11-15", checkOut: "2026-11-18", extra: "x".repeat(5000) })).status, 413);
    assert.equal((await (await api.get("/api/reservas")).json()).length, 2);
});
test("Las pruebas en memoria usan datos independientes de PostgreSQL", async t => {
    const first = await start(t);
    await first.post({ checkIn: "2026-11-15", checkOut: "2026-11-18" });
    const second = await start(t);
    assert.equal((await (await second.get("/api/reservas")).json()).length, 2);
});
test("La web y sus archivos cargan; los archivos privados del proyecto no se publican", async t => {
    const api = await start(t);
    assert.equal((await api.get("/")).status, 200);
    assert.equal((await api.get("/script.js")).status, 200);
    assert.equal((await api.get("/style.css")).status, 200);
    assert.equal((await api.get("/availability.js")).status, 200);
    assert.equal((await api.get("/server.js")).status, 404);
    assert.equal((await api.get("/package.json")).status, 404);
    assert.equal((await api.get("/.env")).status, 404);
    assert.equal((await api.get("/database.js")).status, 404);
    assert.equal((await api.get("/reservation-store.js")).status, 404);
    assert.equal((await api.get("/guest.js")).status, 404);
});

test("Valida los datos del huésped y no los publica en ninguna respuesta", async t => {
    const api = await start(t);
    const dates = { checkIn: "2026-12-10", checkOut: "2026-12-12" };
    for (const guest of [null, {}, { name: "Ana", email: "mal", phone: "" },
        { name: "Ana", email: "ana@example.com", phone: "123" }]) {
        assert.equal((await api.post({ ...dates, guest })).status, 400);
    }
    assert.equal((await (await api.get("/api/reservas")).json()).length, 2);
    const response = await api.post({ ...dates, guest: { name: "Ana Cofré", email: "ana@example.com" } });
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.deepEqual(Object.keys(data.reservation).sort(), ["checkIn", "checkOut", "id", "status"]);
    const publicList = await (await api.get("/api/reservas")).text();
    assert.equal(publicList.includes("Ana"), false);
    assert.equal(publicList.includes("example.com"), false);
    assert.equal(publicList.includes("guest"), false);
});

test("Si el almacenamiento falla, la API responde con error y no con fechas libres", async t => {
    const fail = async () => { throw Object.assign(new Error("detalle privado"), { code: "ECONNREFUSED" }); };
    const api = await start(t, { store: { list: fail, isAvailable: fail, create: fail } });
    for (const response of [
        await api.get("/api/reservas"),
        await api.get("/api/disponibilidad?checkIn=2026-11-15&checkOut=2026-11-18"),
        await api.post({ checkIn: "2026-11-15", checkOut: "2026-11-18" })
    ]) {
        assert.equal(response.status, 503);
        const data = await response.json();
        assert.equal(data.available, undefined);
        assert.equal(data.error.includes("detalle privado"), false);
    }
});
