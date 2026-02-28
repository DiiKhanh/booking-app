-- Phase 6: Reviews system
-- One review per booking, rating 1-5, requires completed booking at hotel.

CREATE TABLE reviews (
    id           SERIAL PRIMARY KEY,
    user_id      UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    hotel_id     BIGINT  NOT NULL REFERENCES hotels(id)   ON DELETE CASCADE,
    booking_id   BIGINT  NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    rating       INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title        VARCHAR(255) NOT NULL DEFAULT '',
    comment      TEXT         NOT NULL DEFAULT '',
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enforce one review per booking.
CREATE UNIQUE INDEX idx_reviews_booking_id ON reviews(booking_id);

-- Speed up hotel review listing and user review lookup.
CREATE INDEX idx_reviews_hotel_id ON reviews(hotel_id);
CREATE INDEX idx_reviews_user_id  ON reviews(user_id);

-- Denormalised rating stats on hotels (updated via application logic).
ALTER TABLE hotels
    ADD COLUMN IF NOT EXISTS avg_rating    DECIMAL(3,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS review_count  INTEGER      NOT NULL DEFAULT 0;
