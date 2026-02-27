-- Extend hotels table with owner management and additional fields
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS address VARCHAR(500),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS star_rating INT CHECK (star_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Extend rooms table with additional fields
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Performance indexes for hotels
CREATE INDEX IF NOT EXISTS idx_hotels_owner_id ON hotels(owner_id);
CREATE INDEX IF NOT EXISTS idx_hotels_status ON hotels(status);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_location ON hotels(latitude, longitude);

-- Performance indexes for rooms
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active);
