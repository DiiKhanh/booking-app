import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card, Badge, Skeleton } from "@/components/ui";
import { useHotelDetail, useHotelRooms } from "@/hooks/useHotels";
import { formatCurrency, formatRating } from "@/utils/format";

export default function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: hotel, isLoading } = useHotelDetail(id);
  const { data: rooms, isLoading: roomsLoading } = useHotelRooms(id);

  if (isLoading) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <Skeleton height={280} borderRadius={0} />
        <View className="p-6 gap-3">
          <Skeleton height={24} width="70%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={16} width="30%" />
        </View>
      </View>
    );
  }

  if (!hotel) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-neutral-500 font-body">Hotel not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="h-72 bg-neutral-200 items-center justify-center">
          <Ionicons name="image-outline" size={60} color="#94A3B8" />
        </View>

        <TouchableOpacity
          className="absolute left-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm"
          style={{ top: insets.top + 8 }}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>

        <View className="p-6">
          <Text className="text-2xl font-heading text-neutral-900">
            {hotel.name}
          </Text>
          <View className="mt-2 flex-row items-center">
            <Ionicons name="location-outline" size={16} color="#94A3B8" />
            <Text className="ml-1 text-sm text-neutral-500 font-body">
              {hotel.address}, {hotel.city}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center gap-3">
            <View className="flex-row items-center rounded-full bg-warning-500/10 px-2.5 py-1">
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text className="ml-1 text-sm font-heading-semi text-warning-600">
                {formatRating(hotel.rating)}
              </Text>
            </View>
            <Text className="text-sm text-neutral-400 font-body">
              {hotel.reviewCount} reviews
            </Text>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {hotel.amenities.map((amenity) => (
              <Badge key={amenity} label={amenity} variant="info" />
            ))}
          </View>

          <Text className="mt-6 text-base text-neutral-700 font-body leading-6">
            {hotel.description}
          </Text>

          <Text className="mt-8 mb-4 text-lg font-heading-semi text-neutral-900">
            Available Rooms
          </Text>

          {roomsLoading ? (
            <View className="gap-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <Skeleton height={100} />
                </Card>
              ))}
            </View>
          ) : (
            <View className="gap-3">
              {(rooms ?? []).map((room) => (
                <Card key={room.id} variant="outlined">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-heading-semi text-neutral-900">
                        {room.name}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-2">
                        <Ionicons
                          name="people-outline"
                          size={14}
                          color="#94A3B8"
                        />
                        <Text className="text-sm text-neutral-500 font-body">
                          Up to {room.capacity} guests
                        </Text>
                      </View>
                      <Text className="mt-2 text-lg font-price text-accent-500">
                        {formatCurrency(room.pricePerNight, room.currency)}
                        <Text className="text-sm text-neutral-400 font-body">
                          /night
                        </Text>
                      </Text>
                    </View>
                    <Button
                      title="Book"
                      size="sm"
                      onPress={() =>
                        router.push(`/(guest)/(home)/booking/${room.id}`)
                      }
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
