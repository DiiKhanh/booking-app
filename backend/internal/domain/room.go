package domain

type Room struct {
	ID       int     `json:"id" db:"id"`
	HotelID  int     `json:"hotel_id" db:"hotel_id"`
	Name     string  `json:"name" db:"name"`
	Capacity int     `json:"capacity" db:"capacity"`
	Price    float64 `json:"price_per_night" db:"price_per_night"`
}
