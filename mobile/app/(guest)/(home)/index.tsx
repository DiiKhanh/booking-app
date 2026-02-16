import { View, Text, ScrollView, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card, Skeleton } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useTrendingHotels } from "@/hooks/useHotels";

const POPULAR_DESTINATIONS = [
  { id: "1", name: "Bali", emoji: "🏝️" },
  { id: "2", name: "Tokyo", emoji: "🗼" },
  { id: "3", name: "Paris", emoji: "🗼" },
  { id: "4", name: "New York", emoji: "🗽" },
  { id: "5", name: "London", emoji: "🎡" },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userName } = useAuth();

  const { data: trendingHotels, isLoading } = useTrendingHotels();

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 20 }}
    >
      <View className="px-6 mb-6">
        <Text className="text-sm text-neutral-500 font-body">Welcome back,</Text>
        <Text className="text-2xl font-heading text-primary-500">
          {userName}
        </Text>
      </View>

      <TouchableOpacity
        className="mx-6 mb-6 flex-row items-center rounded-lg bg-white px-4 py-3 shadow-sm shadow-black/5"
        onPress={() => router.push("/(guest)/(search)/")}
      >
        <Ionicons name="search-outline" size={20} color="#94A3B8" />
        <Text className="ml-3 flex-1 text-base text-neutral-400 font-body">
          Where are you going?
        </Text>
        <Ionicons name="options-outline" size={20} color="#94A3B8" />
      </TouchableOpacity>

      <View className="mb-6">
        <Text className="mb-3 px-6 text-lg font-heading-semi text-neutral-900">
          Popular Destinations
        </Text>
        <FlatList
          data={POPULAR_DESTINATIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="items-center rounded-lg bg-white px-5 py-3 shadow-sm shadow-black/5"
              onPress={() =>
                router.push({
                  pathname: "/(guest)/(search)/",
                  params: { query: item.name },
                })
              }
            >
              <Text className="text-2xl mb-1">{item.emoji}</Text>
              <Text className="text-sm font-body-medium text-neutral-700">
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View className="px-6">
        <Text className="mb-3 text-lg font-heading-semi text-neutral-900">
          Trending Hotels
        </Text>
        {isLoading ? (
          <View className="gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton height={160} borderRadius={12} />
                <View className="mt-3">
                  <Skeleton height={18} width="60%" />
                </View>
                <View className="mt-2">
                  <Skeleton height={14} width="40%" />
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <View className="gap-4">
            {(trendingHotels?.data ?? []).map((hotel) => (
              <TouchableOpacity
                key={hotel.id}
                onPress={() =>
                  router.push(`/(guest)/(home)/hotel/${hotel.id}`)
                }
              >
                <Card>
                  <View className="h-40 rounded-lg bg-neutral-200 items-center justify-center">
                    <Ionicons name="image-outline" size={40} color="#94A3B8" />
                  </View>
                  <View className="mt-3">
                    <Text className="text-base font-heading-semi text-neutral-900">
                      {hotel.name}
                    </Text>
                    <View className="mt-1 flex-row items-center">
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#94A3B8"
                      />
                      <Text className="ml-1 text-sm text-neutral-500 font-body">
                        {hotel.city}, {hotel.country}
                      </Text>
                    </View>
                    <View className="mt-2 flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text className="ml-1 text-sm font-body-medium text-neutral-700">
                          {hotel.rating}
                        </Text>
                        <Text className="ml-1 text-xs text-neutral-400 font-body">
                          ({hotel.reviewCount})
                        </Text>
                      </View>
                      <Text className="text-base font-price text-accent-500">
                        ${hotel.priceRange.min}/night
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
