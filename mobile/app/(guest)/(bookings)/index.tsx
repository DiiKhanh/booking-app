import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card, StatusBadge, Skeleton } from "@/components/ui";
import { useBookingsList } from "@/hooks/useBookings";
import { formatDateRange, formatCurrency } from "@/utils/format";
import type { Booking } from "@/types";

function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-base font-heading-semi text-neutral-900">
              {booking.hotelName}
            </Text>
            <Text className="mt-0.5 text-sm text-neutral-500 font-body">
              {booking.roomName}
            </Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
            <Text className="ml-1 text-sm text-neutral-500 font-body">
              {formatDateRange(booking.checkIn, booking.checkOut)}
            </Text>
          </View>
          <Text className="text-base font-price text-accent-500">
            {formatCurrency(booking.totalPrice, booking.currency)}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function BookingsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: bookings, isLoading, refetch, isRefetching } =
    useBookingsList();

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      <View className="px-6 py-4">
        <Text className="text-2xl font-heading text-neutral-900">
          My Bookings
        </Text>
      </View>

      {isLoading ? (
        <View className="px-6 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton height={16} width="60%" />
              <Skeleton height={14} width="40%" className="mt-2" />
              <Skeleton height={14} width="50%" className="mt-3" />
            </Card>
          ))}
        </View>
      ) : (
        <FlatList
          data={bookings as Booking[] | undefined}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => router.push(`/(guest)/(bookings)/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
              <Text className="mt-4 text-base font-heading-semi text-neutral-400">
                No bookings yet
              </Text>
              <Text className="mt-1 text-sm text-neutral-400 font-body">
                Start exploring to book your first stay
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
