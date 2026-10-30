CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'demo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    guest_name TEXT CHECK (char_length(guest_name) BETWEEN 2 AND 120),
    guest_email TEXT CHECK (char_length(guest_email) BETWEEN 3 AND 254),
    guest_phone TEXT CHECK (char_length(guest_phone) BETWEEN 7 AND 30),
    CONSTRAINT valid_status
        CHECK (status IN ('demo', 'confirmed', 'cancelled')),
    CONSTRAINT valid_stay CHECK (check_out > check_in),
    CONSTRAINT no_overlapping_reservations
        EXCLUDE USING gist (daterange(check_in, check_out, '[)') WITH &&)
        WHERE (status IN ('demo', 'confirmed'))
);
