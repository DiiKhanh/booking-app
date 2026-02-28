import { View, Text, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/hooks/useAuth";
import { useBookingsList } from "@/hooks/useBookings";
import { useSearchHotels } from "@/hooks/useHotels";
import { formatCurrency } from "@/utils/format";

type KpiItem = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

function KpiCard({ item, index }: { item: KpiItem; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400)}
      className="flex-1 rounded-2xl p-4 m-1"
      style={{ backgroundColor: item.bg }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-xl mb-3"
        style={{ backgroundColor: item.color + "22" }}
      >
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <Text
        className="text-2xl"
        style={{ fontFamily: "DMSans-Bold", color: item.color }}
      >
        {item.value}
      </Text>
      <Text
        className="text-xs mt-0.5"
        style={{ fontFamily: "Inter-Regular", color: "#64748B" }}
      >
        {item.label}
      </Text>
    </Animated.View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    confirmed: { label: "Confirmed", color: "#10B981", bg: "#D1FAE5" },
    pending: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7" },
    cancelled: { label: "Cancelled", color: "#EF4444", bg: "#FEE2E2" },
    processing: { label: "Processing", color: "#3B82F6", bg: "#DBEAFE" },
  };
  const style = map[status] ?? { label: status, color: "#64748B", bg: "#F1F5F9" };
  return (
    <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: style.bg }}>
      <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: style.color }}>
        {style.label}
      </Text>
    </View>
  );
}

export default function OwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userName } = useAuth();

  const { data: bookings = [] } = useBookingsList();
  const { data: hotelsData } = useSearchHotels({ limit: 50 });
  const hotels = hotelsData?.data ?? [];

  const totalRevenue = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);

  const kpis: KpiItem[] = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue, "USD"),
      icon: "cash-outline",
      color: "#10B981",
      bg: "#F0FDF4",
    },
    {
      label: "Bookings",
      value: String(bookings.length),
      icon: "receipt-outline",
      color: "#3B82F6",
      bg: "#EFF6FF",
    },
    {
      label: "Properties",
      value: String(hotels.length),
      icon: "business-outline",
      color: "#8B5CF6",
      bg: "#F5F3FF",
    },
    {
      label: "Confirmed",
      value: String(bookings.filter((b) => b.status === "confirmed").length),
      icon: "checkmark-circle-outline",
      color: "#F59E0B",
      bg: "#FFFBEB",
    },
  ];

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5);

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-6 mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
            Welcome back
          </Text>
          <Text className="text-2xl" style={{ fontFamily: "PlusJakartaSans-Bold", color: "#1A3A6B" }}>
            {userName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(owner)/(reservations)/")}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: "#1A3A6B" }}
        >
          <Ionicons name="notifications-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* KPI Grid */}
      <View className="flex-row flex-wrap px-5 mb-6">
        {kpis.map((item, idx) => (
          <View key={item.label} className="w-1/2">
            <KpiCard item={item} index={idx} />
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View className="px-6 mb-6">
        <Text
          className="mb-3 text-sm uppercase tracking-wide"
          style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}
        >
          Quick Actions
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.push("/(owner)/(properties)/create")}
            className="flex-1 rounded-2xl items-center justify-center py-4"
            style={{ backgroundColor: "#1A3A6B" }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text className="mt-1.5 text-xs text-white" style={{ fontFamily: "Inter-Medium" }}>
              Add Property
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(owner)/(reservations)/")}
            className="flex-1 rounded-2xl items-center justify-center py-4"
            style={{ backgroundColor: "#FFF0EC" }}
          >
            <Ionicons name="receipt-outline" size={24} color="#FF5733" />
            <Text className="mt-1.5 text-xs" style={{ fontFamily: "Inter-Medium", color: "#FF5733" }}>
              Reservations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(owner)/(dashboard)/analytics")}
            className="flex-1 rounded-2xl items-center justify-center py-4"
            style={{ backgroundColor: "#F0FDF4" }}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#10B981" />
            <Text className="mt-1.5 text-xs" style={{ fontFamily: "Inter-Medium", color: "#10B981" }}>
              Analytics
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Bookings */}
      <View className="px-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text
            className="text-sm uppercase tracking-wide"
            style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}
          >
            Recent Bookings
          </Text>
          <TouchableOpacity onPress={() => router.push("/(owner)/(reservations)/")}>
            <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#FF5733" }}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {recentBookings.length === 0 ? (
          <View
            className="rounded-2xl items-center justify-center py-12"
            style={{ backgroundColor: "#F8FAFC" }}
          >
            <Ionicons name="receipt-outline" size={40} color="#CBD5E1" />
            <Text className="mt-3 text-sm" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
              No bookings yet
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {recentBookings.map((booking, idx) => (
              <Animated.View
                key={booking.id}
                entering={FadeInDown.delay(200 + idx * 60).duration(350)}
              >
                <TouchableOpacity
                  onPress={() => router.push(`/(owner)/(reservations)/${booking.id}`)}
                  className="rounded-2xl bg-white p-4"
                  style={{
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                      <Text
                        className="text-sm text-neutral-900"
                        style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                        numberOfLines={1}
                      >
                        Booking #{booking.id.slice(-6).toUpperCase()}
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                      >
                        {booking.checkIn} → {booking.checkOut}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <StatusBadge status={booking.status ?? "pending"} />
                      <Text
                        className="text-sm"
                        style={{ fontFamily: "DMSans-Bold", color: "#FF5733" }}
                      >
                        {formatCurrency(booking.totalPrice ?? 0, "USD")}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
