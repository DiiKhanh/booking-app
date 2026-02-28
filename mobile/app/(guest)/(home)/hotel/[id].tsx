import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Badge, Skeleton } from "@/components/ui";
import { useHotelDetail, useHotelRooms } from "@/hooks/useHotels";
import { formatCurrency, formatRating } from "@/utils/format";
import type { Room } from "@/types";

// Deterministic gradient per hotel (based on id hash)
const HOTEL_GRADIENTS: Array<readonly [string, string]> = [
  ["#0C1930", "#1A3A6B"],
  ["#064E3B", "#065F46"],
  ["#1E1B4B", "#312E81"],
  ["#7C2D12", "#9A3412"],
  ["#0C4A6E", "#075985"],
];

function getGradient(id: string): readonly [string, string] {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return HOTEL_GRADIENTS[hash % HOTEL_GRADIENTS.length]!;
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <View style={styles.ratingBadge}>
      <Ionicons name="star" size={13} color="#F59E0B" />
      <Text style={styles.ratingValue}>{formatRating(rating)}</Text>
    </View>
  );
}

function RoomCard({
  room,
  hotelName,
  hotelId,
  onBook,
}: {
  room: Room;
  hotelName: string;
  hotelId: string;
  onBook: (room: Room) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View style={styles.roomCard}>
        {/* Room image placeholder */}
        <View style={styles.roomImageBox}>
          <Ionicons name="bed-outline" size={28} color="#94A3B8" />
        </View>

        <View style={styles.roomCardBody}>
          <View style={styles.roomCardTop}>
            <Text style={styles.roomName} numberOfLines={1}>
              {room.name}
            </Text>
            <View style={styles.roomCapacityRow}>
              <Ionicons name="people-outline" size={13} color="#94A3B8" />
              <Text style={styles.roomCapacityText}>
                Up to {room.capacity} guests
              </Text>
            </View>
          </View>

          {/* Room amenities */}
          {room.amenities && room.amenities.length > 0 ? (
            <View style={styles.roomAmenitiesRow}>
              {room.amenities.slice(0, 3).map((a) => (
                <View key={a} style={styles.roomAmenityChip}>
                  <Text style={styles.roomAmenityText}>{a}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.roomPriceRow}>
            <View>
              <Text style={styles.roomPrice}>
                {formatCurrency(room.pricePerNight, room.currency)}
              </Text>
              <Text style={styles.roomPerNight}>per night</Text>
            </View>
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.8}
              onPress={() => onBook(room)}
            >
              <Text style={styles.bookBtnText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: hotel, isLoading } = useHotelDetail(id);
  const { data: rooms, isLoading: roomsLoading } = useHotelRooms(id);

  const gradient = getGradient(id ?? "0");

  const handleBook = (room: Room) => {
    router.push({
      pathname: `/(guest)/(home)/booking/${room.id}`,
      params: {
        roomName: room.name,
        hotelName: hotel?.name ?? "",
        hotelId: hotel?.id ?? "",
        pricePerNight: String(room.pricePerNight),
        currency: room.currency,
        capacity: String(room.capacity),
      },
    });
  };

  const handleShare = async () => {
    if (!hotel) return;
    await Share.share({
      message: `Check out ${hotel.name} on StayEase — from ${formatCurrency(hotel.priceRange.min, "USD")}/night`,
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: "#fff" }]}>
        <Skeleton height={300} borderRadius={0} />
        <View style={{ padding: 24, gap: 12 }}>
          <Skeleton height={28} width="70%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={16} width="30%" />
          <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={28} width={70} borderRadius={14} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (!hotel) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
        <Text style={styles.errorText}>Hotel not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const minPrice = hotel.priceRange.min;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Hero Image / Gradient ── */}
        <View style={styles.heroContainer}>
          {hotel.images?.[0] ? (
            <Image
              source={{ uri: hotel.images[0] }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[gradient[0], gradient[1]]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}

          {/* Overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top Controls */}
          <View style={[styles.heroTopBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.heroRightBtns}>
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={20} color="#1E293B" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="heart-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero bottom info */}
          <View style={styles.heroBottom}>
            <RatingBadge rating={hotel.rating} />
            <Text style={styles.heroReviewText}>
              {hotel.reviewCount.toLocaleString()} reviews
            </Text>
          </View>
        </View>

        {/* ── Pull-up Content Card ── */}
        <View style={styles.contentCard}>
          {/* Hotel Name & Location */}
          <Text style={styles.hotelName}>{hotel.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color="#94A3B8" />
            <Text style={styles.locationText} numberOfLines={1}>
              {hotel.address}, {hotel.city}, {hotel.country}
            </Text>
          </View>

          {/* Quick stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.statValue}>{formatRating(hotel.rating)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={18} color="#94A3B8" />
              <Text style={styles.statValue}>{hotel.reviewCount}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={18} color="#94A3B8" />
              <Text style={styles.statValue}>{rooms?.length ?? "—"}</Text>
              <Text style={styles.statLabel}>Rooms</Text>
            </View>
          </View>

          {/* Amenities */}
          {hotel.amenities.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {hotel.amenities.map((a) => (
                  <Badge key={a} label={a} variant="info" />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{hotel.description}</Text>
          </View>

          {/* Location section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapPlaceholder}>
              <LinearGradient
                colors={["#E8EDF5", "#F1F5F9"]}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons name="map-outline" size={32} color="#94A3B8" />
              <Text style={styles.mapText}>
                {hotel.city}, {hotel.country}
              </Text>
            </View>
          </View>

          {/* Available Rooms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Rooms</Text>
            {roomsLoading ? (
              <View style={{ gap: 12 }}>
                {[1, 2].map((i) => (
                  <Skeleton key={i} height={140} borderRadius={16} />
                ))}
              </View>
            ) : (rooms ?? []).length === 0 ? (
              <View style={styles.emptyRooms}>
                <Ionicons name="bed-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptyRoomsText}>
                  No rooms available for selected dates
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {(rooms ?? []).map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    hotelName={hotel.name}
                    hotelId={hotel.id}
                    onBook={handleBook}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Sticky Bottom Bar ── */}
      <View
        style={[styles.stickyBar, { paddingBottom: insets.bottom + 12 }]}
      >
        <View>
          <Text style={styles.stickyPriceLabel}>From</Text>
          <View style={styles.stickyPriceRow}>
            <Text style={styles.stickyPrice}>
              {formatCurrency(minPrice, hotel.priceRange.currency ?? "USD")}
            </Text>
            <Text style={styles.stickyPerNight}>/night</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.stickyBookBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (rooms && rooms.length > 0) handleBook(rooms[0]!);
          }}
        >
          <Text style={styles.stickyBookBtnText}>Select Room</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  heroContainer: {
    height: 300,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#1A3A6B",
  },
  heroTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroRightBtns: {
    flexDirection: "row",
    gap: 10,
  },
  heroBottom: {
    position: "absolute",
    bottom: 16,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingValue: {
    color: "#FFFFFF",
    fontFamily: "Inter-Medium",
    fontSize: 13,
  },
  heroReviewText: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter-Regular",
    fontSize: 12,
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 24,
    minHeight: 500,
  },
  hotelName: {
    fontSize: 22,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-Bold",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter-Regular",
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E2E8F0",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
    marginBottom: 14,
  },
  descriptionText: {
    fontSize: 14,
    color: "#475569",
    fontFamily: "Inter-Regular",
    lineHeight: 22,
  },
  mapPlaceholder: {
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mapText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter-Regular",
  },
  roomCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  roomImageBox: {
    width: 88,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  roomCardBody: {
    flex: 1,
    padding: 14,
  },
  roomCardTop: {
    marginBottom: 8,
  },
  roomName: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
    marginBottom: 3,
  },
  roomCapacityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roomCapacityText: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  roomAmenitiesRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  roomAmenityChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roomAmenityText: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Inter-Regular",
  },
  roomPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomPrice: {
    fontSize: 17,
    color: "#FF5733",
    fontFamily: "DMSans-Bold",
  },
  roomPerNight: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  bookBtn: {
    backgroundColor: "#1A3A6B",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  bookBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter-Medium",
    fontSize: 13,
  },
  emptyRooms: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyRoomsText: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
    textAlign: "center",
  },
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 24,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  stickyPriceLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  stickyPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  stickyPrice: {
    fontSize: 20,
    color: "#0F172A",
    fontFamily: "DMSans-Bold",
  },
  stickyPerNight: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  stickyBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FF5733",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: "#FF5733",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  stickyBookBtnText: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  errorLink: {
    fontSize: 14,
    color: "#FF5733",
    fontFamily: "Inter-Medium",
  },
});
