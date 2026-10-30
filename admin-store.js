function createAdminStore(pool) {
    return {
        async findUser(username) {
            const result = await pool.query("SELECT id, username, password_hash, active FROM admin_users WHERE username = $1", [username]);
            return result.rows[0];
        },
        async activeUser(id) {
            const result = await pool.query("SELECT id, username FROM admin_users WHERE id = $1 AND active = TRUE", [id]);
            return result.rows[0];
        },
        async listReservations(status, limit, offset) {
            const filter = `($1 = 'all' OR ($1 = 'active' AND status IN ('demo', 'confirmed')) OR ($1 = 'cancelled' AND status = 'cancelled'))`;
            const result = await pool.query(`
                SELECT id, to_char(check_in, 'YYYY-MM-DD') AS "checkIn",
                       to_char(check_out, 'YYYY-MM-DD') AS "checkOut", status,
                       guest_name AS "guestName", guest_email AS "guestEmail", guest_phone AS "guestPhone",
                       created_at AS "createdAt"
                FROM reservations WHERE ${filter}
                ORDER BY check_in DESC, created_at DESC LIMIT $2 OFFSET $3
            `, [status, limit, offset]);
            const count = await pool.query(`SELECT count(*)::integer AS total FROM reservations WHERE ${filter}`, [status]);
            return { reservations: result.rows, total: count.rows[0].total };
        },
        async cancelDemo(id, adminId) {
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                const changed = await client.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1 AND status = 'demo' RETURNING id", [id]);
                if (changed.rowCount) {
                    await client.query("INSERT INTO admin_events(admin_id, reservation_id, action) VALUES ($1, $2, 'cancel_demo')", [adminId, id]);
                }
                const result = await client.query("SELECT id, status FROM reservations WHERE id = $1", [id]);
                await client.query("COMMIT");
                return result.rows[0];
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            } finally {
                client.release();
            }
        }
    };
}

module.exports = { createAdminStore };
