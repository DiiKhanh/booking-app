// cmd/seeder/main.go — generates 10,000 dummy hotels in PostgreSQL and indexes them in Elasticsearch.
//
// Usage:
//
//	cd backend && go run ./cmd/seeder/
//
// Reads the same .env file as the main server. Both Postgres and Elasticsearch must be running.
package main

import (
	"booking-app/internal/config"
	"booking-app/internal/domain"
	esinfra "booking-app/internal/infrastructure/elasticsearch"
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/joho/godotenv"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

const (
	totalHotels = 10_000
	batchSize   = 500
)

// Seed data pools.
var (
	cities = []string{
		"Ho Chi Minh City", "Hanoi", "Da Nang", "Hoi An", "Nha Trang",
		"Bangkok", "Phuket", "Chiang Mai", "Singapore", "Kuala Lumpur",
		"Bali", "Jakarta", "Tokyo", "Osaka", "Seoul",
		"Paris", "London", "New York", "Sydney", "Dubai",
	}
	countries = map[string]string{
		"Ho Chi Minh City": "Vietnam",
		"Hanoi":            "Vietnam",
		"Da Nang":          "Vietnam",
		"Hoi An":           "Vietnam",
		"Nha Trang":        "Vietnam",
		"Bangkok":          "Thailand",
		"Phuket":           "Thailand",
		"Chiang Mai":       "Thailand",
		"Singapore":        "Singapore",
		"Kuala Lumpur":     "Malaysia",
		"Bali":             "Indonesia",
		"Jakarta":          "Indonesia",
		"Tokyo":            "Japan",
		"Osaka":            "Japan",
		"Seoul":            "South Korea",
		"Paris":            "France",
		"London":           "United Kingdom",
		"New York":         "United States",
		"Sydney":           "Australia",
		"Dubai":            "United Arab Emirates",
	}
	cityCoords = map[string][2]float64{
		"Ho Chi Minh City": {10.762622, 106.660172},
		"Hanoi":            {21.027764, 105.834160},
		"Da Nang":          {16.047079, 108.206230},
		"Hoi An":           {15.879946, 108.335106},
		"Nha Trang":        {12.238791, 109.196749},
		"Bangkok":          {13.756331, 100.501762},
		"Phuket":           {7.878978, 98.398392},
		"Chiang Mai":       {18.796143, 98.979263},
		"Singapore":        {1.352083, 103.819839},
		"Kuala Lumpur":     {3.139003, 101.686855},
		"Bali":             {-8.409518, 115.188919},
		"Jakarta":          {-6.208763, 106.845599},
		"Tokyo":            {35.689487, 139.691706},
		"Osaka":            {34.693738, 135.502165},
		"Seoul":            {37.566535, 126.977969},
		"Paris":            {48.856613, 2.352222},
		"London":           {51.507351, -0.127758},
		"New York":         {40.712776, -74.005974},
		"Sydney":           {-33.868820, 151.209296},
		"Dubai":            {25.204849, 55.270782},
	}
	hotelNameAdjectives = []string{
		"Grand", "Royal", "Luxury", "Premier", "Elite",
		"Serene", "Classic", "Modern", "Boutique", "Heritage",
		"Ocean", "Garden", "Sky", "Urban", "Palm",
	}
	hotelNameNouns = []string{
		"Palace", "Resort", "Inn", "Suites", "Hotel",
		"Lodge", "Retreat", "Haven", "Villas", "Residences",
	}
	allAmenities = []string{
		"wifi", "pool", "gym", "spa", "restaurant",
		"bar", "parking", "laundry", "concierge", "room_service",
		"beach_access", "airport_shuttle", "pet_friendly", "business_center", "kids_club",
	}
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	cfg := config.Load()

	db, err := sql.Open("postgres", cfg.DBConnString())
	if err != nil {
		log.Fatalf("failed to open DB: %v", err)
	}
	defer db.Close()
	if err = db.Ping(); err != nil {
		log.Fatalf("could not ping DB: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	esClient, err := esinfra.NewClient(cfg.ElasticsearchURL)
	if err != nil {
		log.Fatalf("failed to create ES client: %v", err)
	}
	if err := esinfra.EnsureIndex(esClient); err != nil {
		log.Fatalf("failed to ensure ES index: %v", err)
	}
	log.Println("Connected to Elasticsearch")

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	ctx := context.Background()

	log.Printf("Seeding %d hotels in batches of %d...", totalHotels, batchSize)

	total := 0
	for batchStart := 0; batchStart < totalHotels; batchStart += batchSize {
		count := batchSize
		if batchStart+count > totalHotels {
			count = totalHotels - batchStart
		}

		hotels, err := insertHotelBatch(ctx, db, rng, count)
		if err != nil {
			log.Fatalf("failed to insert batch at offset %d: %v", batchStart, err)
		}

		if err := esinfra.BulkIndexHotels(ctx, esClient, hotels); err != nil {
			log.Printf("WARN: bulk ES index failed for batch at %d: %v", batchStart, err)
		}

		total += len(hotels)
		log.Printf("  seeded %d / %d hotels", total, totalHotels)
	}

	log.Printf("Done! %d hotels seeded.", total)
}

// insertHotelBatch inserts a batch into PostgreSQL and returns the created hotels.
func insertHotelBatch(ctx context.Context, db *sql.DB, rng *rand.Rand, count int) ([]*domain.Hotel, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO hotels (owner_id, name, location, address, city, country, latitude, longitude,
		                    amenities, images, star_rating, status, description, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		RETURNING id, created_at, updated_at`)
	if err != nil {
		return nil, fmt.Errorf("prepare: %w", err)
	}
	defer stmt.Close()

	hotels := make([]*domain.Hotel, 0, count)
	now := time.Now()

	for i := 0; i < count; i++ {
		city := cities[rng.Intn(len(cities))]
		country := countries[city]
		coords := cityCoords[city]

		// Scatter hotels within ~5km of city centre.
		lat := coords[0] + (rng.Float64()-0.5)*0.09
		lng := coords[1] + (rng.Float64()-0.5)*0.09

		name := fmt.Sprintf("%s %s %s",
			hotelNameAdjectives[rng.Intn(len(hotelNameAdjectives))],
			city,
			hotelNameNouns[rng.Intn(len(hotelNameNouns))],
		)
		amenities := pickAmenities(rng)
		starRating := 2 + rng.Intn(4) // 2–5 stars

		var hotelID int
		var createdAt, updatedAt time.Time

		err := stmt.QueryRowContext(ctx,
			"d76da93f-2e59-435e-8ee9-54894402033d",                          // owner_id (placeholder)
			name,                                  // name
			fmt.Sprintf("%s, %s", city, country), // location
			fmt.Sprintf("%d Seed Street", i+1),   // address
			city,                                  // city
			country,                               // country
			lat,                                   // latitude
			lng,                                   // longitude
			pq.Array(amenities),                   // amenities
			pq.Array([]string{}),                  // images
			starRating,                            // star_rating
			string(domain.HotelStatusApproved),    // status
			fmt.Sprintf("A beautiful %d-star hotel in %s.", starRating, city), // description
			now, // created_at
			now, // updated_at
		).Scan(&hotelID, &createdAt, &updatedAt)
		if err != nil {
			return nil, fmt.Errorf("insert hotel: %w", err)
		}

		hotels = append(hotels, &domain.Hotel{
			ID:          hotelID,
			OwnerID:     "d76da93f-2e59-435e-8ee9-54894402033d",
			Name:        name,
			Location:    fmt.Sprintf("%s, %s", city, country),
			City:        city,
			Country:     country,
			Latitude:    lat,
			Longitude:   lng,
			Amenities:   amenities,
			StarRating:  starRating,
			Status:      domain.HotelStatusApproved,
			Description: fmt.Sprintf("A beautiful %d-star hotel in %s.", starRating, city),
			CreatedAt:   createdAt,
			UpdatedAt:   updatedAt,
		})
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return hotels, nil
}

// pickAmenities randomly selects 3–8 amenities.
func pickAmenities(rng *rand.Rand) []string {
	count := 3 + rng.Intn(6)
	perm := rng.Perm(len(allAmenities))
	result := make([]string, count)
	for i := 0; i < count; i++ {
		result[i] = allAmenities[perm[i]]
	}
	return result
}
