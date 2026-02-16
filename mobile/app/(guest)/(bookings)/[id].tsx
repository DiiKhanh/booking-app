import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card, StatusBadge, Skeleton } from "@/components/ui";
import { useBookingDetail } from "@/hooks/useBookings";
import { formatDateRange, formatCurrency, calculateNights } from "@/utils/format";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: booking, isLoading } = useBookingDetail(id);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <View className="p-6 gap-4">
          <Skeleton height={24} width="70%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={100} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-neutral-500 font-body">Booking not found</Text>
      </View>
    );
  }

  const nights = calculateNights(booking.checkIn, booking.checkOut);

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center px-4 pb-3 border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-4 text-lg font-heading-semi text-neutral-900">
          Booking Details
        </Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-heading text-neutral-900">
            {booking.hotelName}
          </Text>
          <StatusBadge status={booking.status} />
        </View>

        <Text className="mb-6 text-sm text-neutral-500 font-body">
          {booking.roomName}
        </Text>

        <Card variant="outlined" className="mb-4">
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500 font-body">Dates</Text>
              <Text className="text-sm font-body-medium text-neutral-700">
                {formatDateRange(booking.checkIn, booking.checkOut)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500 font-body">
                Duration
              </Text>
              <Text className="text-sm font-body-medium text-neutral-700">
                {nights} night(s)
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500 font-body">
                Guests
              </Text>
              <Text className="text-sm font-body-medium text-neutral-700">
                {booking.guests}
              </Text>
            </View>
            <View className="border-t border-neutral-100 pt-3 flex-row justify-between">
              <Text className="text-base font-heading-semi text-neutral-900">
                Total
              </Text>
              <Text className="text-lg font-price text-accent-500">
                {formatCurrency(booking.totalPrice, booking.currency)}
              </Text>
            </View>
          </View>
        </Card>

        <Text className="mt-2 text-xs text-neutral-400 font-body">
          Booking ID: {booking.id}
        </Text>
      </ScrollView>
    </View>
  );
}
