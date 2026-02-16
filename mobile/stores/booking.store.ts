import { create } from "zustand";
import type { BookingStatus } from "@/types";

interface BookingDraft {
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

interface BookingState {
  readonly draft: BookingDraft | null;
  readonly currentBookingId: string | null;
  readonly sagaStatus: BookingStatus | null;
}

interface BookingActions {
  setDraft: (draft: BookingDraft) => void;
  clearDraft: () => void;
  setCurrentBookingId: (id: string) => void;
  setSagaStatus: (status: BookingStatus) => void;
  reset: () => void;
}

type BookingStore = BookingState & BookingActions;

const initialState: BookingState = {
  draft: null,
  currentBookingId: null,
  sagaStatus: null,
};

export const useBookingStore = create<BookingStore>()((set) => ({
  ...initialState,

  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
  setCurrentBookingId: (currentBookingId) => set({ currentBookingId }),
  setSagaStatus: (sagaStatus) => set({ sagaStatus }),
  reset: () => set(initialState),
}));
