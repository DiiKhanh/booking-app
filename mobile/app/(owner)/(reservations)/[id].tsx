import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useBookingDetail } from "@/hooks/useBookings";
import { bookingService } from "@/services/booking.service";
import { formatCurrency, formatDateRange, calculateNights } from "@/utils/format";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "Confirmed", color: "#10B981", bg: "#D1FAE5" },
  pending: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7" },
  awaiting_payment: { label: "Awaiting Payment", color: "#3B82F6", bg: "#DBEAFE" },
  processing: { label: "Processing", color: "#8B5CF6", bg: "#EDE9FE" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "#FEE2E2" },
  failed: { label: "Failed", color: "#EF4444", bg: "#FEE2E2" },
};

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-neutral-50">
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color="#94A3B8" />
        <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>{label}</Text>
      </View>
      <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>{value}</Text>
    </View>
  );
}

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useBookingDetail(id);

  const cancelMutation = useMutation({
    mutationFn: () => bookingService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      router.back();
    },
  });

  const handleCancel = () => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: () => cancelMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading || !booking) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-neutral-400" style={{ fontFamily: "Inter-Regular" }}>
          Loading...
        </Text>
      </View>
    );
  }

  const config = STATUS_CONFIG[booking.status ?? "pending"] ?? STATUS_CONFIG.pending;
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const canCancel = booking.status === "pending" || booking.status === "awaiting_payment";

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-3 border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text
          className="ml-4 text-lg text-neutral-900"
          style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
        >
          Reservation Detail
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View className="mx-6 mt-5 rounded-2xl p-4" style={{ backgroundColor: config.bg }}>
          <View className="flex-row items-center gap-3">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: config.color + "20" }}
            >
              <Ionicons name="receipt-outline" size={20} color={config.color} />
            </View>
            <View>
              <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: config.color }}>
                Status
              </Text>
              <Text className="text-base" style={{ fontFamily: "PlusJakartaSans-SemiBold", color: config.color }}>
                {config.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Booking ID */}
        <View className="mx-6 mt-5">
          <Text
            className="text-xs uppercase tracking-wide mb-3"
            style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}
          >
            Booking Details
          </Text>
          <View className="rounded-2xl border border-neutral-100 px-4">
            <InfoRow
              icon="receipt-outline"
              label="Booking ID"
              value={`#${booking.id.slice(-8).toUpperCase()}`}
            />
            <InfoRow
              icon="calendar-outline"
              label="Dates"
              value={formatDateRange(booking.checkIn, booking.checkOut)}
            />
            <InfoRow
              icon="moon-outline"
              label="Duration"
              value={`${nights} night${nights !== 1 ? "s" : ""}`}
            />
            <InfoRow
              icon="people-outline"
              label="Guests"
              value={`${booking.guests ?? 1} guest${(booking.guests ?? 1) > 1 ? "s" : ""}`}
            />
          </View>
        </View>

        {/* Price Breakdown */}
        <View className="mx-6 mt-5">
          <Text
            className="text-xs uppercase tracking-wide mb-3"
            style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}
          >
            Price Breakdown
          </Text>
          <View className="rounded-2xl p-4" style={{ backgroundColor: "#F8FAFC" }}>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
                Room rate × {nights} nights
              </Text>
              <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                {formatCurrency((booking.totalPrice ?? 0) / 1.1, "USD")}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
                Taxes & fees (10%)
              </Text>
              <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#334155" }}>
                {formatCurrency((booking.totalPrice ?? 0) * 0.1 / 1.1, "USD")}
              </Text>
            </View>
            <View className="flex-row justify-between pt-3 border-t border-neutral-200">
              <Text className="text-base" style={{ fontFamily: "PlusJakartaSans-SemiBold", color: "#1E293B" }}>
                Total
              </Text>
              <Text className="text-xl" style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}>
                {formatCurrency(booking.totalPrice ?? 0, "USD")}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>

      {/* Action buttons */}
      {canCancel && (
        <View
          className="border-t border-neutral-100 px-6 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <TouchableOpacity
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
            className="w-full items-center justify-center rounded-2xl py-4 border-2 border-red-200"
            style={{ backgroundColor: cancelMutation.isPending ? "#F8FAFC" : "#FEF2F2" }}
          >
            <Text className="text-base" style={{ fontFamily: "Inter-Medium", color: "#EF4444" }}>
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
