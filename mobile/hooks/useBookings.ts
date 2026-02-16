import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { bookingService } from "@/services/booking.service";
import type { CreateBookingRequest } from "@/types";

export function useBookingsList() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingService.list(),
  });
}

export function useBookingDetail(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingService.getById(id),
    enabled: !!id,
  });
}

export function useBookingStatus(id: string, enabled = false) {
  return useQuery({
    queryKey: ["booking", id, "status"],
    queryFn: () => bookingService.getStatus(id),
    enabled: !!id && enabled,
    refetchInterval: 5000,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bookingService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
