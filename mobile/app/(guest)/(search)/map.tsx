import { useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, type Region } from "react-native-maps";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";

import { useSearch } from "@/hooks/useSearch";
import { useSearchHotels } from "@/hooks/useHotels";
import { formatCurrency } from "@/utils/format";
import type { Hotel } from "@/types";

const MOCK_HOTELS: Hotel[] = [
  {
    id: "1",
    name: "Grand Palace Hotel",
    description: "Luxury hotel in HCMC",
    address: "123 Main Street",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    latitude: 10.7769,
    longitude: 106.7009,
    rating: 4.8,
    reviewCount: 2840,
    images: [],
    amenities: ["WiFi", "Pool", "Spa"],
    priceRange: { min: 165, max: 420, currency: "USD" },
    ownerId: "o1",
    status: "approved",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-01",
  },
  {
    id: "2",
    name: "Sunrise Beach Resort",
    description: "Beachfront resort",
    address: "456 Beach Road",
    city: "Da Nang",
    country: "Vietnam",
    latitude: 16.0544,
    longitude: 108.2022,
    rating: 4.6,
    reviewCount: 1520,
    images: [],
    amenities: ["WiFi", "Beach Access"],
    priceRange: { min: 89, max: 250, currency: "USD" },
    ownerId: "o2",
    status: "approved",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-01",
  },
  {
    id: "3",
    name: "Mountain View Inn",
    description: "Mountain inn",
    address: "789 Mountain Road",
    city: "Da Lat",
    country: "Vietnam",
    latitude: 11.9404,
    longitude: 108.4583,
    rating: 4.4,
    reviewCount: 890,
    images: [],
    amenities: ["WiFi"],
    priceRange: { min: 45, max: 120, currency: "USD" },
    ownerId: "o3",
    status: "approved",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-01",
  },
];

const INITIAL_REGION: Region = {
  latitude: 14.0583,
  longitude: 108.2772,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

function PriceMarker({ price, currency, selected }: { price: number; currency: string; selected: boolean }) {
  return (
    <View
      className="rounded-full px-3 py-1.5 items-center justify-center"
      style={{
        backgroundColor: selected ? "#FF5733" : "#1A3A6B",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Text className="text-xs text-white" style={{ fontFamily: "DMSans-Bold" }}>
        {formatCurrency(price, currency)}
      </Text>
    </View>
  );
}

function HotelPreviewCard({
  hotel,
  onView,
  onClose,
}: {
  hotel: Hotel;
  onView: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutDown.duration(200)}
      className="absolute left-4 right-4 bg-white rounded-2xl overflow-hidden"
      style={{
        bottom: insets.bottom + 80,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <View className="flex-row">
        <View className="h-24 w-24 items-center justify-center bg-neutral-200">
          <Ionicons name="image-outline" size={28} color="#CBD5E1" />
        </View>
        <View className="flex-1 p-4">
          <Text
            className="text-sm text-neutral-900"
            style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
            numberOfLines={1}
          >
            {hotel.name}
          </Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#F59E0B" }}>
              {hotel.rating.toFixed(1)}
            </Text>
            <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
              · {hotel.city}
            </Text>
          </View>
          <Text className="mt-2 text-base" style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}>
            {formatCurrency(hotel.priceRange.min, hotel.priceRange.currency)}
            <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
              {" "}/night
            </Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          className="absolute right-3 top-3 h-6 w-6 items-center justify-center"
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3 px-4 pb-4">
        <TouchableOpacity
          onPress={onView}
          className="flex-1 items-center justify-center rounded-xl border border-neutral-200 py-2.5"
        >
          <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#1A3A6B" }}>
            View Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onView}
          className="flex-1 items-center justify-center rounded-xl py-2.5"
          style={{ backgroundColor: "#FF5733" }}
        >
          <Text className="text-sm text-white" style={{ fontFamily: "Inter-Medium" }}>
            Book Now
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const { query, setMapBounds } = useSearch();
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  const { data } = useSearchHotels({ query, limit: 50 }, true);
  const hotels = data?.data ?? MOCK_HOTELS;

  const handleRegionChange = useCallback(
    (newRegion: Region) => {
      setMapBounds({
        northEast: {
          lat: newRegion.latitude + newRegion.latitudeDelta / 2,
          lng: newRegion.longitude + newRegion.longitudeDelta / 2,
        },
        southWest: {
          lat: newRegion.latitude - newRegion.latitudeDelta / 2,
          lng: newRegion.longitude - newRegion.longitudeDelta / 2,
        },
      });
    },
    [setMapBounds]
  );

  const handleMarkerPress = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    mapRef.current?.animateToRegion(
      { latitude: hotel.latitude, longitude: hotel.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      400
    );
  };

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {hotels.map((hotel) => (
          <Marker
            key={hotel.id}
            coordinate={{ latitude: hotel.latitude, longitude: hotel.longitude }}
            onPress={() => handleMarkerPress(hotel)}
          >
            <PriceMarker
              price={hotel.priceRange.min}
              currency={hotel.priceRange.currency}
              selected={selectedHotel?.id === hotel.id}
            />
          </Marker>
        ))}
      </MapView>

      {/* Top bar */}
      <View
        className="absolute left-0 right-0 flex-row items-center gap-3 px-4"
        style={{ top: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-1 flex-row items-center rounded-xl bg-white px-4 py-2.5"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
        >
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <Text className="ml-2 text-sm" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
            {query || "Search on map..."}
          </Text>
        </TouchableOpacity>

        <View
          className="h-10 items-center justify-center rounded-full px-4 bg-white"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
        >
          <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#1A3A6B" }}>
            {hotels.length} hotels
          </Text>
        </View>
      </View>

      {/* Re-center button */}
      <TouchableOpacity
        className="absolute right-4 h-12 w-12 items-center justify-center rounded-full bg-white"
        style={{
          bottom: selectedHotel ? insets.bottom + 220 : insets.bottom + 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
        onPress={() => mapRef.current?.animateToRegion(INITIAL_REGION, 500)}
      >
        <Ionicons name="locate" size={22} color="#1A3A6B" />
      </TouchableOpacity>

      {/* Hotel preview card */}
      {selectedHotel && (
        <HotelPreviewCard
          hotel={selectedHotel}
          onView={() => router.push(`/(guest)/(home)/hotel/${selectedHotel.id}`)}
          onClose={() => setSelectedHotel(null)}
        />
      )}
    </View>
  );
}
