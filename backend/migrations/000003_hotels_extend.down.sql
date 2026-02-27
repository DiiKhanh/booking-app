-- Drop indexes for rooms
DROP INDEX IF EXISTS idx_rooms_is_active;
DROP INDEX IF EXISTS idx_rooms_hotel_id;

-- Drop indexes for hotels
DROP INDEX IF EXISTS idx_hotels_location;
DROP INDEX IF EXISTS idx_hotels_city;
DROP INDEX IF EXISTS idx_hotels_status;
DROP INDEX IF EXISTS idx_hotels_owner_id;

-- Revert rooms table extensions
ALTER TABLE rooms
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS images,
  DROP COLUMN IF EXISTS amenities,
  DROP COLUMN IF EXISTS description;

-- Revert hotels table extensions
ALTER TABLE hotels
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS star_rating,
  DROP COLUMN IF EXISTS images,
  DROP COLUMN IF EXISTS amenities,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS owner_id;
