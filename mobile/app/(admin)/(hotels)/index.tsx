import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/admin.service";

type FilterKey = "pending" | "all";

type HotelItem = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  ownerId?: string;
  status?: string;
  createdAt?: string;
};

function HotelApprovalCard({ hotel, index }: { hotel: HotelItem; index: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (approved: boolean) => adminService.approveHotel(hotel.id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-hotels"] });
    },
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
      <View
        className="bg-white rounded-2xl mx-6 mb-3 p-4"
        style={{
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        {/* Top */}
        <TouchableOpacity
          onPress={() => router.push(`/(admin)/(hotels)/${hotel.id}`)}
          className="flex-row items-start mb-4"
          activeOpacity={0.8}
        >
          <View
            className="h-12 w-12 items-center justify-center rounded-xl mr-3"
            style={{ backgroundColor: "#F1F5F9" }}
          >
            <Ionicons name="business-outline" size={24} color="#475569" />
          </View>
          <View className="flex-1">
            <Text className="text-base text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
              {hotel.name}
            </Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Ionicons name="location-outline" size={12} color="#94A3B8" />
              <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                {hotel.city ?? "—"}{hotel.country ? `, ${hotel.country}` : ""}
              </Text>
            </View>
            {hotel.createdAt && (
              <Text className="text-xs mt-0.5" style={{ fontFamily: "Inter-Regular", color: "#CBD5E1" }}>
                Submitted {new Date(hotel.createdAt).toLocaleDateString()}
              </Text>
            )}
          </View>
          <View className="rounded-full px-2.5 py-1 bg-amber-50">
            <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#F59E0B" }}>
              Pending
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => approveMutation.mutate(false)}
            disabled={approveMutation.isPending}
            className="flex-1 items-center justify-center rounded-xl py-2.5 border border-red-200"
            style={{ backgroundColor: "#FEF2F2" }}
          >
            <Text className="text-sm" style={{ fontFamily: "Inter-Medium", color: "#EF4444" }}>
              Reject
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => approveMutation.mutate(true)}
            disabled={approveMutation.isPending}
            className="flex-2 flex-1 items-center justify-center rounded-xl py-2.5"
            style={{ backgroundColor: "#1A3A6B" }}
          >
            <Text className="text-sm text-white" style={{ fontFamily: "Inter-Medium" }}>
              {approveMutation.isPending ? "Processing..." : "Approve"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function AdminHotelsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: pendingHotels = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "pending-hotels"],
    queryFn: () => adminService.getPendingHotels(),
  });

  const hotels = (pendingHotels as HotelItem[]);

  return (
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-4 bg-white border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View className="ml-4 flex-1">
          <Text className="text-lg text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }}>
            Hotel Approvals
          </Text>
          {hotels.length > 0 && (
            <Text className="text-xs" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
              {hotels.length} hotel{hotels.length !== 1 ? "s" : ""} awaiting review
            </Text>
          )}
        </View>
      </View>

      <FlatList
        data={hotels}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <HotelApprovalCard hotel={item} index={index} />}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5733" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <View
                className="h-20 w-20 items-center justify-center rounded-full mb-4"
                style={{ backgroundColor: "#F0FDF4" }}
              >
                <Ionicons name="shield-checkmark" size={36} color="#10B981" />
              </View>
              <Text className="text-base" style={{ fontFamily: "PlusJakartaSans-SemiBold", color: "#1E293B" }}>
                All Clear!
              </Text>
              <Text className="text-sm mt-1" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                No hotels pending approval
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
