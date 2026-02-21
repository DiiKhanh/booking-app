import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import { Card, Skeleton } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useTrendingHotels } from "@/hooks/useHotels";
import { useAppStore } from "@/stores/app.store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HOTEL_CARD_WIDTH = SCREEN_WIDTH * 0.7;

const POPULAR_DESTINATIONS = [
  { id: "1", name: "Bali", emoji: "🏝️", hotels: "2,340" },
  { id: "2", name: "Tokyo", emoji: "🗼", hotels: "1,890" },
  { id: "3", name: "Paris", emoji: "🇫🇷", hotels: "3,120" },
  { id: "4", name: "New York", emoji: "🗽", hotels: "4,560" },
  { id: "5", name: "London", emoji: "🎡", hotels: "2,780" },
  { id: "6", name: "Dubai", emoji: "🏙️", hotels: "1,650" },
];

const QUICK_CATEGORIES = [
  { id: "1", icon: "flame-outline" as const, label: "Trending", color: "#FF5733" },
  { id: "2", icon: "diamond-outline" as const, label: "Luxury", color: "#6366F1" },
  { id: "3", icon: "wallet-outline" as const, label: "Budget", color: "#10B981" },
  { id: "4", icon: "heart-outline" as const, label: "Romance", color: "#EC4899" },
  { id: "5", icon: "business-outline" as const, label: "Business", color: "#F59E0B" },
];

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  readonly title: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-between px-6">
      <Text
        className="text-lg text-neutral-900"
        style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
      >
        {title}
      </Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} className="flex-row items-center gap-1">
          <Text
            className="text-sm"
            style={{ fontFamily: "Inter-Medium", color: "#FF5733" }}
          >
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#FF5733" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userName } = useAuth();
  const { isGuestMode } = useAppStore();

  const { data: trendingHotels, isLoading } = useTrendingHotels();

  const displayName = isGuestMode ? "Explorer" : userName || "there";

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 17
        ? "Good Afternoon"
        : "Good Evening";

  return (
    <View className="flex-1 bg-neutral-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ===== HERO HEADER ===== */}
        <LinearGradient
          colors={["#0C1930", "#1A3A6B"]}
          style={{ paddingTop: insets.top + 8 }}
        >
          {/* Top bar */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            className="flex-row items-center justify-between px-6 pb-5"
          >
            <View>
              <Text
                className="text-sm"
                style={{
                  fontFamily: "Inter-Regular",
                  color: "rgba(255, 255, 255, 0.6)",
                }}
              >
                {greeting} 👋
              </Text>
              <Text
                className="mt-0.5 text-xl text-white"
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
              >
                {displayName}
              </Text>
            </View>

            <View className="flex-row items-center gap-3">
              {isGuestMode && (
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  className="rounded-full px-3 py-1.5"
                  style={{ backgroundColor: "rgba(255, 87, 51, 0.2)" }}
                >
                  <Text
                    className="text-xs"
                    style={{ fontFamily: "Inter-Medium", color: "#FF5733" }}
                  >
                    Sign In
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="rgba(255, 255, 255, 0.8)"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Search Bar */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <TouchableOpacity
              className="mx-6 mb-6 flex-row items-center rounded-2xl px-4 py-3.5"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
              onPress={() => router.push("/(guest)/(search)/")}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
              <Text
                className="ml-3 flex-1 text-sm"
                style={{
                  fontFamily: "Inter-Regular",
                  color: "rgba(255, 255, 255, 0.4)",
                }}
              >
                Where are you going?
              </Text>
              <View
                className="h-8 w-px"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              />
              <TouchableOpacity className="ml-3">
                <Ionicons
                  name="options-outline"
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Categories */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <FlatList
              data={QUICK_CATEGORIES}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 24 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="items-center gap-2 rounded-2xl px-4 py-3"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                  activeOpacity={0.7}
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text
                    className="text-xs"
                    style={{
                      fontFamily: "Inter-Medium",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Animated.View>

          {/* Curved bottom edge */}
          <View
            className="h-5 rounded-t-[24px] bg-neutral-50"
            style={{ marginTop: -1 }}
          />
        </LinearGradient>

        {/* ===== POPULAR DESTINATIONS ===== */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} className="mt-2">
          <SectionHeader
            title="Popular Destinations"
            actionLabel="See All"
            onAction={() => router.push("/(guest)/(search)/")}
          />
          <FlatList
            data={POPULAR_DESTINATIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                className="items-center rounded-2xl bg-white px-5 py-4 shadow-sm"
                style={{
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                  minWidth: 88,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/(guest)/(search)/",
                    params: { query: item.name },
                  })
                }
              >
                <Text className="text-3xl mb-2">{item.emoji}</Text>
                <Text
                  className="text-sm text-neutral-800"
                  style={{ fontFamily: "Inter-Medium" }}
                >
                  {item.name}
                </Text>
                <Text
                  className="mt-0.5 text-[11px]"
                  style={{
                    fontFamily: "Inter-Regular",
                    color: "#94A3B8",
                  }}
                >
                  {item.hotels} hotels
                </Text>
              </TouchableOpacity>
            )}
          />
        </Animated.View>

        {/* ===== SPECIAL DEALS BANNER ===== */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} className="mt-8 px-6">
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={["#FF5733", "#CC4327"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-2xl p-5"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <View className="mb-2 flex-row items-center gap-2">
                    <Ionicons name="flash" size={16} color="#FFF" />
                    <Text
                      className="text-xs uppercase tracking-wider text-white"
                      style={{ fontFamily: "Inter-Medium" }}
                    >
                      Limited Offer
                    </Text>
                  </View>
                  <Text
                    className="text-xl text-white"
                    style={{ fontFamily: "PlusJakartaSans-Bold", lineHeight: 26 }}
                  >
                    Up to 40% Off{"\n"}Weekend Stays
                  </Text>
                  <Text
                    className="mt-2 text-xs"
                    style={{
                      fontFamily: "Inter-Regular",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    Book before Feb 28 · Use code: STAY40
                  </Text>
                </View>
                <View
                  className="h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                >
                  <Text className="text-3xl">🎉</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ===== TRENDING HOTELS ===== */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)} className="mt-8">
          <SectionHeader
            title="Trending Hotels"
            actionLabel="View All"
            onAction={() => router.push("/(guest)/(search)/")}
          />
          {isLoading ? (
            <FlatList
              data={[1, 2, 3]}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
              keyExtractor={(item) => String(item)}
              renderItem={() => (
                <View
                  className="rounded-2xl bg-white overflow-hidden"
                  style={{ width: HOTEL_CARD_WIDTH }}
                >
                  <Skeleton height={180} borderRadius={0} />
                  <View className="p-4">
                    <Skeleton height={18} width="70%" />
                    <View className="mt-2">
                      <Skeleton height={14} width="50%" />
                    </View>
                    <View className="mt-3">
                      <Skeleton height={14} width="35%" />
                    </View>
                  </View>
                </View>
              )}
            />
          ) : (
            <FlatList
              data={trendingHotels?.data ?? []}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item: hotel }) => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={{ width: HOTEL_CARD_WIDTH }}
                  onPress={() =>
                    router.push(`/(guest)/(home)/hotel/${hotel.id}`)
                  }
                >
                  <View
                    className="overflow-hidden rounded-2xl bg-white"
                    style={{
                      shadowColor: "#0F172A",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06,
                      shadowRadius: 12,
                      elevation: 3,
                    }}
                  >
                    {/* Image Placeholder */}
                    <View className="h-44 items-center justify-center bg-neutral-200">
                      <Ionicons name="image-outline" size={40} color="#CBD5E1" />
                      {/* Rating Badge */}
                      <View
                        className="absolute left-3 top-3 flex-row items-center gap-1 rounded-full px-2.5 py-1"
                        style={{ backgroundColor: "rgba(15, 23, 42, 0.65)" }}
                      >
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text
                          className="text-xs text-white"
                          style={{ fontFamily: "Inter-Medium" }}
                        >
                          {hotel.rating}
                        </Text>
                      </View>
                      {/* Favorite Button */}
                      <TouchableOpacity
                        className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
                      >
                        <Ionicons name="heart-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Info */}
                    <View className="p-4">
                      <Text
                        className="text-base text-neutral-900"
                        style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                        numberOfLines={1}
                      >
                        {hotel.name}
                      </Text>
                      <View className="mt-1.5 flex-row items-center">
                        <Ionicons name="location-outline" size={13} color="#94A3B8" />
                        <Text
                          className="ml-1 text-xs"
                          style={{
                            fontFamily: "Inter-Regular",
                            color: "#94A3B8",
                          }}
                          numberOfLines={1}
                        >
                          {hotel.city}, {hotel.country}
                        </Text>
                      </View>
                      <View className="mt-3 flex-row items-end justify-between">
                        <View className="flex-row items-baseline">
                          <Text
                            className="text-lg"
                            style={{
                              fontFamily: "DMSans-Bold",
                              color: "#FF5733",
                            }}
                          >
                            ${hotel.priceRange.min}
                          </Text>
                          <Text
                            className="ml-1 text-xs"
                            style={{
                              fontFamily: "Inter-Regular",
                              color: "#94A3B8",
                            }}
                          >
                            /night
                          </Text>
                        </View>
                        <Text
                          className="text-xs"
                          style={{
                            fontFamily: "Inter-Regular",
                            color: "#94A3B8",
                          }}
                        >
                          {hotel.reviewCount} reviews
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </Animated.View>

        {/* ===== EXPLORE NEARBY — CTA ===== */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)} className="mt-8 px-6">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(guest)/(search)/map")}
          >
            <View
              className="overflow-hidden rounded-2xl bg-primary-500"
              style={{
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <LinearGradient
                colors={["#112443", "#1A3A6B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="flex-row items-center justify-between p-5"
              >
                <View className="flex-1">
                  <Text
                    className="text-lg text-white"
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  >
                    Explore Nearby
                  </Text>
                  <Text
                    className="mt-1 text-xs"
                    style={{
                      fontFamily: "Inter-Regular",
                      color: "rgba(255, 255, 255, 0.5)",
                    }}
                  >
                    Discover hotels around your area on the map
                  </Text>
                </View>
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                >
                  <Ionicons name="map-outline" size={24} color="#FF5733" />
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
