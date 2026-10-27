const { test } = require("node:test");
const assert = require("node:assert/strict");
const dates = require("../availability.js");

const reservations = [
    { checkIn: "2026-11-10", checkOut: "2026-11-15" },
    { checkIn: "2026-11-20", checkOut: "2026-11-25" }
];
const limits = { min: "2026-10-27", max: "2027-10-27" };

test("Rechaza estadías parciales, idénticas y que contienen reservas", () => {
    for (const [start, end] of [["2026-11-12", "2026-11-16"], ["2026-11-08", "2026-11-12"],
        ["2026-11-10", "2026-11-15"], ["2026-11-08", "2026-11-27"], ["2026-11-21", "2026-11-24"]]) {
        assert.ok(dates.hasOverlap(start, end, reservations));
    }
});
test("Permite llegar y salir el mismo día que otra reserva cambia de huésped", () => {
    for (const [start, end] of [["2026-11-08", "2026-11-10"], ["2026-11-15", "2026-11-20"], ["2026-11-25", "2026-11-28"]]) {
        assert.equal(dates.validate(start, end, reservations, limits), "");
    }
});
test("Una noche ocupada excluye el día de salida", () => {
    assert.equal(dates.isOccupied("2026-11-10", reservations), true);
    assert.equal(dates.isOccupied("2026-11-14", reservations), true);
    assert.equal(dates.isOccupied("2026-11-15", reservations), false);
});
test("Rechaza campos vacíos, fechas inexistentes y orden incorrecto", () => {
    for (const [start, end] of [["", ""], ["2026-11-15", ""], ["2026-02-30", "2026-03-02"],
        ["texto", "2026-11-15"], ["2026-11-12", "2026-11-12"], ["2026-11-15", "2026-11-12"]]) {
        assert.ok(dates.validate(start, end, reservations, limits));
    }
});
test("Limita ambos extremos y reserva al menos una noche dentro de la ventana", () => {
    assert.ok(dates.validate("2026-10-26", "2026-10-28", reservations, limits));
    assert.ok(dates.validate("2027-10-27", "2027-10-28", reservations, limits));
    assert.equal(dates.validate("2027-10-26", "2027-10-27", reservations, limits), "");
    assert.equal(dates.canStart("2027-10-27", reservations, limits), false);
    assert.equal(dates.canStart("2026-11-10", reservations, limits), false);
});
test("La ventana usa la fecha local y ajusta 29 de febrero", () => {
    assert.deepEqual(dates.getDateLimits(new Date(2028, 1, 29, 23, 30)), { min: "2028-02-29", max: "2029-02-28" });
    assert.deepEqual(dates.getDateLimits(new Date(2027, 9, 27, 0, 30)), { min: "2027-10-27", max: "2028-10-27" });
});
test("Cuenta noches a través de meses, años, años bisiestos y cambios de horario", () => {
    assert.equal(dates.nights("2026-11-15", "2026-11-20"), 5);
    assert.equal(dates.nights("2026-12-31", "2027-01-01"), 1);
    assert.equal(dates.nights("2028-02-28", "2028-03-01"), 2);
    assert.equal(dates.nights("2026-03-07", "2026-03-09"), 2);
    assert.equal(dates.addDays("2028-02-28", 1), "2028-02-29");
});
