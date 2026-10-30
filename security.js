const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

function configureSecurity(app, { publicOrigin = process.env.PUBLIC_ORIGIN, production = process.env.NODE_ENV === "production" } = {}) {
    const deploymentOrigin = publicOrigin ? new URL(publicOrigin).origin : null;
    if (production && (!deploymentOrigin || !deploymentOrigin.startsWith("https://"))) {
        throw new Error("En producción configurá PUBLIC_ORIGIN con el dominio HTTPS del sitio.");
    }
    app.disable("x-powered-by");
    app.use(helmet({
        strictTransportSecurity: production ? { maxAge: 31536000 } : false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'", "data:"],
                fontSrc: ["'self'"],
                connectSrc: ["'self'"],
                frameSrc: ["https://www.google.com"],
                frameAncestors: ["'none'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: production ? [] : null
            }
        },
        xFrameOptions: { action: "deny" }
    }));

    app.use((req, res, next) => {
        // No confiamos en Host arbitrarios ni en cabeceras de proxies desconocidos.
        let host;
        try {
            host = new URL(`http://${req.get("host")}`).host;
        } catch {
            res.status(400).json({ error: "Dirección del servidor inválida." });
            return;
        }
        const hostname = new URL(`http://${host}`).hostname;
        const allowed = deploymentOrigin
            ? host === new URL(deploymentOrigin).host
            : ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
        if (!allowed) {
            res.status(400).json({ error: "Dirección del servidor no permitida." });
            return;
        }
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
            const expectedOrigin = deploymentOrigin || `${req.protocol}://${host}`;
            const origin = req.get("origin");
            if (req.get("sec-fetch-site") === "cross-site" || (origin && origin !== expectedOrigin)) {
                res.status(403).json({ error: "Enviá la solicitud desde la página del alojamiento." });
                return;
            }
        }
        next();
    });

    app.use("/api", (req, res, next) => {
        res.set("Cache-Control", "no-store");
        next();
    }, rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Demasiadas consultas. Esperá un minuto antes de volver a intentar." }
    }));
    app.post("/api/reservas", rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Demasiados intentos de reserva. Esperá unos minutos antes de volver a intentar." }
    }));
}

module.exports = { configureSecurity };
