import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button } from "@/components/ui";
import { useSearchHotels } from "@/hooks/useHotels";
import { formatCurrency } from "@/utils/format";
import type { Hotel } from "@/types";

function PropertyCard({ hotel, index }: { hotel: Hotel; index: number }) {
  const router = useRouter();

  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: "Active", color: "#10B981", bg: "#D1FAE5" },
    pending: { label: "Pending Review", color: "#F59E0B", bg: "#FEF3C7" },
    rejected: { label: "Rejected", color: "#EF4444", bg: "#FEE2E2" },
  };
  const badge = statusMap[hotel.status ?? "pending"] ?? statusMap.pending;

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(380)}>
      <TouchableOpacity
        onPress={() => router.push(`/(owner)/(properties)/${hotel.id}`)}
        className="bg-white rounded-2xl mx-6 mb-3 overflow-hidden"
        style={{
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
        activeOpacity={0.8}
      >
        {/* Image placeholder */}
        <View className="h-36 bg-neutral-100 items-center justify-center">
          <Ionicons name="image-outline" size={40} color="#CBD5E1" />
          {/* Status badge */}
          <View
            className="absolute top-3 right-3 rounded-full px-2.5 py-1"
            style={{ backgroundColor: badge.bg }}
          >
            <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: badge.color }}>
              {badge.label}
            </Text>
          </View>
        </View>

        <View className="p-4">
          <Text
            className="text-base text-neutral-900"
            style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
            numberOfLines={1}
          >
            {hotel.name}
          </Text>
          <View className="flex-row items-center mt-1 gap-1">
            <Ionicons name="location-outline" size={13} color="#94A3B8" />
            <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
              {hotel.city}, {hotel.country}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mt-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#475569" }}>
                {hotel.rating?.toFixed(1) ?? "—"} ({hotel.reviewCount ?? 0})
              </Text>
            </View>
            <Text className="text-base" style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}>
              {formatCurrency(hotel.priceRange?.min ?? 0, hotel.priceRange?.currency ?? "USD")}
              <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                {" "}/night
              </Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PropertiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, refetch, isRefetching } = useSearchHotels({ limit: 50 });
  const hotels = data?.data ?? [];

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-6 pb-4 bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View>
          <Text className="text-xs uppercase tracking-wide" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
            Properties
          </Text>
          <Text className="text-2xl" style={{ fontFamily: "PlusJakartaSans-Bold", color: "#1A3A6B" }}>
            My Hotels
          </Text>
        </View>
        <Button
          title="Add Hotel"
          size="sm"
          onPress={() => router.push("/(owner)/(properties)/create")}
        />
      </View>

      <FlatList
        data={hotels}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <PropertyCard hotel={item} index={index} />}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5733" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20 px-6">
              <View
                className="h-20 w-20 items-center justify-center rounded-full mb-4"
                style={{ backgroundColor: "#F1F5F9" }}
              >
                <Ionicons name="business-outline" size={36} color="#CBD5E1" />
              </View>
              <Text className="text-base text-neutral-900 mb-1" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
                No Properties Yet
              </Text>
              <Text className="text-sm text-center mb-6" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                Add your first hotel to start accepting bookings
              </Text>
              <Button
                title="Add Your First Hotel"
                onPress={() => router.push("/(owner)/(properties)/create")}
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}
