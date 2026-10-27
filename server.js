const express = require("express");

const app = express();
app.get("/api/reservas", function (req, res) {
    const reservations = [
        { checkIn: "2026-11-10", checkOut: "2026-11-15" },
        { checkIn: "2026-11-20", checkOut: "2026-11-25" }
    ];

    res.json(reservations);
});

app.get("/", function (req, res) {
    res.sendFile("index.html", { root: __dirname });
});

app.get(
    ["/style.css", "/script.js", "/availability.js"],
    function (req, res) {
        res.sendFile(req.path.slice(1), { root: __dirname });
    }
);

app.use("/imagenes", express.static(__dirname + "/imagenes"));

app.listen(3000, "127.0.0.1", function () {
    console.log("Servidor listo en http://127.0.0.1:3000");
});