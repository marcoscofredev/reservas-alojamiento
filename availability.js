// Reglas de fechas compartidas por el formulario y el calendario.
const Availability = (() => {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    function dateNumber(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
        const timestamp = Date.parse(value);
        if (!Number.isFinite(timestamp)) return NaN;
        return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : NaN;
    }
    function addDays(value, amount) {
        return new Date(dateNumber(value) + amount * millisecondsPerDay).toISOString().slice(0, 10);
    }
    function getDateLimits(now = new Date()) {
        const year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
        const format = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const lastDayNextYear = new Date(year + 1, month + 1, 0).getDate();
        return { min: format(year, month, day), max: format(year + 1, month, Math.min(day, lastDayNextYear)) };
    }
    function isOccupied(date, reservations) {
        return reservations.some(reservation => date >= reservation.checkIn && date < reservation.checkOut);
    }
    function hasOverlap(checkIn, checkOut, reservations) {
        return reservations.some(reservation => checkIn < reservation.checkOut && checkOut > reservation.checkIn);
    }
    function validate(checkIn, checkOut, reservations, limits) {
        if (!checkIn || !checkOut) return "Elegí las fechas de entrada y salida.";
        if (!Number.isFinite(dateNumber(checkIn)) || !Number.isFinite(dateNumber(checkOut))) return "Ingresá fechas válidas.";
        if (checkOut <= checkIn) return "La salida debe ser posterior a la entrada.";
        if (checkIn < limits.min || checkOut > limits.max) return "Elegí fechas desde hoy y hasta un año adelante.";
        if (hasOverlap(checkIn, checkOut, reservations)) return "Las fechas coinciden con una reserva de prueba. Probá otro período.";
        return "";
    }
    function canStart(date, reservations, limits) {
        return date >= limits.min && date < limits.max && !isOccupied(date, reservations);
    }
    return { addDays, getDateLimits, isOccupied, hasOverlap, validate, canStart,
        nights: (start, end) => (dateNumber(end) - dateNumber(start)) / millisecondsPerDay };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Availability;
