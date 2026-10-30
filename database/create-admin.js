const path = require("node:path");
const fs = require("node:fs");
const readline = require("node:readline/promises");
const { randomBytes } = require("node:crypto");
const pool = require("../database");
const { hashPassword } = require("../admin-password");

function hiddenQuestion(prompt) {
    return new Promise((resolve, reject) => {
        const input = process.stdin;
        if (!input.isTTY || typeof input.setRawMode !== "function") {
            reject(new Error("Abrí este comando en una terminal interactiva de VS Code o Git Bash. No pases la contraseña como argumento."));
            return;
        }
        process.stdout.write(prompt);
        const previousRawMode = input.isRaw;
        input.setRawMode(true);
        input.resume();
        let value = "";
        let finished = false;
        const finish = (error) => {
            if (finished) return;
            finished = true;
            input.removeListener("data", onData);
            input.setRawMode(Boolean(previousRawMode));
            input.pause();
            process.stdout.write("\n");
            if (error) reject(error); else resolve(value);
        };
        const onData = data => {
            for (const char of data.toString("utf8")) {
                if (char === "\r" || char === "\n") return finish();
                if (char === "\u0003" || char === "\u0004") return finish(new Error("Operación cancelada."));
                if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
                else if (char >= " " && char !== "\u007f") value += char;
                if (value.length > 128) return finish(new Error("La contraseña no puede superar 128 caracteres."));
            }
        };
        input.on("data", onData);
    });
}

async function createAdmin() {
    if (!process.stdin.isTTY) throw new Error("Ejecutá este comando en una terminal interactiva. No ingreses contraseñas en el chat.");
    const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
    let username;
    try {
        username = (await prompt.question("Usuario del panel (por ejemplo francisco): ")).trim().toLowerCase();
    } finally {
        prompt.close();
    }
    if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw new Error("El usuario necesita entre 3 y 64 letras minúsculas, números, puntos o guiones.");
    if ((await pool.query("SELECT 1 FROM admin_users WHERE username = $1", [username])).rowCount) {
        throw new Error("Ese usuario ya existe. No se modificó su contraseña.");
    }
    const password = await hiddenQuestion("Contraseña (12 a 128 caracteres; no se muestra al escribir): ");
    const repeated = await hiddenQuestion("Repetí la contraseña: ");
    if (password !== repeated) throw new Error("Las contraseñas no coinciden.");
    const hash = await hashPassword(password);
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 64) {
        throw new Error("La clave de sesión configurada es demasiado corta. Revisá la configuración local antes de crear el usuario.");
    }
    if (!process.env.SESSION_SECRET) {
        // Nunca mostramos esta clave ni la enviamos al navegador.
        fs.appendFileSync(path.join(__dirname, "../.env"), `\nSESSION_SECRET=${randomBytes(48).toString("hex")}\n`);
    }
    await pool.query("INSERT INTO admin_users(username, password_hash) VALUES ($1, $2)", [username, hash]);
    console.log("Usuario creado. Reiniciá el servidor y abrí el panel para ingresar.");
}

createAdmin().catch(error => {
    console.error(error.code === "23505" ? "Ese usuario ya existe." : error.code ? "No se pudo crear el usuario. Verificá la base y ejecutá npm run db:migrate." : error.message);
    process.exitCode = 1;
}).finally(() => pool.end());
