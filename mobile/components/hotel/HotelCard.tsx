"use client";

import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { Hotel } from "@/types";
import { formatCurrency } from "@/utils/format";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HotelCardProps {
  readonly hotel: Hotel;
  readonly index?: number;
  readonly variant?: "horizontal" | "vertical";
  readonly onFavorite?: (id: string) => void;
}

export function HotelCard({
  hotel,
  index = 0,
  variant = "vertical",
  onFavorite,
}: HotelCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/(guest)/(home)/hotel/${hotel.id}`);
  };

  if (variant === "horizontal") {
    return (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          className="flex-row overflow-hidden rounded-2xl bg-white mb-3"
          style={{
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {/* Image */}
          <View className="h-28 w-28 items-center justify-center bg-neutral-200 rounded-l-2xl">
            <Ionicons name="image-outline" size={28} color="#CBD5E1" />
          </View>

          {/* Info */}
          <View className="flex-1 p-4 justify-between">
            <View>
              <Text
                className="text-sm text-neutral-900"
                style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                numberOfLines={1}
              >
                {hotel.name}
              </Text>
              <View className="mt-1 flex-row items-center">
                <Ionicons name="location-outline" size={12} color="#94A3B8" />
                <Text
                  className="ml-1 text-xs"
                  style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                  numberOfLines={1}
                >
                  {hotel.city}, {hotel.country}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Inter-Medium", color: "#F59E0B" }}
                >
                  {hotel.rating.toFixed(1)}
                </Text>
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                >
                  ({hotel.reviewCount})
                </Text>
              </View>
              <Text
                className="text-base"
                style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}
              >
                {formatCurrency(hotel.priceRange.min, hotel.priceRange.currency)}
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                >
                  /night
                </Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Vertical card (default)
  const cardWidth = SCREEN_WIDTH * 0.7;
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={{ width: cardWidth }}
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
          {/* Image placeholder */}
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
                {hotel.rating.toFixed(1)}
              </Text>
            </View>
            {/* Favorite */}
            <TouchableOpacity
              className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
              onPress={() => onFavorite?.(hotel.id)}
            >
              <Ionicons name="heart-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>

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
                style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                numberOfLines={1}
              >
                {hotel.city}, {hotel.country}
              </Text>
            </View>
            <View className="mt-3 flex-row items-end justify-between">
              <View className="flex-row items-baseline">
                <Text
                  className="text-lg"
                  style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}
                >
                  {formatCurrency(hotel.priceRange.min, hotel.priceRange.currency)}
                </Text>
                <Text
                  className="ml-1 text-xs"
                  style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                >
                  /night
                </Text>
              </View>
              <Text
                className="text-xs"
                style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
              >
                {hotel.reviewCount} reviews
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
