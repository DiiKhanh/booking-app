package domain

type Hotel struct {
	ID       int    `json:"id" db:"id"`
	Name     string `json:"name" db:"name"`
	Location string `json:"location" db:"location"`
}
