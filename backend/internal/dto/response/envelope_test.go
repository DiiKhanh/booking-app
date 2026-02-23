package response_test

import (
	"booking-app/internal/dto/response"
	"testing"
)

func TestOK(t *testing.T) {
	data := map[string]string{"key": "value"}
	r := response.OK(data)

	if !r.Success {
		t.Error("expected Success=true")
	}
	if r.Error != "" {
		t.Errorf("expected empty Error, got %q", r.Error)
	}
	if r.Meta != nil {
		t.Error("expected nil Meta for non-list response")
	}
	if r.Data == nil {
		t.Error("expected non-nil Data")
	}
}

func TestOKList(t *testing.T) {
	data := []string{"a", "b"}
	meta := response.Meta{Total: 2, Page: 1, Limit: 10, Pages: 1}
	r := response.OKList(data, meta)

	if !r.Success {
		t.Error("expected Success=true")
	}
	if r.Meta == nil {
		t.Fatal("expected non-nil Meta")
	}
	if r.Meta.Total != 2 {
		t.Errorf("expected Total=2, got %d", r.Meta.Total)
	}
}

func TestFail(t *testing.T) {
	r := response.Fail("something went wrong")

	if r.Success {
		t.Error("expected Success=false")
	}
	if r.Error != "something went wrong" {
		t.Errorf("unexpected error message: %q", r.Error)
	}
	if r.Data != nil {
		t.Error("expected nil Data on failure")
	}
}
