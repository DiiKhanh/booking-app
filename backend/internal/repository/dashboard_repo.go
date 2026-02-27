package repository

import (
	"context"
	"database/sql"
	"fmt"
)

// pgDashboardRepo provides aggregate queries for the owner dashboard.
type pgDashboardRepo struct {
	db *sql.DB
}

// NewDashboardRepo creates a dashboard repository backed by PostgreSQL.
func NewDashboardRepo(db *sql.DB) *pgDashboardRepo {
	return &pgDashboardRepo{db: db}
}

// CountHotelsByOwner returns the number of hotels belonging to the owner.
func (r *pgDashboardRepo) CountHotelsByOwner(ctx context.Context, ownerID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM hotels WHERE owner_id = $1`, ownerID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count hotels by owner: %w", err)
	}
	return count, nil
}

// CountRoomsByOwner returns the number of active rooms across all hotels owned by ownerID.
func (r *pgDashboardRepo) CountRoomsByOwner(ctx context.Context, ownerID string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(r.id)
		FROM rooms r
		JOIN hotels h ON h.id = r.hotel_id
		WHERE h.owner_id = $1 AND COALESCE(r.is_active, true) = true`, ownerID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count rooms by owner: %w", err)
	}
	return count, nil
}
