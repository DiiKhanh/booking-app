package repository

import (
	"booking-app/internal/domain"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
)

// pgHotelRepo implements HotelRepository using PostgreSQL.
type pgHotelRepo struct {
	db *sql.DB
}

// NewHotelRepo creates a new PostgreSQL-backed HotelRepository.
func NewHotelRepo(db *sql.DB) HotelRepository {
	return &pgHotelRepo{db: db}
}

// CreateHotel inserts a new hotel and returns the created record.
func (r *pgHotelRepo) CreateHotel(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
	const q = `
		INSERT INTO hotels (owner_id, name, location, address, city, country,
		                    latitude, longitude, amenities, images, star_rating,
		                    status, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at`

	result := *hotel
	err := r.db.QueryRowContext(ctx, q,
		hotel.OwnerID,
		hotel.Name,
		hotel.Location,
		hotel.Address,
		hotel.City,
		hotel.Country,
		hotel.Latitude,
		hotel.Longitude,
		pq.Array(hotel.Amenities),
		pq.Array(hotel.Images),
		hotel.StarRating,
		string(hotel.Status),
		hotel.Description,
	).Scan(&result.ID, &result.CreatedAt, &result.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert hotel: %w", err)
	}
	return &result, nil
}

// GetHotelByID retrieves a hotel by its ID.
func (r *pgHotelRepo) GetHotelByID(ctx context.Context, id int) (*domain.Hotel, error) {
	const q = `
		SELECT id, COALESCE(owner_id::text, ''), name, location,
		       COALESCE(address, ''), COALESCE(city, ''), COALESCE(country, ''),
		       COALESCE(latitude, 0), COALESCE(longitude, 0),
		       COALESCE(amenities, '{}'), COALESCE(images, '{}'),
		       COALESCE(star_rating, 0), COALESCE(status, 'pending'), COALESCE(description, ''),
		       COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
		FROM hotels WHERE id = $1`

	hotel := &domain.Hotel{}
	var amenities, images pq.StringArray
	err := r.db.QueryRowContext(ctx, q, id).Scan(
		&hotel.ID,
		&hotel.OwnerID,
		&hotel.Name,
		&hotel.Location,
		&hotel.Address,
		&hotel.City,
		&hotel.Country,
		&hotel.Latitude,
		&hotel.Longitude,
		&amenities,
		&images,
		&hotel.StarRating,
		&hotel.Status,
		&hotel.Description,
		&hotel.CreatedAt,
		&hotel.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("hotel not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("query hotel by id: %w", err)
	}
	hotel.Amenities = amenities
	hotel.Images = images
	return hotel, nil
}

// ListApprovedHotels returns a paginated list of hotels with status=approved.
func (r *pgHotelRepo) ListApprovedHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM hotels WHERE status = 'approved'`,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count approved hotels: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(owner_id::text, ''), name, location,
		       COALESCE(address, ''), COALESCE(city, ''), COALESCE(country, ''),
		       COALESCE(latitude, 0), COALESCE(longitude, 0),
		       COALESCE(amenities, '{}'), COALESCE(images, '{}'),
		       COALESCE(star_rating, 0), COALESCE(status, 'pending'), COALESCE(description, ''),
		       COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
		FROM hotels WHERE status = 'approved'
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list approved hotels: %w", err)
	}
	defer rows.Close()

	hotels, err := scanHotelRows(rows)
	if err != nil {
		return nil, 0, err
	}
	return hotels, total, nil
}

// ListHotelsByOwner returns hotels for a given owner, paginated.
func (r *pgHotelRepo) ListHotelsByOwner(ctx context.Context, ownerID string, page, limit int) ([]*domain.Hotel, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM hotels WHERE owner_id = $1`, ownerID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count hotels by owner: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(owner_id::text, ''), name, location,
		       COALESCE(address, ''), COALESCE(city, ''), COALESCE(country, ''),
		       COALESCE(latitude, 0), COALESCE(longitude, 0),
		       COALESCE(amenities, '{}'), COALESCE(images, '{}'),
		       COALESCE(star_rating, 0), COALESCE(status, 'pending'), COALESCE(description, ''),
		       COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
		FROM hotels WHERE owner_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`, ownerID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list hotels by owner: %w", err)
	}
	defer rows.Close()

	hotels, err := scanHotelRows(rows)
	if err != nil {
		return nil, 0, err
	}
	return hotels, total, nil
}

// ListPendingHotels returns hotels awaiting approval, paginated.
func (r *pgHotelRepo) ListPendingHotels(ctx context.Context, page, limit int) ([]*domain.Hotel, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM hotels WHERE status = 'pending'`,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count pending hotels: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(owner_id::text, ''), name, location,
		       COALESCE(address, ''), COALESCE(city, ''), COALESCE(country, ''),
		       COALESCE(latitude, 0), COALESCE(longitude, 0),
		       COALESCE(amenities, '{}'), COALESCE(images, '{}'),
		       COALESCE(star_rating, 0), COALESCE(status, 'pending'), COALESCE(description, ''),
		       COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
		FROM hotels WHERE status = 'pending'
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list pending hotels: %w", err)
	}
	defer rows.Close()

	hotels, err := scanHotelRows(rows)
	if err != nil {
		return nil, 0, err
	}
	return hotels, total, nil
}

// UpdateHotel updates an existing hotel record and returns the updated value.
func (r *pgHotelRepo) UpdateHotel(ctx context.Context, hotel *domain.Hotel) (*domain.Hotel, error) {
	const q = `
		UPDATE hotels SET
			name = $1, location = $2, address = $3, city = $4, country = $5,
			latitude = $6, longitude = $7, amenities = $8, images = $9,
			star_rating = $10, description = $11, updated_at = NOW()
		WHERE id = $12
		RETURNING updated_at`

	result := *hotel
	err := r.db.QueryRowContext(ctx, q,
		hotel.Name,
		hotel.Location,
		hotel.Address,
		hotel.City,
		hotel.Country,
		hotel.Latitude,
		hotel.Longitude,
		pq.Array(hotel.Amenities),
		pq.Array(hotel.Images),
		hotel.StarRating,
		hotel.Description,
		hotel.ID,
	).Scan(&result.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("hotel not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("update hotel: %w", err)
	}
	return &result, nil
}

// UpdateHotelStatus sets the status field of a hotel.
func (r *pgHotelRepo) UpdateHotelStatus(ctx context.Context, id int, status domain.HotelStatus) error {
	const q = `UPDATE hotels SET status = $1, updated_at = NOW() WHERE id = $2`
	res, err := r.db.ExecContext(ctx, q, string(status), id)
	if err != nil {
		return fmt.Errorf("update hotel status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("hotel not found: %w", domain.ErrNotFound)
	}
	return nil
}

// DeleteHotel removes a hotel only if it belongs to ownerID.
func (r *pgHotelRepo) DeleteHotel(ctx context.Context, id int, ownerID string) error {
	const q = `DELETE FROM hotels WHERE id = $1 AND owner_id = $2`
	res, err := r.db.ExecContext(ctx, q, id, ownerID)
	if err != nil {
		return fmt.Errorf("delete hotel: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		// Could be not found OR not owned — treat as not found for safety
		return fmt.Errorf("hotel not found or not owned: %w", domain.ErrNotFound)
	}
	return nil
}

// CountHotelsByOwner returns the number of hotels for an owner.
func (r *pgHotelRepo) CountHotelsByOwner(ctx context.Context, ownerID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM hotels WHERE owner_id = $1`, ownerID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count hotels by owner: %w", err)
	}
	return count, nil
}

// scanHotelRows scans multiple hotel rows into a slice.
func scanHotelRows(rows *sql.Rows) ([]*domain.Hotel, error) {
	var hotels []*domain.Hotel
	for rows.Next() {
		hotel := &domain.Hotel{}
		var amenities, images pq.StringArray
		if err := rows.Scan(
			&hotel.ID,
			&hotel.OwnerID,
			&hotel.Name,
			&hotel.Location,
			&hotel.Address,
			&hotel.City,
			&hotel.Country,
			&hotel.Latitude,
			&hotel.Longitude,
			&amenities,
			&images,
			&hotel.StarRating,
			&hotel.Status,
			&hotel.Description,
			&hotel.CreatedAt,
			&hotel.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan hotel row: %w", err)
		}
		hotel.Amenities = amenities
		hotel.Images = images
		hotels = append(hotels, hotel)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate hotel rows: %w", err)
	}
	if hotels == nil {
		hotels = []*domain.Hotel{}
	}
	return hotels, nil
}

// pgRoomRepo implements RoomRepository using PostgreSQL.
type pgRoomRepo struct {
	db *sql.DB
}

// NewRoomRepo creates a new PostgreSQL-backed RoomRepository.
func NewRoomRepo(db *sql.DB) RoomRepository {
	return &pgRoomRepo{db: db}
}

// CreateRoom inserts a new room and returns the created record.
func (r *pgRoomRepo) CreateRoom(ctx context.Context, room *domain.Room) (*domain.Room, error) {
	const q = `
		INSERT INTO rooms (hotel_id, name, description, capacity, price_per_night,
		                   amenities, images, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`

	result := *room
	err := r.db.QueryRowContext(ctx, q,
		room.HotelID,
		room.Name,
		room.Description,
		room.Capacity,
		room.PricePerNight,
		pq.Array(room.Amenities),
		pq.Array(room.Images),
		room.IsActive,
	).Scan(&result.ID, &result.CreatedAt, &result.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert room: %w", err)
	}
	return &result, nil
}

// GetRoomByID retrieves a room by its ID.
func (r *pgRoomRepo) GetRoomByID(ctx context.Context, id int) (*domain.Room, error) {
	const q = `
		SELECT id, hotel_id, name, COALESCE(description, ''), capacity, price_per_night,
		       COALESCE(amenities, '{}'), COALESCE(images, '{}'),
		       COALESCE(is_active, true), COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
		FROM rooms WHERE id = $1`

	room := &domain.Room{}
	var amenities, images pq.StringArray
	err := r.db.QueryRowContext(ctx, q, id).Scan(
		&room.ID,
		&room.HotelID,
		&room.Name,
		&room.Description,
		&room.Capacity,
		&room.PricePerNight,
		&amenities,
		&images,
		&room.IsActive,
		&room.CreatedAt,
		&room.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("room not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("query room by id: %w", err)
	}
	room.Amenities = amenities
	room.Images = images
	return room, nil
}

// ListRoomsByHotel returns all active rooms for a given hotel.
func (r *pgRoomRepo) ListRoomsByHotel(ctx context.Context, hotelID int) ([]*domain.Room, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, hotel_id, name, COALESCE(description, ''), capacity, price_per_night,
		       COALESCE(amenities, '{}'), COALESCE(images, '{}'),
		       COALESCE(is_active, true), COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
		FROM rooms WHERE hotel_id = $1 AND COALESCE(is_active, true) = true
		ORDER BY id`, hotelID)
	if err != nil {
		return nil, fmt.Errorf("list rooms by hotel: %w", err)
	}
	defer rows.Close()
	return scanRoomRows(rows)
}

// UpdateRoom updates an existing room record.
func (r *pgRoomRepo) UpdateRoom(ctx context.Context, room *domain.Room) (*domain.Room, error) {
	const q = `
		UPDATE rooms SET
			name = $1, description = $2, capacity = $3, price_per_night = $4,
			amenities = $5, images = $6, is_active = $7, updated_at = NOW()
		WHERE id = $8
		RETURNING updated_at`

	result := *room
	err := r.db.QueryRowContext(ctx, q,
		room.Name,
		room.Description,
		room.Capacity,
		room.PricePerNight,
		pq.Array(room.Amenities),
		pq.Array(room.Images),
		room.IsActive,
		room.ID,
	).Scan(&result.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("room not found: %w", domain.ErrNotFound)
		}
		return nil, fmt.Errorf("update room: %w", err)
	}
	return &result, nil
}

// DeleteRoom soft-deletes a room by setting is_active = false.
func (r *pgRoomRepo) DeleteRoom(ctx context.Context, id int, hotelID int) error {
	const q = `UPDATE rooms SET is_active = false, updated_at = NOW() WHERE id = $1 AND hotel_id = $2`
	res, err := r.db.ExecContext(ctx, q, id, hotelID)
	if err != nil {
		return fmt.Errorf("delete room: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("room not found: %w", domain.ErrNotFound)
	}
	return nil
}

// CountRoomsByOwner counts all rooms belonging to hotels owned by ownerID.
func (r *pgRoomRepo) CountRoomsByOwner(ctx context.Context, ownerID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(r.id)
		FROM rooms r
		JOIN hotels h ON h.id = r.hotel_id
		WHERE h.owner_id = $1 AND COALESCE(r.is_active, true) = true`, ownerID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count rooms by owner: %w", err)
	}
	return count, nil
}

// scanRoomRows scans multiple room rows into a slice.
func scanRoomRows(rows *sql.Rows) ([]*domain.Room, error) {
	var rooms []*domain.Room
	for rows.Next() {
		room := &domain.Room{}
		var amenities, images pq.StringArray
		if err := rows.Scan(
			&room.ID,
			&room.HotelID,
			&room.Name,
			&room.Description,
			&room.Capacity,
			&room.PricePerNight,
			&amenities,
			&images,
			&room.IsActive,
			&room.CreatedAt,
			&room.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan room row: %w", err)
		}
		room.Amenities = amenities
		room.Images = images
		rooms = append(rooms, room)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate room rows: %w", err)
	}
	if rooms == nil {
		rooms = []*domain.Room{}
	}
	return rooms, nil
}

// pgInventoryRepo implements InventoryRepository using PostgreSQL.
type pgInventoryRepo struct {
	db *sql.DB
}

// NewInventoryRepo creates a new PostgreSQL-backed InventoryRepository.
func NewInventoryRepo(db *sql.DB) InventoryRepository {
	return &pgInventoryRepo{db: db}
}

// SetInventory upserts inventory for a single room+date.
func (r *pgInventoryRepo) SetInventory(ctx context.Context, roomID int, date time.Time, total int) error {
	const q = `
		INSERT INTO inventory (room_id, date, total_inventory, booked_count)
		VALUES ($1, $2, $3, 0)
		ON CONFLICT (room_id, date) DO UPDATE SET total_inventory = $3`
	if _, err := r.db.ExecContext(ctx, q, roomID, date, total); err != nil {
		return fmt.Errorf("set inventory: %w", err)
	}
	return nil
}

// GetInventoryForRoom returns inventory records for a room within a date range.
func (r *pgInventoryRepo) GetInventoryForRoom(ctx context.Context, roomID int, startDate, endDate time.Time) ([]*domain.Inventory, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, room_id, date, total_inventory, booked_count
		FROM inventory
		WHERE room_id = $1 AND date >= $2 AND date < $3
		ORDER BY date`, roomID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("get inventory for room: %w", err)
	}
	defer rows.Close()

	var invs []*domain.Inventory
	for rows.Next() {
		inv := &domain.Inventory{}
		if err := rows.Scan(&inv.ID, &inv.RoomID, &inv.Date, &inv.TotalInventory, &inv.BookedCount); err != nil {
			return nil, fmt.Errorf("scan inventory row: %w", err)
		}
		invs = append(invs, inv)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate inventory rows: %w", err)
	}
	if invs == nil {
		invs = []*domain.Inventory{}
	}
	return invs, nil
}

// BulkDecrementBookedCount decrements booked_count by amount for each day in [startDate, startDate+days).
// Uses GREATEST(0, booked_count - amount) to prevent negative values.
// This is the correct way to restore inventory after a failed or timed-out payment.
func (r *pgInventoryRepo) BulkDecrementBookedCount(ctx context.Context, roomID int, startDate time.Time, days, amount int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx for bulk decrement: %w", err)
	}
	defer tx.Rollback()

	const q = `
		UPDATE inventory
		SET booked_count = GREATEST(0, booked_count - $3)
		WHERE room_id = $1 AND date = $2`

	for i := 0; i < days; i++ {
		date := startDate.AddDate(0, 0, i)
		if _, err := tx.ExecContext(ctx, q, roomID, date, amount); err != nil {
			return fmt.Errorf("bulk decrement booked_count day %d: %w", i, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit bulk decrement: %w", err)
	}
	return nil
}

// BulkSetInventory upserts inventory for a contiguous range of days starting from startDate.
func (r *pgInventoryRepo) BulkSetInventory(ctx context.Context, roomID int, startDate time.Time, days, total int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx for bulk inventory: %w", err)
	}
	defer tx.Rollback()

	const q = `
		INSERT INTO inventory (room_id, date, total_inventory, booked_count)
		VALUES ($1, $2, $3, 0)
		ON CONFLICT (room_id, date) DO UPDATE SET total_inventory = $3`

	for i := 0; i < days; i++ {
		date := startDate.AddDate(0, 0, i)
		if _, err := tx.ExecContext(ctx, q, roomID, date, total); err != nil {
			return fmt.Errorf("bulk set inventory day %d: %w", i, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit bulk inventory: %w", err)
	}
	return nil
}
