const entrada = document.getElementById("entrada");
const salida = document.getElementById("salida");
const disponibilidad = document.getElementById("disponibilidad");
const formulario = document.getElementById("form-disponibilidad");
const resultado = document.getElementById("resultado-disponibilidad");
// Establecer las fechas mínimas y máximas para los campos de entrada y salida
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, "0");
const day = String(today.getDate()).padStart(2, "0");
const minDate = `${year}-${month}-${day}`;
entrada.min = minDate;
salida.min = minDate;
const limitDate = new Date(today);
limitDate.setFullYear(today.getFullYear() + 1);

// Si hoy es 29 de febrero, ajustamos al último día de febrero.
if (limitDate.getMonth() !== today.getMonth()) {
    limitDate.setDate(0);
}
const maxYear = limitDate.getFullYear();
const maxMonth = String(limitDate.getMonth() + 1).padStart(2, "0");
const maxDay = String(limitDate.getDate()).padStart(2, "0");
const maxDate = `${maxYear}-${maxMonth}-${maxDay}`;
entrada.max = maxDate;
salida.max = maxDate;
formulario.addEventListener("submit", function (event) {
    event.preventDefault();

    const checkIn = entrada.value;
    const checkOut = salida.value;

    const reservations = [
        { checkIn: "2026-11-10", checkOut: "2026-11-15" },
        { checkIn: "2026-11-20", checkOut: "2026-11-25" }
    ];

    if (!checkIn || !checkOut) {
        resultado.textContent = "Elegí las fechas de entrada y salida.";
        return;
    }

    if (checkOut <= checkIn) {
        resultado.textContent = "La salida debe ser posterior a la entrada.";
        return;
    }

    for (const reservation of reservations) {
        if (
            checkIn < reservation.checkOut &&
            checkOut > reservation.checkIn
        ) {
            resultado.textContent =
                "Las fechas coinciden con una reserva de prueba.";
            return;
        }
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const nights =
        (Date.parse(checkOut) - Date.parse(checkIn)) / millisecondsPerDay;

    resultado.textContent =
        `Tu estadía es de ${nights} ${nights === 1 ? "noche" : "noches"}. ` +
        "No coincide con las reservas de prueba. No confirma una reserva real.";
});