const { scrypt, randomBytes, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(scrypt);
const parameters = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

async function hashPassword(password) {
    if (typeof password !== "string" || password.length < 12 || password.length > 128) {
        throw new Error("Usá una contraseña de entre 12 y 128 caracteres.");
    }
    const salt = randomBytes(16).toString("hex");
    const key = await derive(password, salt, 64, parameters);
    return `scrypt$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password, encoded) {
    if (typeof password !== "string" || password.length > 128 || typeof encoded !== "string") return false;
    const parts = encoded.split("$");
    if (parts.length !== 3 || parts[0] !== "scrypt" || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
    const key = await derive(password, parts[1], 64, parameters);
    return timingSafeEqual(key, Buffer.from(parts[2], "hex"));
}

module.exports = { hashPassword, verifyPassword };
