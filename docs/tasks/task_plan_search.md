# Task Plan B: The "Search Engine" (Geo-spatial & High Performance)

## 📌 Phase 1: High-Performance Search Backend (Golang & Elasticsearch)
- [ ] **1.1 Setup Search Ecosystem**:
  - [ ] Spin up Elasticsearch (or Meilisearch) via Docker.
  - [ ] Setup PostGIS (PostgreSQL extension) for geo-spatial queries.
- [ ] **1.2 Data Ingestion Pipeline**:
  - [ ] Create a seeder script in Go to generate 10,000 dummy hotels with lat/long and amenities.
  - [ ] Implement a sync mechanism (Go routine/CDC) to push data from Postgres to Elasticsearch.
- [ ] **1.3 Search API Implementation**:
  - [ ] Implement `GET /hotels/search` with filters: `location` (radius), `price_range`, `amenities`, `dates`.
  - [ ] Implement "Geo-spatial" query: Find hotels within 5km of a coordinate.
- [ ] **1.4 Optimization & Caching**:
  - [ ] Implement Redis Caching for frequent search queries.
  - [ ] Benchmark API latency (Goal: < 200ms) using `k6` or `hey`.

## 🗺️ Phase 2: Interactive Map Frontend (Next.js)
- [ ] **2.1 Map Integration**:
  - [ ] Integrate React Map (Mapbox GL JS or Leaflet) into Next.js.
  - [ ] Plot 10,000 hotels as clusters on the map.
- [ ] **2.2 Real-time Filtering**:
  - [ ] Implement "Search as you move" (Re-fetch when map bounds change).
  - [ ] Debounce search inputs to reduce API load.
- [ ] **2.3 List & Map Sync**:
  - [ ] Hover on a map pin -> Highlight hotel card in the list.
  - [ ] Scroll list -> Fly map to hotel location.

## 📱 Phase 3: Mobile Experience (React Native)
- [ ] **3.1 Native Map**:
  - [ ] Integrate `react-native-maps`.
  - [ ] Implement bottom sheet for hotel details when clicking a pin.
- [ ] **3.2 Performance**:
  - [ ] Optimize marker rendering for mobile (TracksViewChanges, Clustering).

## 🚀 Phase 4: Production Readiness
- [ ] **4.1 Rate Limiting**: Limit search requests per IP using middleware.
- [ ] **4.2 Analytics**: Track popular search locations to improve caching strategy.
