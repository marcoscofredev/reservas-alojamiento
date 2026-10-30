const express = require("express");
const Availability = require("./availability");
const { createPostgresStore } = require("./reservation-store");
const { validateGuest } = require("./guest");
const { configureSecurity } = require("./security");
const { mountAdmin } = require("./admin-routes");

function createApp({ store, admin, now = () => new Date() } = {}) {
    if (!store) {
        const pool = require("./database");
        store = createPostgresStore(pool);
        if (admin === undefined) admin = { pool, secret: process.env.SESSION_SECRET };
    }
    const app = express();
    configureSecurity(app);
    app.use(express.json({ limit: "4kb" }));
    mountAdmin(app, admin);

    app.get("/api/reservas", async function (req, res) {
        res.json(await store.list());
    });
    app.get("/api/disponibilidad", async function (req, res) {
        const checkIn = req.query.checkIn;
        const checkOut = req.query.checkOut;

        if (typeof checkIn !== "string" || typeof checkOut !== "string") {
            res.status(400).json({
                error: "Indicá una fecha de entrada y otra de salida."
            });
            return;
        }

        const limits = Availability.getDateLimits(now());
        const error = Availability.validate(checkIn, checkOut, [], limits);

        if (error) {
            res.status(400).json({ error });
            return;
        }

        const available = await store.isAvailable(checkIn, checkOut);

        res.json({
            available,
            nights: Availability.nights(checkIn, checkOut),
            demo: true
        });
    });

    app.post("/api/reservas", async function (req, res) {
        if (!req.is("application/json")) {
            res.status(415).json({ error: "Enviá la solicitud en formato JSON." });
            return;
        }
        const { checkIn, checkOut } = req.body || {};
        if (typeof checkIn !== "string" || typeof checkOut !== "string") {
            res.status(400).json({ error: "Indicá una fecha de entrada y otra de salida." });
            return;
        }
        const error = Availability.validate(checkIn, checkOut, [], Availability.getDateLimits(now()));
        if (error) {
            res.status(400).json({ error });
            return;
        }
        let reservation;
        const guestResult = validateGuest(req.body.guest);
        if (guestResult.error) {
            res.status(400).json({ error: guestResult.error });
            return;
        }
        try {
            reservation = await store.create(checkIn, checkOut, guestResult.guest);
        } catch (error) {
            if (error.code === "23P01") {
                res.status(409).json({ error: "Esas fechas ya están ocupadas. Elegí otro período." });
                return;
            }
            throw error;
        }
        res.status(201).json({
            reservation,
            nights: Availability.nights(checkIn, checkOut),
            demo: true
        });
    });
    app.get("/", function (req, res) {
        res.sendFile("index.html", { root: __dirname });
    });
    app.get(
        ["/style.css", "/script.js", "/availability.js", "/gallery.js"],
        function (req, res) {
            res.sendFile(req.path.slice(1), { root: __dirname });
        }
    );
    app.use("/imagenes", express.static(__dirname + "/imagenes"));

    app.use((req, res) => {
        res.status(404).json({ error: "No se encontró el recurso solicitado." });
    });

    app.use(function (error, req, res, next) {
        if (error.type === "entity.parse.failed") {
            res.status(400).json({ error: "El contenido JSON no es válido." });
            return;
        }
        if (error.type === "entity.too.large") {
            res.status(413).json({ error: "La solicitud es demasiado grande." });
            return;
        }
        console.error("No se pudo completar la operación:", error.code || error.name);
        res.set("Cache-Control", "no-store");
        res.status(503).json({ error: "No pudimos acceder a las reservas. Intentá nuevamente más tarde." });
    });
    return app;
}

if (require.main === module) {
    createApp().listen(3000, "127.0.0.1", function () {
        console.log("Servidor listo en http://127.0.0.1:3000");
    });
}

module.exports = { createApp };
