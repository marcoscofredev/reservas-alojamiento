const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateGuest } = require("../guest");

test("Normaliza espacios y permite un teléfono opcional", () => {
    assert.deepEqual(validateGuest({ name: "  Ana Cofré  ", email: " ana@example.com ", phone: " " }), {
        guest: { name: "Ana Cofré", email: "ana@example.com", phone: null }
    });
    assert.equal(validateGuest({ name: "Ana", email: "ana@example.com", phone: "+54 (2942) 54-7843" }).error, undefined);
});

test("Rechaza datos faltantes, tipos incorrectos, longitudes y caracteres inválidos", () => {
    const valid = { name: "Ana Cofré", email: "ana@example.com", phone: "" };
    for (const guest of [null, [], "texto", {},
        { ...valid, name: " " }, { ...valid, name: 12 }, { ...valid, name: "x".repeat(121) },
        { ...valid, name: "Ana\nCofré" }, { ...valid, email: "sin-correo" }, { ...valid, email: 12 },
        { ...valid, email: "ana@example.com\r\n" }, { ...valid, phone: 12345 },
        { ...valid, phone: "123" }, { ...valid, phone: "llamame" }, { ...valid, phone: "1".repeat(16) }
    ]) assert.equal(typeof validateGuest(guest).error, "string");
});
