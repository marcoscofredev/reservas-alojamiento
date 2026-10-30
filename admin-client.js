const loginPanel = document.getElementById("login-panel");
const privatePanel = document.getElementById("private-panel");
const loginForm = document.getElementById("login-form");
const passwordField = document.getElementById("admin-password");
const usernameField = document.getElementById("admin-username");
const message = document.getElementById("admin-message");
const list = document.getElementById("admin-reservations");
const filter = document.getElementById("reservation-filter");
const previous = document.getElementById("previous-reservations");
const next = document.getElementById("next-reservations");
const logoutButton = document.getElementById("logout-button");
let csrfToken = "";
let offset = 0;
let loadId = 0;
let cancelling = false;
const pageSize = 25;
const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const formatDate = value => dateFormatter.format(new Date(`${value}T00:00:00Z`));

function showMessage(text, error = false) {
    message.textContent = text;
    message.dataset.state = error ? "error" : "success";
}
function showLogin() {
    csrfToken = "";
    loadId++;
    list.replaceChildren();
    document.getElementById("admin-user").textContent = "";
    privatePanel.hidden = true;
    loginPanel.hidden = false;
}
function showPrivate(data) {
    csrfToken = data.csrfToken;
    document.getElementById("admin-user").textContent = `Sesión de ${data.username}`;
    loginPanel.hidden = true;
    privatePanel.hidden = false;
}
async function request(url, options = {}) {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options });
    const data = await response.json();
    if (!response.ok) {
        if (response.status === 401) showLogin();
        throw new Error(typeof data.error === "string" ? data.error : "No se pudo completar la operación.");
    }
    return data;
}
function detail(dl, label, value) {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value || "Sin datos";
    dl.append(dt, dd);
}
function reservationCard(reservation) {
    const card = document.createElement("article");
    card.className = "reservation-card";
    const heading = document.createElement("h3");
    heading.textContent = `${formatDate(reservation.checkIn)} → ${formatDate(reservation.checkOut)}`;
    const dl = document.createElement("dl");
    detail(dl, "Estado", { demo: "Reserva de prueba", confirmed: "Confirmada", cancelled: "Cancelada" }[reservation.status] || "Estado desconocido");
    detail(dl, "Huésped", reservation.guestName);
    detail(dl, "Correo", reservation.guestEmail);
    detail(dl, "Teléfono", reservation.guestPhone);
    card.append(heading, dl);
    if (reservation.status === "demo") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cancel-reservation";
        button.textContent = "Cancelar y liberar fechas";
        button.addEventListener("click", async () => {
            if (cancelling || !window.confirm(`¿Cancelar la reserva del ${formatDate(reservation.checkIn)} al ${formatDate(reservation.checkOut)}? Se liberarán sus noches.`)) return;
            cancelling = true;
            button.disabled = true;
            try {
                await request(`/api/admin/reservas/${reservation.id}/cancelar`, {
                    method: "POST", headers: { "X-CSRF-Token": csrfToken }
                });
                showMessage("Reserva cancelada. Las noches ya están disponibles en el calendario público.");
                await loadReservations();
            } catch (error) {
                showMessage(error.message, true);
            } finally {
                cancelling = false;
                button.disabled = false;
            }
        });
        card.append(button);
    }
    return card;
}
async function loadReservations() {
    const id = ++loadId;
    list.setAttribute("aria-busy", "true");
    previous.disabled = true;
    next.disabled = true;
    list.replaceChildren();
    try {
        const query = new URLSearchParams({ status: filter.value, limit: String(pageSize), offset: String(offset) });
        const data = await request(`/api/admin/reservas?${query}`);
        if (id !== loadId || privatePanel.hidden) return;
        if (!Array.isArray(data.reservations) || !Number.isInteger(data.total)) throw new Error("Respuesta de reservas inválida.");
        if (!data.reservations.length && offset > 0) {
            offset = Math.max(0, offset - pageSize);
            return await loadReservations();
        }
        if (!data.reservations.length) {
            const empty = document.createElement("p");
            empty.textContent = "No hay reservas para este filtro.";
            list.append(empty);
        } else {
            for (const reservation of data.reservations) list.append(reservationCard(reservation));
        }
        document.getElementById("reservation-count").textContent = `${data.total} ${data.total === 1 ? "reserva" : "reservas"}`;
        document.getElementById("reservation-page").textContent = data.total ? `Página ${Math.floor(offset / pageSize) + 1}` : "";
        previous.disabled = offset === 0;
        next.disabled = offset + pageSize >= data.total;
    } finally {
        if (id === loadId) list.setAttribute("aria-busy", "false");
    }
}
loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = document.getElementById("login-button");
    if (button.disabled) return;
    button.disabled = true;
    showMessage("Comprobando acceso...");
    try {
        const data = await request("/api/admin/login", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: usernameField.value.trim().toLowerCase(), password: passwordField.value })
        });
        passwordField.value = "";
        offset = 0;
        showPrivate(data);
        showMessage("");
        await loadReservations();
    } catch (error) {
        passwordField.value = "";
        showMessage(error.message, true);
    } finally {
        button.disabled = false;
    }
});
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
        await request("/api/admin/logout", { method: "POST", headers: { "X-CSRF-Token": csrfToken } });
        showLogin();
        showMessage("Sesión cerrada.");
    } catch (error) {
        showLogin();
        showMessage("Se ocultaron los datos, pero no pudimos verificar el cierre de sesión. Cerrá el navegador si estás en una computadora compartida.", true);
    } finally {
        logoutButton.disabled = false;
    }
});
filter.addEventListener("change", () => { offset = 0; loadReservations().catch(error => showMessage(error.message, true)); });
document.getElementById("refresh-reservations").addEventListener("click", () => loadReservations().catch(error => showMessage(error.message, true)));
previous.addEventListener("click", () => { offset = Math.max(0, offset - pageSize); loadReservations().catch(error => showMessage(error.message, true)); });
next.addEventListener("click", () => { offset += pageSize; loadReservations().catch(error => showMessage(error.message, true)); });

// Al volver desde otra página, no conservamos huéspedes visibles sin revalidar la sesión.
async function restoreSession() {
    showLogin();
    try {
        const data = await request("/api/admin/session");
        showPrivate(data);
        showMessage("");
        await loadReservations();
    } catch (error) {
        showMessage(error.message === "Ingresá al panel para continuar." ? "" : error.message, error.message !== "Ingresá al panel para continuar.");
    }
}
window.addEventListener("pageshow", restoreSession);
window.addEventListener("pagehide", showLogin);
