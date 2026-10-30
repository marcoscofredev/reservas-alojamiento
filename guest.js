function validateGuest(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { error: "Completá los datos de la persona que reserva." };
    }
    const { name, email, phone = "" } = value;
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(name)) {
        return { error: "Ingresá un nombre de entre 2 y 120 caracteres." };
    }
    if (typeof email !== "string" || email.trim().length > 254 ||
        !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim()) || /[\u0000-\u001f\u007f]/.test(email)) {
        return { error: "Ingresá un correo electrónico válido." };
    }
    if (typeof phone !== "string" || phone.length > 30 || (phone.trim() &&
        (!/^[+\d ()-]+$/.test(phone.trim()) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15))) {
        return { error: "Revisá el teléfono o dejá ese campo vacío." };
    }
    return { guest: { name: name.trim(), email: email.trim(), phone: phone.trim() || null } };
}

module.exports = { validateGuest };
