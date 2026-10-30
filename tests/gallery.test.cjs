const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { once } = require("node:events");
const { createApp } = require("../server");
const { createMemoryStore } = require("../reservation-store");

function gallery({ supported = true } = {}) {
    const document = { activeElement: null };
    class Element {
        constructor() { this.handlers = {}; this.dataset = {}; this.disabled = false; this.textContent = ""; this.alt = ""; }
        addEventListener(type, callback) { this.handlers[type] = callback; }
        focus() { document.activeElement = this; }
        removeAttribute(name) { delete this[name]; }
        click(event = {}) {
            if (!this.disabled) this.handlers.click?.({ target: this, preventDefault() {}, ...event });
        }
    }
    const ids = ["gallery-dialog", "gallery-image", "gallery-caption", "gallery-counter", "gallery-previous", "gallery-next", "gallery-close", "gallery-error"];
    const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
    const links = Array.from({ length: 3 }, (_, index) => {
        const link = new Element();
        link.href = `http://localhost/imagenes/galeria/foto-${index}.jpg`;
        link.dataset.caption = `Ambiente ${index}`;
        link.querySelector = () => ({ alt: `Foto real ${index}` });
        return link;
    });
    const dialog = elements["gallery-dialog"];
    if (supported) dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; dialog.handlers.close?.(); };
    const classes = new Set();
    document.body = { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } };
    document.getElementById = id => elements[id];
    document.querySelectorAll = () => links;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../gallery.js"), "utf8"), { document });
    return { document, elements, links, dialog, classes };
}

test("La galería abre la foto elegida y permite recorrerla con teclado", () => {
    const { elements, links, dialog } = gallery();
    links[0].click();
    assert.equal(dialog.open, true);
    assert.equal(elements["gallery-image"].alt, "Foto real 0");
    assert.equal(elements["gallery-counter"].textContent, "1 de 3");
    assert.equal(elements["gallery-previous"].disabled, true);
    dialog.handlers.keydown({ key: "ArrowRight", preventDefault() {} });
    assert.equal(elements["gallery-caption"].textContent, "Ambiente 1");
    elements["gallery-next"].click();
    assert.equal(elements["gallery-counter"].textContent, "3 de 3");
    assert.equal(elements["gallery-next"].disabled, true);
    dialog.handlers.keydown({ key: "ArrowRight", preventDefault() {} });
    assert.equal(elements["gallery-counter"].textContent, "3 de 3");
    dialog.handlers.keydown({ key: "ArrowLeft", preventDefault() {} });
    assert.equal(elements["gallery-counter"].textContent, "2 de 3");
});

test("Al cerrar limpia la foto, recupera el foco y permite abrir enlaces en otra pestaña", () => {
    const { document, elements, links, dialog, classes } = gallery();
    links[1].click();
    assert.equal(classes.has("gallery-is-open"), true);
    assert.equal(document.activeElement, elements["gallery-close"]);
    elements["gallery-close"].click();
    assert.equal(dialog.open, false);
    assert.equal(classes.has("gallery-is-open"), false);
    assert.equal(elements["gallery-image"].src, undefined);
    assert.equal(document.activeElement, links[1]);
    links[0].click({ ctrlKey: true, preventDefault() { assert.fail("No debe impedir abrir otra pestaña"); } });
    assert.equal(dialog.open, false);
    const fallback = gallery({ supported: false });
    assert.equal(fallback.links[0].handlers.click, undefined);
});

test("Maneja fallos de imagen y distingue un gesto horizontal de uno vertical", () => {
    const { elements, links, dialog } = gallery();
    links[1].click();
    const image = elements["gallery-image"];
    image.handlers.error();
    assert.match(elements["gallery-error"].textContent, /No pudimos cargar/);
    image.handlers.touchstart({ touches: [{ clientX: 200, clientY: 100 }] });
    image.handlers.touchend({ changedTouches: [{ clientX: 100, clientY: 110 }] });
    assert.equal(elements["gallery-counter"].textContent, "3 de 3");
    assert.equal(elements["gallery-error"].textContent, "");
    image.handlers.touchstart({ touches: [{ clientX: 100, clientY: 100 }] });
    image.handlers.touchend({ changedTouches: [{ clientX: 120, clientY: 250 }] });
    assert.equal(elements["gallery-counter"].textContent, "3 de 3");
    dialog.click();
    assert.equal(dialog.open, false);
});

test("Las 14 fotos y sus miniaturas existen y se sirven como imágenes", async t => {
    const app = createApp({ store: createMemoryStore() });
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    const html = await (await fetch(base)).text();
    const imagePaths = Array.from(html.matchAll(/href="(imagenes\/galeria\/[^"]+\.jpg)" data-gallery/g), match => match[1]);
    assert.equal(imagePaths.length, 14);
    assert.equal(new Set(imagePaths).size, 14);
    for (const imagePath of imagePaths) {
        for (const url of [imagePath, imagePath.replace(".jpg", "-thumb.jpg")]) {
            const response = await fetch(`${base}/${url}`);
            assert.equal(response.status, 200, url);
            assert.match(response.headers.get("content-type"), /^image\/jpeg/);
            assert.ok((await response.arrayBuffer()).byteLength > 1000);
        }
    }
    const script = await fetch(base + "/gallery.js");
    assert.equal(script.status, 200);
    assert.equal(/innerHTML|eval\s*\(/.test(await script.text()), false);
});
