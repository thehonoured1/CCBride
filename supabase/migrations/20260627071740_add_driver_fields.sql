ALTER TABLE drivers
ADD COLUMN password_hash TEXT,
ADD COLUMN invite_token TEXT UNIQUE,
ADD COLUMN account_setup INTEGER DEFAULT 0,
ADD COLUMN capacity INTEGER DEFAULT 4,
ADD COLUMN availability_status INTEGER DEFAULT 1,
ADD COLUMN availability_message TEXT;
