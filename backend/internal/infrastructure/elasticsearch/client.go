package elasticsearch

import (
	"fmt"
	"strings"

	"github.com/elastic/go-elasticsearch/v8"
)

const (
	// HotelIndex is the Elasticsearch index name for hotels.
	HotelIndex = "hotels"

	// HotelIndexMapping defines the mapping for the hotel index.
	// The geo_location field uses geo_point for distance queries.
	HotelIndexMapping = `{
		"mappings": {
			"properties": {
				"id":           { "type": "integer" },
				"owner_id":     { "type": "keyword" },
				"name":         { "type": "text", "analyzer": "standard" },
				"description":  { "type": "text", "analyzer": "standard" },
				"location":     { "type": "text" },
				"address":      { "type": "keyword" },
				"city":         { "type": "keyword" },
				"country":      { "type": "keyword" },
				"status":       { "type": "keyword" },
				"star_rating":  { "type": "integer" },
				"avg_rating":   { "type": "float" },
				"review_count": { "type": "integer" },
				"amenities":    { "type": "keyword" },
				"min_price":    { "type": "float" },
				"geo_location": { "type": "geo_point" },
				"created_at":   { "type": "date" }
			}
		}
	}`
)

// NewClient creates an Elasticsearch client pointing at the given URL.
func NewClient(url string) (*elasticsearch.Client, error) {
	cfg := elasticsearch.Config{
		Addresses: []string{url},
	}
	client, err := elasticsearch.NewClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create Elasticsearch client: %w", err)
	}
	return client, nil
}

// EnsureIndex creates the hotel index if it does not already exist.
func EnsureIndex(client *elasticsearch.Client) error {
	res, err := client.Indices.Exists([]string{HotelIndex})
	if err != nil {
		return fmt.Errorf("checking index existence: %w", err)
	}
	res.Body.Close()

	if res.StatusCode == 200 {
		// Index already exists.
		return nil
	}

	res, err = client.Indices.Create(
		HotelIndex,
		client.Indices.Create.WithBody(strings.NewReader(HotelIndexMapping)),
	)
	if err != nil {
		return fmt.Errorf("creating index: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("error creating index: %s", res.String())
	}
	return nil
}
