const selection = { checkIn: "", checkOut: "" };
const resultado = document.getElementById("resultado-disponibilidad");
let reservations = [];
let limits = Availability.getDateLimits();
const calendar = document.getElementById("calendario");
const monthTitle = document.getElementById("mes-calendario");
const daysBody = document.getElementById("dias-calendario");
const calendarHelp = document.getElementById("ayuda-calendario");
const previousMonth = document.getElementById("mes-anterior");
const nextMonth = document.getElementById("mes-siguiente");
let visibleMonth = limits.min.slice(0, 7);
const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
const dateFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function applyLimits() {
    // Actualiza los límites si la página queda abierta de un día a otro.
    limits = Availability.getDateLimits();
}

function showResult(message, state = "") {
    resultado.textContent = message;
    resultado.dataset.state = state;
}

function canEnd(date) {
    return Boolean(selection.checkIn) && !Availability.validate(selection.checkIn, date, reservations, limits);
}

function updateHelp() {
    if (!selection.checkIn) {
        calendarHelp.textContent = "Elegí tu fecha de entrada.";
    } else if (!selection.checkOut) {
        calendarHelp.textContent = "Ahora elegí la salida. Podés salir el día que comienza otra reserva, sin ocupar esa noche.";
    } else if (Availability.validate(selection.checkIn, selection.checkOut, reservations, limits)) {
        calendarHelp.textContent = "Revisá las fechas ingresadas. Podés elegir una nueva entrada en el calendario.";
    } else {
        const nights = Availability.nights(selection.checkIn, selection.checkOut);
        calendarHelp.textContent = `${nights} ${nights === 1 ? "noche seleccionada" : "noches seleccionadas"}. Podés elegir una nueva entrada para cambiar las fechas.`;
    }
}

function renderCalendar(focusDate) {
    applyLimits();
    if (visibleMonth < limits.min.slice(0, 7)) visibleMonth = limits.min.slice(0, 7);
    if (visibleMonth > limits.max.slice(0, 7)) visibleMonth = limits.max.slice(0, 7);
    const firstDate = new Date(`${visibleMonth}-01T00:00:00Z`);
    const offset = (firstDate.getUTCDay() + 6) % 7;
    const dayCount = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 0)).getUTCDate();
    monthTitle.textContent = monthFormatter.format(firstDate);
    previousMonth.disabled = visibleMonth <= limits.min.slice(0, 7);
    nextMonth.disabled = visibleMonth >= limits.max.slice(0, 7);
    daysBody.replaceChildren();
    for (let row = 0; row < 6; row++) {
        const tr = document.createElement("tr");
        for (let column = 0; column < 7; column++) {
            const td = document.createElement("td");
            const day = row * 7 + column - offset + 1;
            if (day > 0 && day <= dayCount) {
                const date = `${visibleMonth}-${String(day).padStart(2, "0")}`;
                const occupied = Availability.isOccupied(date, reservations);
                const choosingExit = Boolean(selection.checkIn && !selection.checkOut);
                const possibleExit = choosingExit && canEnd(date);
                const possibleStart = Availability.canStart(date, reservations, limits);
                const disabled = choosingExit && date > selection.checkIn ? !possibleExit : !possibleStart;
                const isEndpoint = date === selection.checkIn || date === selection.checkOut;
                const inRange = selection.checkIn && selection.checkOut && date > selection.checkIn && date < selection.checkOut;
                const button = document.createElement("button");
                button.type = "button";
                button.className = "calendar-day";
                button.textContent = day;
                button.dataset.date = date;
                button.disabled = disabled;
                button.classList.toggle("is-occupied", occupied);
                button.classList.toggle("is-selected", isEndpoint);
                button.classList.toggle("is-in-range", Boolean(inRange));
                button.classList.toggle("is-today", date === limits.min);
                button.classList.toggle("is-exit-only", occupied && possibleExit);
                const label = dateFormatter.format(new Date(`${date}T00:00:00Z`));
                const status = date === selection.checkIn ? "Entrada seleccionada" : date === selection.checkOut ? "Salida seleccionada" : occupied && possibleExit ? "Salida posible; noche ocupada" : occupied ? "Noche ocupada" : disabled ? "No disponible para seleccionar" : "Disponible";
                button.setAttribute("aria-label", `${label}. ${status}.`);
                button.setAttribute("aria-pressed", String(isEndpoint || Boolean(inRange)));
                if (date === limits.min) button.setAttribute("aria-current", "date");
                button.addEventListener("click", () => selectDate(date));
                td.append(button);
            }
            tr.append(td);
        }
        daysBody.append(tr);
    }
    updateHelp();
    if (focusDate) daysBody.querySelector(`[data-date="${focusDate}"]`)?.focus();
}

function selectDate(date) {
    if (selection.checkIn && !selection.checkOut && canEnd(date)) {
        selection.checkOut = date;
    } else if (Availability.canStart(date, reservations, limits)) {
        selection.checkIn = date;
        selection.checkOut = "";
    }
    showResult("");
    renderCalendar(date);
    updateResult();
}

function changeMonth(direction) {
    const date = new Date(`${visibleMonth}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + direction);
    visibleMonth = date.toISOString().slice(0, 7);
    renderCalendar();
    if (direction < 0 && previousMonth.disabled) nextMonth.focus();
    if (direction > 0 && nextMonth.disabled) previousMonth.focus();
}

previousMonth.addEventListener("click", () => changeMonth(-1));
nextMonth.addEventListener("click", () => changeMonth(1));
document.getElementById("limpiar-fechas").addEventListener("click", () => {
    selection.checkIn = "";
    selection.checkOut = "";
    showResult("");
    renderCalendar();
});
function updateResult() {
    applyLimits();
    const checkIn = selection.checkIn;
    const checkOut = selection.checkOut;
    if (!checkIn || !checkOut) {
        showResult("");
        return;
    }
    const error = Availability.validate(checkIn, checkOut, reservations, limits);
    if (error) {
        showResult(error, "error");
        return;
    }
    const nights = Availability.nights(checkIn, checkOut);
    const format = value => new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
    showResult(`Entrada: ${format(checkIn)}. Salida: ${format(checkOut)}. Tu estadía es de ${nights} ${nights === 1 ? "noche" : "noches"}. Las fechas están libres en esta demostración. Esto no confirma una reserva real.`, "success");
}
document.getElementById("form-contacto").addEventListener("submit", event => event.preventDefault());
window.addEventListener("pageshow", () => {
    if (!calendar.hidden) {
        renderCalendar();
        updateResult();
    }
});
async function loadReservations() {
    calendar.hidden = true;
    showResult("Cargando disponibilidad...");

    const response = await fetch("/api/reservas");

    if (!response.ok) {
        throw new Error("No se pudieron obtener las reservas.");
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.some(reservation =>
        !reservation ||
        typeof reservation.checkIn !== "string" ||
        typeof reservation.checkOut !== "string" ||
        !Number.isFinite(Availability.nights(reservation.checkIn, reservation.checkOut)) ||
        Availability.nights(reservation.checkIn, reservation.checkOut) <= 0
    )) {
        throw new Error("El servidor no devolvió una lista de reservas.");
    }

    reservations = data;

    renderCalendar();
    updateResult();
    calendar.hidden = false;
}

loadReservations().catch(function (error) {
    calendar.hidden = true;
    showResult(
        "No pudimos cargar la disponibilidad. Recargá la página para intentar nuevamente.",
        "error"
    );
    console.error(error.message);
});
