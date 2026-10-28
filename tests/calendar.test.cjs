// Prueba de integración de la selección, sin abrir un navegador ni cargar Maps.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const rules = require("../availability");

class Element {
    constructor() {
        this.children = [];
        this.handlers = {};
        this.dataset = {};
        this.attributes = {};
        this.value = "";
        this.textContent = "";
        this.classes = new Set();
        this.classList = { toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
    }
    addEventListener(type, callback) { this.handlers[type] = callback; }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
    focus() { this.focused = true; }
    click() { if (!this.disabled) return this.handlers.click?.(); }
    querySelector(selector) {
        const date = selector.match(/data-date="([^"]+)"/)?.[1];
        const walk = node => node.dataset.date === date ? node : node.children.map(walk).find(Boolean);
        return walk(this);
    }
}
async function loadCalendar(options = {}) {
    const elements = Object.fromEntries(["resultado-disponibilidad",
        "calendario", "mes-calendario", "dias-calendario", "ayuda-calendario", "mes-anterior", "mes-siguiente", "limpiar-fechas", "form-contacto", "reserva-acciones", "crear-reserva-prueba", "resultado-reserva"].map(id => [id, new Element()]));
    elements["reserva-acciones"].hidden = true;
    class FixedDate extends Date {
        constructor(...args) { super(...(args.length ? args : [2026, 9, 27, 12])); }
    }
    const windowHandlers = {};
    let resolveFetch;
    let resolvePost;
    const requests = [];
    const pendingConsultations = [];
    const storedReservations = options.data ?? [
        { checkIn: "2026-11-10", checkOut: "2026-11-15" },
        { checkIn: "2026-11-20", checkOut: "2026-11-25" }
    ];
    const context = vm.createContext({
        Date: FixedDate, Intl, URLSearchParams,
        console: { error() {} },
        fetch: async (url, config = {}) => {
            requests.push({ url, method: config.method || "GET" });
            if (options.networkFetch) return options.networkFetch(url, config);
            if (url.startsWith("/api/disponibilidad?")) {
                if (options.deferredConsultations) await new Promise(resolve => pendingConsultations.push(resolve));
                if (options.availabilityFailure) throw new Error("Conexión interrumpida");
                const query = new URL(url, "http://localhost").searchParams;
                const checkIn = query.get("checkIn"), checkOut = query.get("checkOut");
                return { ok: true, json: async () => options.invalidAvailability ?? {
                    available: options.availableOverride ?? !rules.hasOverlap(checkIn, checkOut, storedReservations),
                    nights: rules.nights(checkIn, checkOut), demo: true
                } };
            }
            if (config.method === "POST") {
                if (options.deferredPost) await new Promise(resolve => { resolvePost = resolve; });
                if (options.postFailure) throw new Error("Conexión interrumpida");
                const dates = JSON.parse(config.body);
                const conflict = options.postConflict || rules.hasOverlap(dates.checkIn, dates.checkOut, storedReservations);
                if (conflict) {
                    if (options.postConflict) storedReservations.push(dates);
                    return { ok: false, status: 409, json: async () => ({ error: "Fechas ocupadas" }) };
                }
                storedReservations.push(dates);
                return { ok: true, status: 201, json: async () => ({
                    demo: true, reservation: { id: "demo-123", ...dates, status: "demo" }
                }) };
            }
            if (options.deferred) await new Promise(resolve => { resolveFetch = resolve; });
            if (options.failure) throw new Error("Servidor desconectado");
            if (options.refreshFailure && requests.some(request => request.method === "POST")) throw new Error("No se pudo actualizar");
            return { ok: !options.httpError, json: async () => JSON.parse(JSON.stringify(storedReservations)) };
        },
        document: { getElementById: id => elements[id], createElement: () => new Element() },
        window: { addEventListener(type, callback) { windowHandlers[type] = callback; } }
    });
    for (const filename of ["availability.js", "script.js"]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, "..", filename), "utf8"), context);
    }
    if (!options.deferred) await new Promise(resolve => setImmediate(resolve));
    const day = date => elements["dias-calendario"].querySelector(`[data-date="${date}"]`);
    return { elements, day, selection: vm.runInContext("selection", context), windowHandlers, requests,
        settle: () => new Promise(resolve => setImmediate(resolve)),
        pendingConsultations,
        finishPost: () => resolvePost(),
        finishLoading: async () => { resolveFetch(); await new Promise(resolve => setImmediate(resolve)); } };
}

test("Se abre en el mes actual, limita la navegación y marca el pasado", async () => {
    const { elements, day, selection, settle } = await loadCalendar();
    assert.equal(elements.calendario.hidden, false);
    assert.equal(elements["mes-anterior"].disabled, true);
    assert.equal(day("2026-10-26").disabled, true);
    assert.equal(day("2026-10-27").disabled, false);


});
test("Marca noches ocupadas y permite seleccionar entrada al finalizar una reserva", async () => {
    const { elements, day, selection, settle } = await loadCalendar();
    elements["mes-siguiente"].click();
    assert.equal(day("2026-11-10").disabled, true);
    assert.ok(day("2026-11-10").classes.has("is-occupied"));
    day("2026-11-15").click();
    await settle();
    assert.equal(selection.checkIn, "2026-11-15");
    assert.equal(selection.checkOut, "");
    day("2026-11-18").click();
    await settle();
    assert.equal(selection.checkOut, "2026-11-18");

    assert.match(elements["resultado-disponibilidad"].textContent, /3 noches/);
});
test("Permite salir al comenzar otra reserva, pero impide saltar sobre noches ocupadas", async () => {
    const { elements, day, selection, settle } = await loadCalendar();
    elements["mes-siguiente"].click();
    day("2026-11-08").click();
    await settle();
    assert.equal(day("2026-11-10").disabled, false);
    assert.ok(day("2026-11-10").classes.has("is-exit-only"));
    assert.equal(day("2026-11-11").disabled, true);
    assert.equal(day("2026-11-16").disabled, true);
    day("2026-11-10").click();
    await settle();
    assert.equal(selection.checkOut, "2026-11-10");

    assert.match(elements["resultado-disponibilidad"].textContent, /2 noches/);
    elements["limpiar-fechas"].click();
    assert.equal(selection.checkIn, "");
    assert.equal(selection.checkOut, "");
    assert.equal(elements["resultado-disponibilidad"].textContent, "");
});
test("Una nueva entrada limpia el resultado anterior sin requerir un formulario", async () => {
    const { elements, day, selection, settle } = await loadCalendar();
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    await settle();
    day("2026-11-18").click();
    await settle();
    assert.equal(elements["resultado-disponibilidad"].dataset.state, "success");
    assert.match(elements["resultado-disponibilidad"].textContent, /Entrada: .*15.*Salida: .*18/);
    day("2026-11-25").click();
    await settle();
    assert.equal(selection.checkIn, "2026-11-25");
    assert.equal(selection.checkOut, "");
    assert.equal(elements["resultado-disponibilidad"].textContent, "");
});
test("Selecciona una estadía que cruza de mes y llega al límite de un año", async () => {
    const { elements, day, selection, settle } = await loadCalendar();
    day("2026-10-30").click();
    await settle();
    elements["mes-siguiente"].click();
    day("2026-11-02").click();
    await settle();
    assert.equal(selection.checkOut, "2026-11-02");
    elements["limpiar-fechas"].click();
    for (let i = 0; i < 11; i++) elements["mes-siguiente"].click();
    assert.equal(elements["mes-siguiente"].disabled, true);
    assert.equal(day("2027-10-28").disabled, true);
    day("2027-10-26").click();
    await settle();
    day("2027-10-27").click();
    await settle();

    assert.match(elements["resultado-disponibilidad"].textContent, /1 noche/);
});

test("Usa los datos del servidor y no mantiene una copia de las reservas anteriores", async () => {
    const { elements, day, settle } = await loadCalendar({ data: [{ checkIn: "2026-11-16", checkOut: "2026-11-19" }] });
    elements["mes-siguiente"].click();
    assert.equal(day("2026-11-10").disabled, false);
    assert.equal(day("2026-11-16").disabled, true);
    assert.equal(day("2026-11-19").disabled, false);
});
test("Mientras carga, no ofrece un calendario vacío ni borra el mensaje al mostrar la página", async () => {
    const { elements, windowHandlers, finishLoading } = await loadCalendar({ deferred: true });
    assert.equal(elements.calendario.hidden, true);
    assert.match(elements["resultado-disponibilidad"].textContent, /Cargando/);
    windowHandlers.pageshow();
    assert.match(elements["resultado-disponibilidad"].textContent, /Cargando/);
    await finishLoading();
    assert.equal(elements.calendario.hidden, false);
});
test("Si falla la red, HTTP o los datos, oculta el calendario y conserva el error", async () => {
    for (const options of [{ failure: true }, { httpError: true }, { data: {} },
        { data: [null] }, { data: [{ checkIn: "2026-02-30", checkOut: "2026-03-02" }] },
        { data: [{ checkIn: "2026-11-20", checkOut: "2026-11-15" }] }]) {
        const { elements, windowHandlers } = await loadCalendar(options);
        assert.equal(elements.calendario.hidden, true);
        assert.equal(elements["resultado-disponibilidad"].dataset.state, "error");
        windowHandlers.pageshow();
        assert.match(elements["resultado-disponibilidad"].textContent, /No pudimos cargar/);
    }
});
test("Una respuesta vacía válida permite elegir fechas", async () => {
    const { elements, day, settle } = await loadCalendar({ data: [] });
    elements["mes-siguiente"].click();
    assert.equal(day("2026-11-10").disabled, false);
    assert.equal(elements.calendario.hidden, false);
});

test("Solo ofrece crear una reserva después de consultar al servidor, sin crearla automáticamente", async () => {
    const { elements, day, requests, settle } = await loadCalendar();
    assert.equal(elements["reserva-acciones"].hidden, true);
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    await settle();
    assert.equal(elements["reserva-acciones"].hidden, false);
    assert.ok(requests.some(request => request.url.startsWith("/api/disponibilidad?")));
    assert.equal(requests.filter(request => request.method === "POST").length, 0);
});
test("La selección crea una reserva simulada, refresca las noches y limpia la selección", async () => {
    const { elements, day, selection, settle } = await loadCalendar();
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    await settle();
    await elements["crear-reserva-prueba"].click();
    assert.equal(elements["resultado-reserva"].dataset.state, "success");
    assert.match(elements["resultado-reserva"].textContent, /Reserva guardada/);
    assert.equal(day("2026-11-15").disabled, true);
    assert.equal(day("2026-11-18").disabled, false);
    assert.equal(selection.checkIn, "");
    assert.equal(selection.checkOut, "");
    assert.equal(elements["reserva-acciones"].hidden, true);
});
test("Un doble clic envía una sola solicitud y desactiva el calendario durante el envío", async () => {
    const { elements, day, requests, settle, finishPost } = await loadCalendar({ deferredPost: true });
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    await settle();
    const pending = elements["crear-reserva-prueba"].click();
    elements["crear-reserva-prueba"].click();
    assert.equal(elements.calendario.inert, true);
    assert.equal(elements["crear-reserva-prueba"].disabled, true);
    assert.equal(requests.filter(request => request.method === "POST").length, 1);
    finishPost();
    await pending;
    assert.equal(elements.calendario.inert, false);
});
test("Si las noches se ocuparon después de consultar, informa el conflicto y actualiza el calendario", async () => {
    const { elements, day, settle } = await loadCalendar({ postConflict: true });
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    await settle();
    await elements["crear-reserva-prueba"].click();
    assert.equal(elements["resultado-reserva"].dataset.state, "error");
    assert.match(elements["resultado-reserva"].textContent, /se ocuparon/);
    assert.equal(day("2026-11-15").disabled, true);
});
test("Ante fallos de consulta, datos incoherentes o fechas ocupadas no permite crear", async () => {
    for (const options of [{ availabilityFailure: true }, { availableOverride: false },
        { invalidAvailability: { available: true, nights: 99, demo: true } },
        { invalidAvailability: { available: true, nights: 3 } }]) {
        const { elements, day, settle } = await loadCalendar(options);
        elements["mes-siguiente"].click();
        day("2026-11-15").click();
        day("2026-11-18").click();
        await settle();
        assert.equal(elements["resultado-disponibilidad"].dataset.state, "error");
        assert.equal(elements["reserva-acciones"].hidden, true);
    }
});
test("Un fallo al enviar no muestra una confirmación falsa ni deja el calendario bloqueado", async () => {
    const { elements, day, settle } = await loadCalendar({ postFailure: true });
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    await settle();
    await elements["crear-reserva-prueba"].click();
    assert.equal(elements["resultado-reserva"].dataset.state, "error");
    assert.equal(elements["reserva-acciones"].hidden, true);
    assert.equal(elements.calendario.inert, false);
});
test("Las respuestas atrasadas no reemplazan la selección más reciente", async () => {
    const { elements, day, pendingConsultations, settle } = await loadCalendar({ deferredConsultations: true });
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    day("2026-11-25").click();
    day("2026-11-28").click();
    pendingConsultations[1]();
    await settle();
    const latestMessage = elements["resultado-disponibilidad"].textContent;
    assert.match(latestMessage, /Entrada: .*25/);
    pendingConsultations[0]();
    await settle();
    assert.equal(elements["resultado-disponibilidad"].textContent, latestMessage);
});
test("Borrar fechas invalida una consulta pendiente", async () => {
    const { elements, day, pendingConsultations, settle } = await loadCalendar({ deferredConsultations: true });
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    elements["limpiar-fechas"].click();
    pendingConsultations[0]();
    await settle();
    assert.equal(elements["resultado-disponibilidad"].textContent, "");
    assert.equal(elements["reserva-acciones"].hidden, true);
});

test("Si la reserva se creó pero falla la actualización, comunica ambos resultados correctamente", async () => {
    const { elements, day, settle } = await loadCalendar({ refreshFailure: true });
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    await settle();
    await elements["crear-reserva-prueba"].click();
    assert.equal(elements["resultado-reserva"].dataset.state, "success");
    assert.match(elements["resultado-reserva"].textContent, /quedó guardada, pero/);
    assert.equal(elements.calendario.hidden, true);
    assert.equal(elements["reserva-acciones"].hidden, true);
});

test("El recorrido del calendario consulta y crea a través de un servidor HTTP real de prueba", async t => {
    const { once } = require("node:events");
    const { createApp } = require("../server");
    const { createMemoryStore } = require("../reservation-store");
    const store = createMemoryStore([
        { checkIn: "2026-11-10", checkOut: "2026-11-15" },
        { checkIn: "2026-11-20", checkOut: "2026-11-25" }
    ]);
    const server = createApp({ store, now: () => new Date(2026, 9, 27, 12) }).listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    const { elements, day } = await loadCalendar({ networkFetch: (url, config) => fetch(base + url, config) });
    async function waitFor(predicate) {
        for (let i = 0; i < 300; i++) {
            if (predicate()) return;
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        assert.fail("La operación HTTP no completó a tiempo");
    }
    await waitFor(() => elements.calendario.hidden === false);
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    await waitFor(() => elements["reserva-acciones"].hidden === false);
    await elements["crear-reserva-prueba"].click();
    assert.match(elements["resultado-reserva"].textContent, /Reserva guardada/);
    assert.equal(day("2026-11-15").disabled, true);
    const stored = await (await fetch(base + "/api/reservas")).json();
    assert.equal(stored.length, 3);
});
