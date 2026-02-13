DB_URL=postgres://user:password@localhost:5432/booking_db?sslmode=disable

network:
	docker network create booking-network || true

postgres:
	docker run --name booking-postgres --network booking-network -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -d postgres:16-alpine

redis:
	docker run --name booking-redis --network booking-network -p 6379:6379 -d redis:7-alpine

createdb:
	docker exec -it booking-postgres createdb -U user booking_db

dropdb:
	docker exec -it booking-postgres dropdb -U user booking_db

# Run migrations using our custom tool
migrate:
	go run cmd/migration_tool/main.go

# Run tests
test:
	go test -v -cover ./...

# Run Load Test (k6 runs from root as it's language agnostic)
load-test:
	k6 run ../tests/k6/load_test.js

# Start API Server
server:
	go run cmd/api/main.go

# Tidy dependencies
tidy:
	go mod tidy

# Full reset: drop DB, recreate, migrate, seed data — ready for load testing
reset-db: dropdb createdb migrate
	@echo "✅ Database reset complete! Ready for load testing."

# Docker Compose: Start all infrastructure (Postgres + Redis)
infra-up:
	docker compose up -d

# Docker Compose: Stop all infrastructure
infra-down:
	docker compose down

# Full flow: reset DB, start server (for manual testing)
# Usage: make reset-db && make server (in separate terminals)

.PHONY: network postgres redis createdb dropdb migrate test load-test server tidy reset-db infra-up infra-down
