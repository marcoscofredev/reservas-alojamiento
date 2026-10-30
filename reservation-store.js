const { randomUUID } = require("node:crypto");
const Availability = require("./availability");

function createPostgresStore(pool) {
    return {
        async list() {
            const result = await pool.query(`
                SELECT to_char(check_in, 'YYYY-MM-DD') AS "checkIn",
                       to_char(check_out, 'YYYY-MM-DD') AS "checkOut"
                FROM reservations
                WHERE status IN ('demo', 'confirmed')
                ORDER BY check_in, check_out
            `);
            return result.rows;
        },
        async isAvailable(checkIn, checkOut) {
            const result = await pool.query(`
                SELECT NOT EXISTS (
                    SELECT 1 FROM reservations
                    WHERE status IN ('demo', 'confirmed')
                      AND check_in < $2::date AND check_out > $1::date
                ) AS available
            `, [checkIn, checkOut]);
            return result.rows[0].available;
        },
        async create(checkIn, checkOut, guest) {
            // La restricción de PostgreSQL resuelve también solicitudes simultáneas.
            const result = await pool.query(`
                INSERT INTO reservations (check_in, check_out, status, guest_name, guest_email, guest_phone)
                VALUES ($1::date, $2::date, 'demo', $3, $4, $5)
                RETURNING id, to_char(check_in, 'YYYY-MM-DD') AS "checkIn",
                          to_char(check_out, 'YYYY-MM-DD') AS "checkOut", status
            `, [checkIn, checkOut, guest.name, guest.email, guest.phone]);
            return result.rows[0];
        }
    };
}

// Solo para pruebas automáticas: nunca se usa como respaldo si falla PostgreSQL.
function createMemoryStore(initialReservations = []) {
    const reservations = initialReservations.map(reservation => ({ ...reservation }));
    return {
        async list() {
            return reservations.map(({ checkIn, checkOut }) => ({ checkIn, checkOut }));
        },
        async isAvailable(checkIn, checkOut) {
            return !Availability.hasOverlap(checkIn, checkOut, reservations);
        },
        async create(checkIn, checkOut, guest) {
            if (Availability.hasOverlap(checkIn, checkOut, reservations)) {
                const error = new Error("Conflicto de fechas");
                error.code = "23P01";
                throw error;
            }
            const reservation = { id: randomUUID(), checkIn, checkOut, status: "demo" };
            reservations.push({ ...reservation, guest });
            return reservation;
        }
    };
}

module.exports = { createPostgresStore, createMemoryStore };
