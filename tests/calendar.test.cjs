// Prueba de integración de la selección, sin abrir un navegador ni cargar Maps.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

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
    click() { if (!this.disabled) this.handlers.click?.(); }
    querySelector(selector) {
        const date = selector.match(/data-date="([^"]+)"/)?.[1];
        const walk = node => node.dataset.date === date ? node : node.children.map(walk).find(Boolean);
        return walk(this);
    }
}
async function loadCalendar(options = {}) {
    const elements = Object.fromEntries(["resultado-disponibilidad",
        "calendario", "mes-calendario", "dias-calendario", "ayuda-calendario", "mes-anterior", "mes-siguiente", "limpiar-fechas", "form-contacto"].map(id => [id, new Element()]));
    class FixedDate extends Date {
        constructor(...args) { super(...(args.length ? args : [2026, 9, 27, 12])); }
    }
    const windowHandlers = {};
    let resolveFetch;
    const context = vm.createContext({
        Date: FixedDate, Intl,
        console: { error() {} },
        fetch: async () => {
            if (options.deferred) await new Promise(resolve => { resolveFetch = resolve; });
            if (options.failure) throw new Error("Servidor desconectado");
            return { ok: !options.httpError, json: async () => options.data ?? [
                { checkIn: "2026-11-10", checkOut: "2026-11-15" },
                { checkIn: "2026-11-20", checkOut: "2026-11-25" }
            ] };
        },
        document: { getElementById: id => elements[id], createElement: () => new Element() },
        window: { addEventListener(type, callback) { windowHandlers[type] = callback; } }
    });
    for (const filename of ["availability.js", "script.js"]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, "..", filename), "utf8"), context);
    }
    if (!options.deferred) await new Promise(resolve => setImmediate(resolve));
    const day = date => elements["dias-calendario"].querySelector(`[data-date="${date}"]`);
    return { elements, day, selection: vm.runInContext("selection", context), windowHandlers,
        finishLoading: async () => { resolveFetch(); await new Promise(resolve => setImmediate(resolve)); } };
}

test("Se abre en el mes actual, limita la navegación y marca el pasado", async () => {
    const { elements, day, selection } = await loadCalendar();
    assert.equal(elements.calendario.hidden, false);
    assert.equal(elements["mes-anterior"].disabled, true);
    assert.equal(day("2026-10-26").disabled, true);
    assert.equal(day("2026-10-27").disabled, false);


});
test("Marca noches ocupadas y permite seleccionar entrada al finalizar una reserva", async () => {
    const { elements, day, selection } = await loadCalendar();
    elements["mes-siguiente"].click();
    assert.equal(day("2026-11-10").disabled, true);
    assert.ok(day("2026-11-10").classes.has("is-occupied"));
    day("2026-11-15").click();
    assert.equal(selection.checkIn, "2026-11-15");
    assert.equal(selection.checkOut, "");
    day("2026-11-18").click();
    assert.equal(selection.checkOut, "2026-11-18");

    assert.match(elements["resultado-disponibilidad"].textContent, /3 noches/);
});
test("Permite salir al comenzar otra reserva, pero impide saltar sobre noches ocupadas", async () => {
    const { elements, day, selection } = await loadCalendar();
    elements["mes-siguiente"].click();
    day("2026-11-08").click();
    assert.equal(day("2026-11-10").disabled, false);
    assert.ok(day("2026-11-10").classes.has("is-exit-only"));
    assert.equal(day("2026-11-11").disabled, true);
    assert.equal(day("2026-11-16").disabled, true);
    day("2026-11-10").click();
    assert.equal(selection.checkOut, "2026-11-10");

    assert.match(elements["resultado-disponibilidad"].textContent, /2 noches/);
    elements["limpiar-fechas"].click();
    assert.equal(selection.checkIn, "");
    assert.equal(selection.checkOut, "");
    assert.equal(elements["resultado-disponibilidad"].textContent, "");
});
test("Una nueva entrada limpia el resultado anterior sin requerir un formulario", async () => {
    const { elements, day, selection } = await loadCalendar();
    elements["mes-siguiente"].click();
    day("2026-11-15").click();
    day("2026-11-18").click();
    assert.equal(elements["resultado-disponibilidad"].dataset.state, "success");
    assert.match(elements["resultado-disponibilidad"].textContent, /Entrada: .*15.*Salida: .*18/);
    day("2026-11-25").click();
    assert.equal(selection.checkIn, "2026-11-25");
    assert.equal(selection.checkOut, "");
    assert.equal(elements["resultado-disponibilidad"].textContent, "");
});
test("Selecciona una estadía que cruza de mes y llega al límite de un año", async () => {
    const { elements, day, selection } = await loadCalendar();
    day("2026-10-30").click();
    elements["mes-siguiente"].click();
    day("2026-11-02").click();
    assert.equal(selection.checkOut, "2026-11-02");
    elements["limpiar-fechas"].click();
    for (let i = 0; i < 11; i++) elements["mes-siguiente"].click();
    assert.equal(elements["mes-siguiente"].disabled, true);
    assert.equal(day("2027-10-28").disabled, true);
    day("2027-10-26").click();
    day("2027-10-27").click();

    assert.match(elements["resultado-disponibilidad"].textContent, /1 noche\./);
});

test("Usa los datos del servidor y no mantiene una copia de las reservas anteriores", async () => {
    const { elements, day } = await loadCalendar({ data: [{ checkIn: "2026-11-16", checkOut: "2026-11-19" }] });
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
    const { elements, day } = await loadCalendar({ data: [] });
    elements["mes-siguiente"].click();
    assert.equal(day("2026-11-10").disabled, false);
    assert.equal(elements.calendario.hidden, false);
});
