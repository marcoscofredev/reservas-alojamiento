-- Los datos anteriores quedan en NULL. Las nuevas reservas se validan en la API.
ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS guest_name TEXT
        CHECK (char_length(guest_name) BETWEEN 2 AND 120),
    ADD COLUMN IF NOT EXISTS guest_email TEXT
        CHECK (char_length(guest_email) BETWEEN 3 AND 254),
    ADD COLUMN IF NOT EXISTS guest_phone TEXT
        CHECK (char_length(guest_phone) BETWEEN 7 AND 30);
