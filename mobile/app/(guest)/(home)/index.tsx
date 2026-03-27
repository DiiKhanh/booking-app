import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import { Avatar, Skeleton } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useTrendingHotels } from "@/hooks/useHotels";
import { useAppStore } from "@/stores/app.store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HOTEL_CARD_WIDTH = SCREEN_WIDTH * 0.68;

// ─── Static Data ─────────────────────────────────────────────────────────────

const POPULAR_DESTINATIONS = [
  { id: "1", name: "Bali", hotels: "2,340", gradientColors: ["#F97316", "#EA580C"] as const },
  { id: "2", name: "Tokyo", hotels: "1,890", gradientColors: ["#8B5CF6", "#7C3AED"] as const },
  { id: "3", name: "Paris", hotels: "3,120", gradientColors: ["#EC4899", "#DB2777"] as const },
  { id: "4", name: "New York", hotels: "4,560", gradientColors: ["#3B82F6", "#2563EB"] as const },
  { id: "5", name: "London", hotels: "2,780", gradientColors: ["#10B981", "#059669"] as const },
  { id: "6", name: "Dubai", hotels: "1,650", gradientColors: ["#F59E0B", "#D97706"] as const },
];

const QUICK_CATEGORIES = [
  { id: "1", icon: "flame-outline" as const, label: "Trending", color: "#FF5733" },
  { id: "2", icon: "diamond-outline" as const, label: "Luxury", color: "#6366F1" },
  { id: "3", icon: "wallet-outline" as const, label: "Budget", color: "#10B981" },
  { id: "4", icon: "heart-outline" as const, label: "Romance", color: "#EC4899" },
  { id: "5", icon: "briefcase-outline" as const, label: "Business", color: "#F59E0B" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={styles.seeAllBtn} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color="#FF5733" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function DestinationCard({
  item,
  onPress,
}: {
  readonly item: (typeof POPULAR_DESTINATIONS)[number];
  readonly onPress: () => void;
}) {
  const initial = item.name[0];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.destinationCard}>
      <LinearGradient
        colors={item.gradientColors}
        style={styles.destinationGradient}
      >
        <Text style={styles.destinationInitial}>{initial}</Text>
      </LinearGradient>
      <Text style={styles.destinationName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.destinationCount}>{item.hotels}</Text>
    </TouchableOpacity>
  );
}

function HotelCardSkeleton() {
  return (
    <View style={[styles.hotelCard, { width: HOTEL_CARD_WIDTH }]}>
      <Skeleton height={180} borderRadius={0} />
      <View style={styles.hotelCardBody}>
        <Skeleton height={18} width="70%" />
        <View style={{ marginTop: 8 }}>
          <Skeleton height={14} width="50%" />
        </View>
        <View style={{ marginTop: 12 }}>
          <Skeleton height={14} width="35%" />
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ══════════════ HERO HEADER ══════════════ */}
        <LinearGradient
          colors={["#0C1930", "#1A3A6B"]}
          style={{ paddingTop: insets.top + 12 }}
        >
          {/* Top Bar */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.topBar}
          >
            {/* Avatar + Greeting */}
            <View style={styles.topBarLeft}>
              <View style={styles.avatarWrapper}>
                <Avatar name={isGuestMode ? "Explorer" : userName ?? "User"} size="md" />
                <View style={styles.onlineDot} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.greetingLabel}>{greeting}</Text>
                <Text style={styles.greetingName}>{displayName}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.topBarActions}>
              {isGuestMode && (
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  style={styles.signInBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.notifBtn} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.85)" />
                <View style={styles.notifDot} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Floating Search Card ── */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.searchCardWrapper}>
            <View style={styles.searchCard}>
              {/* Where row */}
              <TouchableOpacity
                onPress={() => router.push("/(guest)/(search)/")}
                activeOpacity={0.7}
                style={styles.searchRow}
              >
                <View style={styles.searchIconBox}>
                  <Ionicons name="location-outline" size={18} color="#1A3A6B" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.searchFieldLabel}>DESTINATION</Text>
                  <Text style={styles.searchFieldPlaceholder}>Where are you going?</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <View style={styles.searchDivider} />

              {/* Dates + Guests row */}
              <View style={styles.searchRowHalf}>
                <TouchableOpacity activeOpacity={0.7} style={[styles.searchHalf, { borderRightWidth: 1, borderRightColor: "#F1F5F9" }]}>
                  <View style={styles.searchIconBox}>
                    <Ionicons name="calendar-outline" size={18} color="#1A3A6B" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.searchFieldLabel}>DATES</Text>
                    <Text style={styles.searchFieldPlaceholder} numberOfLines={1}>Select dates</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.searchHalf}>
                  <View style={styles.searchIconBox}>
                    <Ionicons name="people-outline" size={18} color="#1A3A6B" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.searchFieldLabel}>GUESTS</Text>
                    <Text style={styles.searchFieldPlaceholder}>Add guests</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Search CTA */}
              <TouchableOpacity
                onPress={() => router.push("/(guest)/(search)/")}
                activeOpacity={0.85}
                style={styles.searchCTAWrapper}
              >
                <LinearGradient
                  colors={["#FF5733", "#CC4327"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.searchCTA}
                >
                  <Ionicons name="search" size={18} color="#FFF" />
                  <Text style={styles.searchCTAText}>Search Hotels</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Curved bottom edge */}
          <View style={styles.curvedEdge} />
        </LinearGradient>

        {/* ══════════════ QUICK CATEGORIES ══════════════ */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ marginTop: 4 }}>
          <FlatList
            data={QUICK_CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryChip}
                activeOpacity={0.75}
              >
                <View style={[styles.categoryIconBox, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={styles.categoryLabel}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </Animated.View>

        {/* ══════════════ POPULAR DESTINATIONS ══════════════ */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{ marginTop: 24 }}>
          <SectionHeader
            title="Popular Destinations"
            actionLabel="See All"
            onAction={() => router.push("/(guest)/(search)/")}
          />
          <FlatList
            data={POPULAR_DESTINATIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destinationsList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DestinationCard
                item={item}
                onPress={() =>
                  router.push({
                    pathname: "/(guest)/(search)/",
                    params: { query: item.name },
                  })
                }
              />
            )}
          />
        </Animated.View>

        {/* ══════════════ SPECIAL DEALS BANNER ══════════════ */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.dealsBannerWrapper}>
          <TouchableOpacity activeOpacity={0.88}>
            <LinearGradient
              colors={["#FF5733", "#CC4327"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dealsBanner}
            >
              {/* Decorative orb */}
              <View style={styles.dealsOrb} />

              <View style={{ flex: 1, paddingRight: 16 }}>
                {/* Gold badge */}
                <View style={styles.dealsBadge}>
                  <Ionicons name="flash" size={11} color="#92400E" />
                  <Text style={styles.dealsBadgeText}>LIMITED OFFER</Text>
                </View>

                <Text style={styles.dealsTitle}>Up to 40% Off{"\n"}Weekend Stays</Text>
                <Text style={styles.dealsSubtitle}>
                  Book before Feb 28 · Code: STAY40
                </Text>

                <TouchableOpacity style={styles.dealsBtn} activeOpacity={0.8}>
                  <Text style={styles.dealsBtnText}>Claim Discount</Text>
                </TouchableOpacity>
              </View>

              {/* Icon block */}
              <View style={styles.dealsIconBlock}>
                <Ionicons name="pricetag-outline" size={32} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ══════════════ TRENDING HOTELS ══════════════ */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={{ marginTop: 28 }}>
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
              contentContainerStyle={styles.hotelsList}
              keyExtractor={(item) => String(item)}
              renderItem={() => <HotelCardSkeleton />}
            />
          ) : (
            <FlatList
              data={trendingHotels?.data ?? []}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hotelsList}
              keyExtractor={(item) => item.id}
              renderItem={({ item: hotel, index }) => (
                <Animated.View entering={FadeInRight.delay(index * 100).duration(400)}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={[styles.hotelCard, { width: HOTEL_CARD_WIDTH }]}
                    onPress={() => router.push(`/(guest)/(home)/hotel/${hotel.id}`)}
                  >
                    {/* Image Area */}
                    <View style={styles.hotelImageArea}>
                      <LinearGradient
                        colors={["#CBD5E1", "#94A3B8"]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.6)" />

                      {/* Rating Pill — bottom left (glassmorphism) */}
                      <View style={styles.ratingPill}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={styles.ratingText}>{hotel.rating}</Text>
                      </View>

                      {/* Favorite — top right (glassmorphism) */}
                      <TouchableOpacity style={styles.favBtn} activeOpacity={0.8}>
                        <Ionicons name="heart-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Card Body */}
                    <View style={styles.hotelCardBody}>
                      <Text style={styles.hotelName} numberOfLines={1}>
                        {hotel.name}
                      </Text>
                      <View style={styles.hotelLocation}>
                        <Ionicons name="location-outline" size={12} color="#94A3B8" />
                        <Text style={styles.hotelLocationText} numberOfLines={1}>
                          {hotel.city}, {hotel.country}
                        </Text>
                      </View>

                      <View style={styles.hotelDivider} />

                      <View style={styles.hotelFooter}>
                        <View>
                          <Text style={styles.hotelPriceLabel}>Start from</Text>
                          <View style={styles.hotelPriceRow}>
                            <Text style={styles.hotelPrice}>${hotel.priceRange.min}</Text>
                            <Text style={styles.hotelPerNight}>/night</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.viewBtn}
                          activeOpacity={0.8}
                          onPress={() => router.push(`/(guest)/(home)/hotel/${hotel.id}`)}
                        >
                          <Text style={styles.viewBtnText}>View</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
            />
          )}
        </Animated.View>

        {/* ══════════════ EXPLORE NEARBY ══════════════ */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.nearbyWrapper}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(guest)/(search)/map")}
          >
            <LinearGradient
              colors={["#112443", "#1A3A6B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nearbyCard}
            >
              {/* Decorative orb */}
              <View style={styles.nearbyOrb} />

              <View style={{ flex: 1 }}>
                <View style={styles.nearbyBadge}>
                  <Ionicons name="navigate-outline" size={11} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.nearbyBadgeText}>NEARBY</Text>
                </View>
                <Text style={styles.nearbyTitle}>Explore Hotels Near You</Text>
                <Text style={styles.nearbySubtitle}>
                  Discover hotels around your area on the interactive map
                </Text>
              </View>

              <View style={styles.nearbyIconBlock}>
                <Ionicons name="map-outline" size={28} color="#FF5733" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#0C1930",
  },
  greetingLabel: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: "rgba(255,255,255,0.55)",
  },
  greetingName: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans-Bold",
    color: "#FFFFFF",
    marginTop: 2,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  signInBtn: {
    backgroundColor: "rgba(255,87,51,0.18)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  signInText: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    color: "#FF5733",
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#0C1930",
  },

  // Search card
  searchCardWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(26,58,107,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchFieldLabel: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    color: "#94A3B8",
    letterSpacing: 0.8,
  },
  searchFieldPlaceholder: {
    fontSize: 14,
    fontFamily: "Inter-Medium",
    color: "#1E293B",
    marginTop: 2,
  },
  searchDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 16,
  },
  searchRowHalf: {
    flexDirection: "row",
  },
  searchHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchCTAWrapper: {
    margin: 14,
    borderRadius: 14,
    overflow: "hidden",
  },
  searchCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  searchCTAText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#FFFFFF",
  },

  // Curved edge
  curvedEdge: {
    height: 20,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -1,
  },

  // Categories
  categoriesList: {
    paddingHorizontal: 20,
    gap: 10,
    paddingVertical: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    color: "#334155",
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#0F172A",
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    color: "#FF5733",
  },

  // Destinations
  destinationsList: {
    paddingHorizontal: 24,
    gap: 14,
  },
  destinationCard: {
    alignItems: "center",
    width: 72,
  },
  destinationGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  destinationInitial: {
    fontSize: 24,
    fontFamily: "PlusJakartaSans-Bold",
    color: "#FFFFFF",
  },
  destinationName: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    color: "#1E293B",
    marginTop: 8,
    textAlign: "center",
  },
  destinationCount: {
    fontSize: 10,
    fontFamily: "Inter-Regular",
    color: "#94A3B8",
    marginTop: 2,
    textAlign: "center",
  },

  // Deals banner
  dealsBannerWrapper: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  dealsBanner: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  dealsOrb: {
    position: "absolute",
    right: -20,
    bottom: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dealsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E5C558",
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  dealsBadgeText: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    color: "#92400E",
    letterSpacing: 0.6,
  },
  dealsTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans-Bold",
    color: "#FFFFFF",
    lineHeight: 26,
  },
  dealsSubtitle: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
  },
  dealsBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  dealsBtnText: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    color: "#FF5733",
  },
  dealsIconBlock: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Hotel cards
  hotelsList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  hotelCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  hotelImageArea: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ratingPill: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15,23,42,0.65)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    color: "#FFFFFF",
  },
  favBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  hotelCardBody: {
    padding: 14,
  },
  hotelName: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#0F172A",
  },
  hotelLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 5,
  },
  hotelLocationText: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: "#94A3B8",
    flex: 1,
  },
  hotelDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  hotelFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hotelPriceLabel: {
    fontSize: 10,
    fontFamily: "Inter-Regular",
    color: "#94A3B8",
  },
  hotelPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginTop: 2,
  },
  hotelPrice: {
    fontSize: 18,
    fontFamily: "DMSans-Bold",
    color: "#FF5733",
  },
  hotelPerNight: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: "#94A3B8",
  },
  viewBtn: {
    backgroundColor: "rgba(255,87,51,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewBtnText: {
    fontSize: 13,
    fontFamily: "Inter-Medium",
    color: "#FF5733",
  },

  // Explore nearby
  nearbyWrapper: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  nearbyCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  nearbyOrb: {
    position: "absolute",
    right: -16,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  nearbyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  nearbyBadgeText: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.8,
  },
  nearbyTitle: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans-Bold",
    color: "#FFFFFF",
  },
  nearbySubtitle: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
    lineHeight: 18,
  },
  nearbyIconBlock: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
});
