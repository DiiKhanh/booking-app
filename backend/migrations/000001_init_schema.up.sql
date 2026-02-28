CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Deluxe King"
    capacity INT NOT NULL DEFAULT 2,
    price_per_night DECIMAL(10, 2) NOT NULL
);

-- Inventory table to track availability per day
-- This is critical for preventing double bookings
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_inventory INT NOT NULL, -- Total physical rooms
    booked_count INT NOT NULL DEFAULT 0, -- Number of rooms booked
    UNIQUE(room_id, date)
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL, -- Assuming UUID from external auth
    room_id INT REFERENCES rooms(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_payment', 'confirmed', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_inventory_room_date ON inventory(room_id, date);
CREATE INDEX idx_bookings_room_dates ON bookings(room_id, start_date, end_date);
