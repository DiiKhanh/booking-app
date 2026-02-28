package handler

import (
	"booking-app/internal/domain"
	"booking-app/internal/dto/response"
	"booking-app/internal/service"
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// SearchServiceInterface defines what the search handler needs from the service.
type SearchServiceInterface interface {
	SearchHotels(ctx context.Context, params domain.SearchParams) ([]*domain.Hotel, int, error)
	IndexHotel(ctx context.Context, hotel *domain.Hotel) error
	BulkIndexHotels(ctx context.Context, hotels []*domain.Hotel) error
	DeleteHotel(ctx context.Context, id int) error
}

// SearchHandler handles GET /api/v1/hotels/search.
type SearchHandler struct {
	svc SearchServiceInterface
}

// NewSearchHandler creates a new SearchHandler.
func NewSearchHandler(svc SearchServiceInterface) *SearchHandler {
	return &SearchHandler{svc: svc}
}

// Search handles GET /api/v1/hotels/search.
//
// Query params:
//
//	lat      float  required — latitude
//	lng      float  required — longitude
//	radius   float  optional — search radius km (default 50)
//	price_min float optional
//	price_max float optional
//	amenities string optional — comma-separated
//	guests   int    optional
//	check_in  string optional — YYYY-MM-DD
//	check_out string optional — YYYY-MM-DD
//	page     int    optional (default 1)
//	limit    int    optional (default 20)
//	sort     string optional — "distance" | "price" (default "distance")
func (h *SearchHandler) Search(c *gin.Context) {
	params, err := parseSearchParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	hotels, total, err := h.svc.SearchHotels(ctx, params)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrBadRequest):
			c.JSON(http.StatusBadRequest, response.Fail(err.Error()))
		default:
			c.JSON(http.StatusInternalServerError, response.Fail("internal server error"))
		}
		return
	}

	page, limit := params.Page, params.Limit
	pages := calculatePages(total, limit)
	c.JSON(http.StatusOK, response.OKList(
		response.NewHotelListResponse(hotels),
		response.Meta{Total: total, Page: page, Limit: limit, Pages: pages},
	))
}

// parseSearchParams parses and validates query parameters into a SearchParams struct.
func parseSearchParams(c *gin.Context) (domain.SearchParams, error) {
	var params domain.SearchParams

	latStr := c.Query("lat")
	lngStr := c.Query("lng")

	if latStr == "" {
		return params, errors.New("lat is required")
	}
	if lngStr == "" {
		return params, errors.New("lng is required")
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		return params, errors.New("lat must be a valid float")
	}
	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		return params, errors.New("lng must be a valid float")
	}
	params.Lat = &lat
	params.Lng = &lng

	if r := c.Query("radius"); r != "" {
		if v, err := strconv.ParseFloat(r, 64); err == nil {
			params.RadiusKm = v
		}
	}

	if v := c.Query("price_min"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			params.PriceMin = &f
		}
	}
	if v := c.Query("price_max"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			params.PriceMax = &f
		}
	}

	if v := c.Query("guests"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			params.Guests = &n
		}
	}

	if v := c.Query("check_in"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			params.CheckIn = &t
		}
	}
	if v := c.Query("check_out"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			params.CheckOut = &t
		}
	}

	if v := c.Query("amenities"); v != "" {
		params.Amenities = splitCSV(v)
	}

	params.Page = queryIntDefault(c, "page", 1)
	params.Limit = queryIntDefault(c, "limit", 20)

	if sort := c.Query("sort"); sort == string(domain.SearchSortPrice) {
		params.Sort = domain.SearchSortPrice
	} else {
		params.Sort = domain.SearchSortDistance
	}

	return params, nil
}

// splitCSV splits a comma-separated string into a trimmed slice.
func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := make([]string, 0)
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			part := trimSpace(s[start:i])
			if part != "" {
				parts = append(parts, part)
			}
			start = i + 1
		}
	}
	return parts
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}

// getUserIDFromContext is declared in booking_handler.go (shared within handler package).
// searchSvc dependency uses service.SearchServiceInterface via the interface defined above.
var _ SearchServiceInterface = (*service.SearchService)(nil)
