package elasticsearch

import (
	"booking-app/internal/domain"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
)

// HotelDocument is the Elasticsearch document shape for a hotel.
type HotelDocument struct {
	ID          int       `json:"id"`
	OwnerID     string    `json:"owner_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Location    string    `json:"location"`
	Address     string    `json:"address"`
	City        string    `json:"city"`
	Country     string    `json:"country"`
	Status      string    `json:"status"`
	StarRating  int       `json:"star_rating"`
	AvgRating   float64   `json:"avg_rating"`
	ReviewCount int       `json:"review_count"`
	Amenities   []string  `json:"amenities"`
	MinPrice    float64   `json:"min_price"`
	GeoLocation GeoPoint  `json:"geo_location"`
	CreatedAt   time.Time `json:"created_at"`
}

// GeoPoint represents an Elasticsearch geo_point field.
type GeoPoint struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}

// hotelToDocument converts a domain.Hotel to an ES document.
func hotelToDocument(h *domain.Hotel) HotelDocument {
	amenities := h.Amenities
	if amenities == nil {
		amenities = []string{}
	}
	return HotelDocument{
		ID:          h.ID,
		OwnerID:     h.OwnerID,
		Name:        h.Name,
		Description: h.Description,
		Location:    h.Location,
		Address:     h.Address,
		City:        h.City,
		Country:     h.Country,
		Status:      string(h.Status),
		StarRating:  h.StarRating,
		Amenities:   amenities,
		GeoLocation: GeoPoint{Lat: h.Latitude, Lon: h.Longitude},
		CreatedAt:   h.CreatedAt,
	}
}

// IndexHotel upserts a single hotel document in Elasticsearch.
func IndexHotel(ctx context.Context, client *elasticsearch.Client, hotel *domain.Hotel) error {
	doc := hotelToDocument(hotel)
	body, err := json.Marshal(doc)
	if err != nil {
		return fmt.Errorf("marshaling hotel document: %w", err)
	}

	docID := fmt.Sprintf("%d", hotel.ID)
	res, err := client.Index(
		HotelIndex,
		bytes.NewReader(body),
		client.Index.WithDocumentID(docID),
		client.Index.WithContext(ctx),
	)
	if err != nil {
		return fmt.Errorf("indexing hotel %d: %w", hotel.ID, err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("ES error indexing hotel %d: %s", hotel.ID, res.String())
	}
	return nil
}

// BulkIndexHotels indexes multiple hotels using Elasticsearch's bulk API.
func BulkIndexHotels(ctx context.Context, client *elasticsearch.Client, hotels []*domain.Hotel) error {
	if len(hotels) == 0 {
		return nil
	}

	var buf bytes.Buffer
	for _, h := range hotels {
		meta := fmt.Sprintf(`{"index":{"_index":%q,"_id":%q}}`, HotelIndex, fmt.Sprintf("%d", h.ID))
		buf.WriteString(meta)
		buf.WriteByte('\n')

		doc := hotelToDocument(h)
		b, err := json.Marshal(doc)
		if err != nil {
			return fmt.Errorf("marshaling hotel %d: %w", h.ID, err)
		}
		buf.Write(b)
		buf.WriteByte('\n')
	}

	res, err := client.Bulk(
		strings.NewReader(buf.String()),
		client.Bulk.WithIndex(HotelIndex),
		client.Bulk.WithContext(ctx),
	)
	if err != nil {
		return fmt.Errorf("bulk indexing hotels: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("ES bulk error: %s", res.String())
	}

	// Parse response to check for per-document errors.
	var bulkResp struct {
		Errors bool `json:"errors"`
		Items  []map[string]struct {
			Error *struct {
				Reason string `json:"reason"`
			} `json:"error,omitempty"`
		} `json:"items"`
	}
	if err := json.NewDecoder(res.Body).Decode(&bulkResp); err == nil && bulkResp.Errors {
		return fmt.Errorf("bulk index completed with errors")
	}
	return nil
}

// DeleteHotel removes a hotel document from Elasticsearch.
func DeleteHotel(ctx context.Context, client *elasticsearch.Client, id int) error {
	docID := fmt.Sprintf("%d", id)
	res, err := client.Delete(
		HotelIndex,
		docID,
		client.Delete.WithContext(ctx),
	)
	if err != nil {
		return fmt.Errorf("deleting hotel %d from ES: %w", id, err)
	}
	defer res.Body.Close()

	if res.StatusCode == 404 {
		return nil // Already gone — idempotent.
	}
	if res.IsError() {
		return fmt.Errorf("ES error deleting hotel %d: %s", id, res.String())
	}
	return nil
}
