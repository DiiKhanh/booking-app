package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"path/filepath"

	_ "github.com/lib/pq"
)

func main() {
	// 1. Connect to DB similar to API
	connStr := "postgres://user:password@localhost:5432/booking_db?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("Could not connect to DB: %v", err)
	}
	fmt.Println("Connected to Database for Migration!")

	// 2. Read Migration File
	path := "migrations/000001_init_schema.up.sql"
	absPath, _ := filepath.Abs(path)
	fmt.Printf("Reading migration file: %s\n", absPath)

	content, err := ioutil.ReadFile(path)
	if err != nil {
		log.Fatalf("Error reading migration file: %v", err)
	}

	// 3. Execute SQL
	_, err = db.Exec(string(content))
	if err != nil {
		log.Fatalf("Error executing migration: %v", err)
	}

	fmt.Println("Migration applied successfully!")

	// 4. Initialize Test Data
	// Create Room 1 with 1 inventory for 2024-12-25
	fmt.Println("Initializing test data...")
	_, err = db.Exec(`
		INSERT INTO hotels (name, location) VALUES ('Grand Budapest', 'Zubrowka') ON CONFLICT DO NOTHING;
		INSERT INTO rooms (hotel_id, name, capacity, price_per_night) VALUES (1, 'Suite 101', 2, 200.0) ON CONFLICT DO NOTHING;
		
		INSERT INTO inventory (room_id, date, total_inventory, booked_count)
		VALUES (1, '2024-12-25', 1, 0)
		ON CONFLICT (room_id, date) DO UPDATE SET booked_count = 0; -- Reset for test
	`)
	if err != nil {
		log.Printf("Error initializing data (maybe already exists): %v", err)
	} else {
		fmt.Println("Test data initialized: Room 1 has 1 inventory for 2024-12-25")
	}
}
