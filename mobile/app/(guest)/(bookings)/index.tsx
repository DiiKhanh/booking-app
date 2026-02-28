import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Skeleton } from "@/components/ui";
import { useBookingsList } from "@/hooks/useBookings";
import { formatDateRange, formatCurrency } from "@/utils/format";
import type { Booking } from "@/types";

type TabKey = "all" | "active" | "past";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Upcoming" },
  { key: "past", label: "Past" },
];

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  confirmed: {
    color: "#059669",
    bg: "#ECFDF5",
    icon: "checkmark-circle",
    label: "Confirmed",
  },
  pending: {
    color: "#D97706",
    bg: "#FFFBEB",
    icon: "time",
    label: "Pending",
  },
  awaiting_payment: {
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: "card",
    label: "Awaiting Payment",
  },
  processing: {
    color: "#7C3AED",
    bg: "#F5F3FF",
    icon: "sync",
    label: "Processing",
  },
  cancelled: {
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "close-circle",
    label: "Cancelled",
  },
  failed: {
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "alert-circle",
    label: "Failed",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      color: "#64748B",
      bg: "#F1F5F9",
      icon: "ellipse-outline" as const,
      label: status,
    }
  );
}

function filterBookings(bookings: readonly Booking[], tab: TabKey) {
  if (tab === "all") return bookings;
  const activeStatuses = ["confirmed", "pending", "awaiting_payment", "processing"];
  if (tab === "active") return bookings.filter((b) => activeStatuses.includes(b.status));
  return bookings.filter((b) => !activeStatuses.includes(b.status));
}

function BookingCard({
  booking,
  onPress,
  index,
}: {
  booking: Booking;
  onPress: () => void;
  index: number;
}) {
  const cfg = getStatusConfig(booking.status);

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={onPress}
      >
        {/* Left status strip */}
        <View style={[styles.cardStrip, { backgroundColor: cfg.color }]} />

        <View style={styles.cardContent}>
          {/* Top row */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardHotelName} numberOfLines={1}>
              {booking.hotelName}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={12} color={cfg.color} />
              <Text style={[styles.statusText, { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </View>
          </View>

          {/* Room */}
          <Text style={styles.cardRoomName} numberOfLines={1}>
            {booking.roomName}
          </Text>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Bottom row */}
          <View style={styles.cardBottomRow}>
            <View style={styles.cardDateRow}>
              <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
              <Text style={styles.cardDateText}>
                {formatDateRange(booking.checkIn, booking.checkOut)}
              </Text>
            </View>
            <Text style={styles.cardPrice}>
              {formatCurrency(booking.totalPrice, booking.currency)}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginRight: 12 }} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, { padding: 16 }]}>
      <View style={[styles.cardStrip, { backgroundColor: "#E2E8F0" }]} />
      <View style={{ flex: 1, paddingLeft: 16, gap: 8 }}>
        <Skeleton height={16} width="60%" />
        <Skeleton height={13} width="40%" />
        <View style={{ marginTop: 4 }}>
          <Skeleton height={13} width="50%" />
        </View>
      </View>
    </View>
  );
}

export default function BookingsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const { data, isLoading, refetch, isRefetching } = useBookingsList();
  const allBookings = (data as unknown as readonly Booking[]) ?? [];
  const filtered = filterBookings(allBookings, activeTab);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{allBookings.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === tab.key && styles.tabBtnTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5733" />
          }
          renderItem={({ item, index }) => (
            <BookingCard
              booking={item}
              index={index}
              onPress={() => router.push(`/(guest)/(bookings)/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={36} color="#1A3A6B" />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === "all"
                  ? "No bookings yet"
                  : activeTab === "active"
                  ? "No upcoming bookings"
                  : "No past bookings"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "all"
                  ? "Explore hotels and book your first stay"
                  : "Your upcoming trips will appear here"}
              </Text>
              {activeTab === "all" ? (
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => router.push("/(guest)/(search)/")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exploreBtnText}>Explore Hotels</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-Bold",
  },
  headerBadge: {
    backgroundColor: "#1A3A6B",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  headerBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "Inter-Medium",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabBtnActive: {
    backgroundColor: "#1A3A6B",
  },
  tabBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter-Medium",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardStrip: {
    width: 4,
    alignSelf: "stretch",
  },
  cardContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  cardHotelName: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter-Medium",
  },
  cardRoomName: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter-Regular",
    marginBottom: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardDateText: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  cardPrice: {
    fontSize: 15,
    color: "#FF5733",
    fontFamily: "DMSans-Bold",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#E8EDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: "#FF5733",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  exploreBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter-Medium",
    fontSize: 14,
  },
});
