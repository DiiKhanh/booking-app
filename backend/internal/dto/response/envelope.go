package response

// Meta holds pagination metadata for list responses.
type Meta struct {
	Total  int `json:"total"`
	Page   int `json:"page"`
	Limit  int `json:"limit"`
	Pages  int `json:"pages"`
}

// APIResponse is the standard envelope for all API responses.
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// OK returns a successful response with data.
func OK(data interface{}) APIResponse {
	return APIResponse{Success: true, Data: data}
}

// OKList returns a successful paginated list response.
func OKList(data interface{}, meta Meta) APIResponse {
	return APIResponse{Success: true, Data: data, Meta: &meta}
}

// Fail returns an error response.
func Fail(message string) APIResponse {
	return APIResponse{Success: false, Error: message}
}
