const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { rateLimit } = require("express-rate-limit");
const { randomBytes, timingSafeEqual } = require("node:crypto");
const { hashPassword, verifyPassword } = require("./admin-password");
const { createAdminStore } = require("./admin-store");

function mountAdmin(app, config) {
    app.get(["/admin", "/admin/"], (req, res) => {
        res.set("Cache-Control", "no-store");
        res.sendFile("admin.html", { root: __dirname });
    });
    app.get(["/admin.css", "/admin-client.js"], (req, res) => {
        res.set("Cache-Control", "no-store");
        res.sendFile(req.path.slice(1), { root: __dirname });
    });
    if (!config || typeof config.secret !== "string" || config.secret.length < 64) {
        app.use("/api/admin", (req, res) => res.status(503).json({ error: "El acceso al panel todavía no está configurado." }));
        return;
    }
    const router = express.Router();
    const store = createAdminStore(config.pool);
    const sessions = new PgSession({
        pool: config.pool, schemaName: config.schemaName || "public", tableName: "admin_sessions",
        createTableIfMissing: false, pruneSessionInterval: config.pruneSessionInterval ?? 900
    });
    app.locals.adminSessions = sessions;
    const cookieOptions = {
        httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
        maxAge: 2 * 60 * 60 * 1000, path: "/api/admin"
    };
    router.use(session({
        name: "durazno.admin", secret: config.secret, store: sessions,
        resave: false, saveUninitialized: false, cookie: cookieOptions
    }));
    // Mismo coste de contraseña para usuarios desconocidos.
    const dummyHash = hashPassword(randomBytes(32).toString("hex"));
    function requireOrigin(req, res, next) {
        const expected = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : `${req.protocol}://${req.get("host")}`;
        if (req.get("origin") !== expected) return res.status(403).json({ error: "Abrí el panel desde la dirección del alojamiento." });
        next();
    }
    router.post("/login", requireOrigin, rateLimit({
        windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
        message: { error: "Demasiados intentos de acceso. Esperá 15 minutos antes de volver a intentar." }
    }), async (req, res) => {
        if (!req.is("application/json")) return res.status(415).json({ error: "Enviá los datos en formato JSON." });
        const { username, password } = req.body || {};
        if (typeof username !== "string" || !/^[a-z0-9._-]{3,64}$/.test(username) || typeof password !== "string" || password.length > 128) {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        }
        const user = await store.findUser(username);
        const valid = await verifyPassword(password, user?.password_hash || await dummyHash);
        if (!valid || !user?.active) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
        req.session.adminId = user.id;
        req.session.csrf = randomBytes(32).toString("hex");
        await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
        res.json({ username: user.username, csrfToken: req.session.csrf });
    });
    router.use(async (req, res, next) => {
        if (!req.session.adminId) return res.status(401).json({ error: "Ingresá al panel para continuar." });
        const user = await store.activeUser(req.session.adminId);
        if (!user) {
            await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
            return res.status(401).json({ error: "La sesión ya no está activa." });
        }
        req.admin = user;
        next();
    });
    router.get("/session", (req, res) => res.json({ username: req.admin.username, csrfToken: req.session.csrf }));
    router.get("/reservas", async (req, res) => {
        const { status = "active", limit = "25", offset = "0" } = req.query;
        if (!["active", "cancelled", "all"].includes(status) || typeof limit !== "string" || typeof offset !== "string" ||
            !/^\d{1,3}$/.test(limit) || !/^\d{1,7}$/.test(offset) || Number(limit) < 1 || Number(limit) > 100) {
            return res.status(400).json({ error: "Filtros de reservas inválidos." });
        }
        res.json(await store.listReservations(status, Number(limit), Number(offset)));
    });
    router.use((req, res, next) => {
        if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
        requireOrigin(req, res, () => {
            const token = req.get("x-csrf-token");
            const expected = req.session.csrf;
            if (!token || !expected || !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
                return res.status(403).json({ error: "La solicitud no pudo verificarse. Recargá el panel." });
            }
            next();
        });
    });
    router.post("/logout", async (req, res) => {
        await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
        res.clearCookie("durazno.admin", { path: cookieOptions.path, httpOnly: true, sameSite: "strict", secure: cookieOptions.secure });
        res.json({ loggedOut: true });
    });
    router.post("/reservas/:id/cancelar", async (req, res) => {
        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(req.params.id)) {
            return res.status(400).json({ error: "Identificador de reserva inválido." });
        }
        const reservation = await store.cancelDemo(req.params.id, req.admin.id);
        if (!reservation) return res.status(404).json({ error: "No se encontró la reserva." });
        if (reservation.status !== "cancelled") return res.status(409).json({ error: "Esta reserva requiere revisar su gestión de pagos antes de cancelar." });
        res.json({ reservation });
    });
    app.use("/api/admin", router);
}

module.exports = { mountAdmin };
