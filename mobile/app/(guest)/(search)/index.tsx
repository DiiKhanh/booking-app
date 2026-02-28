import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, SlideInRight } from "react-native-reanimated";

import { HotelCard } from "@/components/hotel/HotelCard";
import { Button } from "@/components/ui";
import { useSearch } from "@/hooks/useSearch";
import { useSearchHotels } from "@/hooks/useHotels";
import type { Hotel } from "@/types";

// --- Constants ---
const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "price", label: "Lowest Price" },
  { value: "distance", label: "Nearest" },
] as const;

const AMENITY_OPTIONS = [
  "WiFi", "Pool", "Spa", "Gym", "Restaurant",
  "Bar", "Parking", "Room Service", "Beach Access", "Pet Friendly",
];

const PRICE_PRESETS = [
  { label: "Any", min: undefined, max: undefined },
  { label: "Under $50", min: undefined, max: 50 },
  { label: "$50–$150", min: 50, max: 150 },
  { label: "$150–$300", min: 150, max: 300 },
  { label: "$300+", min: 300, max: undefined },
];

// ─── Mock Data (fallback) ──────────────────────────────────────────────
const MOCK_HOTELS: Hotel[] = [
  {
    id: "1",
    name: "Grand Palace Hotel",
    description: "Luxury hotel in the heart of the city",
    address: "123 Main Street",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    latitude: 10.7769,
    longitude: 106.7009,
    rating: 4.8,
    reviewCount: 2840,
    images: [],
    amenities: ["WiFi", "Pool", "Spa", "Restaurant"],
    priceRange: { min: 165, max: 420, currency: "USD" },
    ownerId: "o1",
    status: "approved",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-01",
  },
  {
    id: "2",
    name: "Sunrise Beach Resort",
    description: "Beachfront resort with stunning ocean views",
    address: "456 Beach Road",
    city: "Da Nang",
    country: "Vietnam",
    latitude: 16.0544,
    longitude: 108.2022,
    rating: 4.6,
    reviewCount: 1520,
    images: [],
    amenities: ["WiFi", "Beach Access", "Pool", "Bar"],
    priceRange: { min: 89, max: 250, currency: "USD" },
    ownerId: "o2",
    status: "approved",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-01",
  },
  {
    id: "3",
    name: "Mountain View Inn",
    description: "Cozy inn with breathtaking mountain views",
    address: "789 Mountain Road",
    city: "Da Lat",
    country: "Vietnam",
    latitude: 11.9404,
    longitude: 108.4583,
    rating: 4.4,
    reviewCount: 890,
    images: [],
    amenities: ["WiFi", "Restaurant", "Parking"],
    priceRange: { min: 45, max: 120, currency: "USD" },
    ownerId: "o3",
    status: "approved",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-01",
  },
  {
    id: "4",
    name: "The Royal Saigon",
    description: "5-star luxury in Saigon's finest district",
    address: "10 Dong Khoi",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    latitude: 10.7769,
    longitude: 106.7010,
    rating: 4.9,
    reviewCount: 4200,
    images: [],
    amenities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar"],
    priceRange: { min: 280, max: 850, currency: "USD" },
    ownerId: "o4",
    status: "approved",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-01",
  },
  {
    id: "5",
    name: "Hoi An Riverside",
    description: "Charming boutique hotel by the river",
    address: "22 Thu Bon River",
    city: "Hoi An",
    country: "Vietnam",
    latitude: 15.8801,
    longitude: 108.3380,
    rating: 4.7,
    reviewCount: 1180,
    images: [],
    amenities: ["WiFi", "Pool", "Restaurant", "Room Service"],
    priceRange: { min: 72, max: 180, currency: "USD" },
    ownerId: "o5",
    status: "approved",
    createdAt: "2024-01-01",
    updatedAt: "2025-01-01",
  },
];

// ─── Filter Sheet Component ─────────────────────────────────────────────
interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  sortBy: string;
  setSortBy: (v: "price" | "rating" | "distance") => void;
  priceMin?: number;
  priceMax?: number;
  setPriceRange: (min?: number, max?: number) => void;
  amenities: readonly string[];
  setAmenities: (a: string[]) => void;
  onReset: () => void;
  onApply: () => void;
}

function FilterSheet({
  visible, onClose, sortBy, setSortBy,
  priceMin, priceMax, setPriceRange,
  amenities, setAmenities,
  onReset, onApply,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [localAmenities, setLocalAmenities] = useState<string[]>([...amenities]);
  const [localPricePreset, setLocalPricePreset] = useState(0);

  const toggleAmenity = (a: string) => {
    setLocalAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleApply = () => {
    setAmenities(localAmenities);
    const preset = PRICE_PRESETS[localPricePreset];
    setPriceRange(preset.min, preset.max);
    onApply();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Handle */}
        <View className="items-center pt-3 pb-2">
          <View className="h-1 w-12 rounded-full bg-neutral-200" />
        </View>

        <View className="flex-row items-center justify-between px-6 pb-4">
          <Text
            className="text-lg text-neutral-900"
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
          >
            Filters
          </Text>
          <TouchableOpacity onPress={onReset}>
            <Text
              className="text-sm"
              style={{ fontFamily: "Inter-Medium", color: "#FF5733" }}
            >
              Reset All
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
          {/* Sort By */}
          <View className="px-6 mb-5">
            <Text
              className="mb-3 text-sm text-neutral-500 uppercase tracking-wide"
              style={{ fontFamily: "Inter-Medium" }}
            >
              Sort By
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSortBy(opt.value)}
                  className="rounded-full border px-4 py-2"
                  style={{
                    borderColor: sortBy === opt.value ? "#FF5733" : "#E2E8F0",
                    backgroundColor: sortBy === opt.value ? "#FFF0EC" : "#fff",
                  }}
                >
                  <Text
                    className="text-sm"
                    style={{
                      fontFamily: "Inter-Medium",
                      color: sortBy === opt.value ? "#FF5733" : "#64748B",
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range */}
          <View className="px-6 mb-5">
            <Text
              className="mb-3 text-sm text-neutral-500 uppercase tracking-wide"
              style={{ fontFamily: "Inter-Medium" }}
            >
              Price Per Night
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PRICE_PRESETS.map((p, i) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => setLocalPricePreset(i)}
                  className="rounded-full border px-4 py-2"
                  style={{
                    borderColor: localPricePreset === i ? "#FF5733" : "#E2E8F0",
                    backgroundColor: localPricePreset === i ? "#FFF0EC" : "#fff",
                  }}
                >
                  <Text
                    className="text-sm"
                    style={{
                      fontFamily: "Inter-Medium",
                      color: localPricePreset === i ? "#FF5733" : "#64748B",
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amenities */}
          <View className="px-6 mb-6">
            <Text
              className="mb-3 text-sm text-neutral-500 uppercase tracking-wide"
              style={{ fontFamily: "Inter-Medium" }}
            >
              Amenities
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const selected = localAmenities.includes(a);
                return (
                  <TouchableOpacity
                    key={a}
                    onPress={() => toggleAmenity(a)}
                    className="rounded-full border px-4 py-2"
                    style={{
                      borderColor: selected ? "#1A3A6B" : "#E2E8F0",
                      backgroundColor: selected ? "#E8EDF5" : "#fff",
                    }}
                  >
                    <Text
                      className="text-sm"
                      style={{
                        fontFamily: "Inter-Medium",
                        color: selected ? "#1A3A6B" : "#64748B",
                      }}
                    >
                      {a}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View className="px-6 pt-2">
          <Button
            title="Apply Filters"
            fullWidth
            size="lg"
            onPress={handleApply}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Search Screen ─────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ query?: string }>();
  const inputRef = useRef<TextInput>(null);

  const {
    query, setQuery,
    sortBy, setSortBy,
    priceMin, priceMax, setPriceRange,
    amenities, setAmenities,
    resetFilters,
  } = useSearch();

  const [localQuery, setLocalQuery] = useState(query ?? "");
  const [filterVisible, setFilterVisible] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Propagate incoming params
  useEffect(() => {
    if (params.query && params.query !== localQuery) {
      setLocalQuery(params.query);
      setQuery(params.query);
      setHasSearched(true);
    }
  }, [params.query]);

  const searchParams = {
    query: localQuery,
    priceMin,
    priceMax,
    amenities: amenities.length ? amenities : undefined,
    sortBy: sortBy as "price" | "rating" | "distance",
    limit: 20,
  };

  const { data, isLoading, isFetching } = useSearchHotels(
    searchParams,
    hasSearched && localQuery.length > 1
  );

  const hotels = data?.data ?? (hasSearched ? MOCK_HOTELS : []);

  const handleSearch = useCallback(() => {
    if (localQuery.trim().length < 1) return;
    setQuery(localQuery);
    setHasSearched(true);
    inputRef.current?.blur();
  }, [localQuery, setQuery]);

  const activeFilterCount =
    (amenities.length > 0 ? 1 : 0) +
    (priceMin !== undefined || priceMax !== undefined ? 1 : 0) +
    (sortBy !== "rating" ? 1 : 0);

  return (
    <View className="flex-1 bg-neutral-50">
      {/* ── Header ── */}
      <View
        className="bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-3 px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>

          {/* Search Input */}
          <View className="flex-1 flex-row items-center rounded-xl bg-neutral-100 px-4 py-2.5">
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              ref={inputRef}
              className="ml-2 flex-1 text-sm text-neutral-900"
              style={{ fontFamily: "Inter-Regular" }}
              placeholder="Destinations, hotels..."
              placeholderTextColor="#94A3B8"
              value={localQuery}
              onChangeText={setLocalQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus={!params.query}
            />
            {localQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setLocalQuery("");
                  setQuery("");
                  setHasSearched(false);
                }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: activeFilterCount > 0 ? "#FFF0EC" : "#F1F5F9",
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilterCount > 0 ? "#FF5733" : "#64748B"}
            />
            {activeFilterCount > 0 && (
              <View
                className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: "#FF5733" }}
              >
                <Text className="text-[10px] text-white" style={{ fontFamily: "Inter-Medium" }}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Map Button */}
          <TouchableOpacity
            onPress={() => router.push("/(guest)/(search)/map")}
            className="h-10 w-10 items-center justify-center rounded-xl bg-primary-500"
          >
            <Ionicons name="map-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}
          >
            {sortBy !== "rating" && (
              <View
                className="flex-row items-center gap-1 rounded-full px-3 py-1"
                style={{ backgroundColor: "#E8EDF5" }}
              >
                <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#1A3A6B" }}>
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                </Text>
              </View>
            )}
            {amenities.slice(0, 3).map((a) => (
              <View
                key={a}
                className="flex-row items-center gap-1 rounded-full px-3 py-1"
                style={{ backgroundColor: "#E8EDF5" }}
              >
                <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#1A3A6B" }}>
                  {a}
                </Text>
              </View>
            ))}
            {amenities.length > 3 && (
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: "#E8EDF5" }}>
                <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#1A3A6B" }}>
                  +{amenities.length - 3} more
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* ── Content ── */}
      {!hasSearched ? (
        // Empty state before search
        <Animated.View entering={FadeIn} className="flex-1 items-center justify-center px-6">
          <View
            className="mb-5 h-20 w-20 items-center justify-center rounded-3xl"
            style={{ backgroundColor: "#E8EDF5" }}
          >
            <Ionicons name="search" size={36} color="#1A3A6B" />
          </View>
          <Text
            className="text-xl text-neutral-900"
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
          >
            Find Your Stay
          </Text>
          <Text
            className="mt-2 text-center text-sm"
            style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
          >
            Search by city, hotel name, or destination to discover your perfect accommodation
          </Text>

          {/* Quick suggestions */}
          <View className="mt-8 w-full">
            <Text
              className="mb-3 text-sm"
              style={{ fontFamily: "Inter-Medium", color: "#64748B" }}
            >
              Popular Searches
            </Text>
            {["Ho Chi Minh City", "Da Nang", "Hanoi", "Hoi An", "Phu Quoc"].map((dest) => (
              <TouchableOpacity
                key={dest}
                onPress={() => {
                  setLocalQuery(dest);
                  setQuery(dest);
                  setHasSearched(true);
                }}
                className="mb-2 flex-row items-center rounded-xl bg-white px-4 py-3"
                style={{
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <Ionicons name="location-outline" size={18} color="#94A3B8" />
                <Text
                  className="ml-3 flex-1 text-sm text-neutral-700"
                  style={{ fontFamily: "Inter-Regular" }}
                >
                  {dest}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      ) : (
        <FlatList
          data={hotels}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="mb-4 flex-row items-center justify-between">
              <Text
                className="text-sm text-neutral-500"
                style={{ fontFamily: "Inter-Regular" }}
              >
                {isLoading || isFetching ? (
                  "Searching..."
                ) : (
                  `${hotels.length} hotel${hotels.length !== 1 ? "s" : ""} found`
                )}
              </Text>
              {(isLoading || isFetching) && (
                <ActivityIndicator size="small" color="#FF5733" />
              )}
            </View>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center py-16">
                <Ionicons name="search-outline" size={48} color="#CBD5E1" />
                <Text
                  className="mt-4 text-base"
                  style={{ fontFamily: "PlusJakartaSans-SemiBold", color: "#94A3B8" }}
                >
                  No hotels found
                </Text>
                <Text
                  className="mt-2 text-center text-sm"
                  style={{ fontFamily: "Inter-Regular", color: "#CBD5E1" }}
                >
                  Try adjusting your search or filters
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    resetFilters();
                  }}
                  className="mt-4"
                >
                  <Text
                    className="text-sm"
                    style={{ fontFamily: "Inter-Medium", color: "#FF5733" }}
                  >
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <HotelCard hotel={item} index={index} variant="horizontal" />
          )}
        />
      )}

      {/* Filter Sheet */}
      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        sortBy={sortBy ?? "rating"}
        setSortBy={setSortBy}
        priceMin={priceMin}
        priceMax={priceMax}
        setPriceRange={setPriceRange}
        amenities={amenities}
        setAmenities={setAmenities}
        onReset={() => {
          resetFilters();
          setFilterVisible(false);
        }}
        onApply={() => setFilterVisible(false)}
      />
    </View>
  );
}
