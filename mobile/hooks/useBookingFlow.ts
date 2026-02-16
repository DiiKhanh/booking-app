import { useCallback } from "react";

import { useBookingStore } from "@/stores/booking.store";
import type { BookingStatus } from "@/types";

interface BookingDraftInput {
  readonly roomId: string;
  readonly hotelId: string;
  readonly hotelName: string;
  readonly roomName: string;
  readonly pricePerNight: number;
  readonly currency: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly guests: number;
}

export function useBookingFlow() {
  const draft = useBookingStore((s) => s.draft);
  const currentBookingId = useBookingStore((s) => s.currentBookingId);
  const sagaStatus = useBookingStore((s) => s.sagaStatus);

  const setDraft = useBookingStore((s) => s.setDraft);
  const clearDraft = useBookingStore((s) => s.clearDraft);
  const setCurrentBookingId = useBookingStore((s) => s.setCurrentBookingId);
  const setSagaStatus = useBookingStore((s) => s.setSagaStatus);
  const resetStore = useBookingStore((s) => s.reset);

  const startBooking = useCallback(
    (input: BookingDraftInput) => {
      setDraft(input);
    },
    [setDraft],
  );

  const updateSagaStatus = useCallback(
    (status: BookingStatus) => {
      setSagaStatus(status);
    },
    [setSagaStatus],
  );

  const reset = useCallback(() => {
    resetStore();
  }, [resetStore]);

  const isSuccess = sagaStatus === "confirmed" || sagaStatus === "completed";
  const isFailed = sagaStatus === "failed";

  return {
    draft,
    currentBookingId,
    sagaStatus,
    isSuccess,
    isFailed,

    startBooking,
    clearDraft,
    setCurrentBookingId,
    updateSagaStatus,
    reset,
  };
}
