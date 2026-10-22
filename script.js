const entrada = document.getElementById("entrada");
const salida = document.getElementById("salida");
const disponibilidad = document.getElementById("disponibilidad");
const formulario = document.getElementById("form-disponibilidad");
const resultado = document.getElementById("resultado-disponibilidad");
formulario.addEventListener("submit", function (event) {
    event.preventDefault();

    const checkIn = entrada.value;
    const checkOut = salida.value;

    if (!checkIn || !checkOut) {
        resultado.textContent = "Elegí las fechas de entrada y salida.";
        return;
    }

    if (checkOut <= checkIn) {
        resultado.textContent = "La salida debe ser posterior a la entrada.";
        return;
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const nights =
        (Date.parse(checkOut) - Date.parse(checkIn)) / millisecondsPerDay;

    resultado.textContent =
        `Tu estadía es de ${nights} ${nights === 1 ? "noche" : "noches"}. Todavía no comprobamos disponibilidad.`;
});