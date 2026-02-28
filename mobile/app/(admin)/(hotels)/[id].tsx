import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminService } from "@/services/admin.service";
import { useHotelDetail } from "@/hooks/useHotels";

type HotelItem = {
  id: string;
  name?: string;
  city?: string;
  country?: string;
  address?: string;
  description?: string;
  ownerId?: string;
  amenities?: string[];
  status?: string;
  createdAt?: string;
};

export default function AdminHotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: hotel, isLoading } = useHotelDetail(id);

  const approveMutation = useMutation({
    mutationFn: (approved: boolean) => adminService.approveHotel(id, approved),
    onSuccess: (_, approved) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-hotels"] });
      Alert.alert(
        approved ? "Hotel Approved" : "Hotel Rejected",
        approved
          ? "The hotel has been approved and is now visible to guests."
          : "The hotel has been rejected and the owner will be notified.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
  });

  const handleDecision = (approved: boolean) => {
    Alert.alert(
      approved ? "Approve Hotel" : "Reject Hotel",
      approved
        ? `Approve "${hotel?.name}"? It will become visible to guests immediately.`
        : `Reject "${hotel?.name}"? The owner will need to resubmit.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: approved ? "Approve" : "Reject",
          style: approved ? "default" : "destructive",
          onPress: () => approveMutation.mutate(approved),
        },
      ]
    );
  };

  if (isLoading || !hotel) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-neutral-400" style={{ fontFamily: "Inter-Regular" }}>
          Loading hotel details...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-3 border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-4 flex-1 text-lg text-neutral-900" style={{ fontFamily: "PlusJakartaSans-SemiBold" }} numberOfLines={1}>
          {hotel.name}
        </Text>
        <View className="rounded-full px-3 py-1 bg-amber-50">
          <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#F59E0B" }}>
            Pending
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Image placeholder */}
        <View className="h-48 bg-neutral-100 items-center justify-center">
          <Ionicons name="image-outline" size={48} color="#CBD5E1" />
        </View>

        <View className="p-6">
          {/* Hotel info */}
          <Text className="text-2xl text-neutral-900" style={{ fontFamily: "PlusJakartaSans-Bold" }}>
            {hotel.name}
          </Text>
          <View className="flex-row items-center gap-1 mt-2">
            <Ionicons name="location-outline" size={15} color="#94A3B8" />
            <Text className="text-sm" style={{ fontFamily: "Inter-Regular", color: "#64748B" }}>
              {hotel.address}, {hotel.city}, {hotel.country}
            </Text>
          </View>

          {/* Description */}
          {hotel.description && (
            <View className="mt-5">
              <Text className="text-xs uppercase tracking-wide mb-2" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
                Description
              </Text>
              <Text className="text-sm leading-6" style={{ fontFamily: "Inter-Regular", color: "#475569" }}>
                {hotel.description}
              </Text>
            </View>
          )}

          {/* Amenities */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <View className="mt-5">
              <Text className="text-xs uppercase tracking-wide mb-3" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
                Amenities
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {hotel.amenities.map((amenity) => (
                  <View key={amenity} className="rounded-full px-3 py-1.5" style={{ backgroundColor: "#EFF6FF" }}>
                    <Text className="text-xs" style={{ fontFamily: "Inter-Medium", color: "#3B82F6" }}>
                      {amenity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Owner info */}
          <View className="mt-5 rounded-2xl p-4" style={{ backgroundColor: "#F8FAFC" }}>
            <Text className="text-xs uppercase tracking-wide mb-2" style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}>
              Owner Information
            </Text>
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#E2E8F0" }}>
                <Ionicons name="person-outline" size={20} color="#64748B" />
              </View>
              <View>
                <Text className="text-sm text-neutral-900" style={{ fontFamily: "Inter-Medium" }}>
                  Owner ID: {hotel.ownerId ?? "—"}
                </Text>
                <Text className="text-xs mt-0.5" style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}>
                  Submitted {hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : "recently"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="h-4" />
      </ScrollView>

      {/* Decision buttons */}
      <View
        className="flex-row gap-3 border-t border-neutral-100 px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          onPress={() => handleDecision(false)}
          disabled={approveMutation.isPending}
          className="flex-1 items-center justify-center rounded-2xl py-4 border-2 border-red-200"
          style={{ backgroundColor: "#FEF2F2" }}
        >
          <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          <Text className="text-sm mt-1" style={{ fontFamily: "Inter-Medium", color: "#EF4444" }}>
            Reject
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDecision(true)}
          disabled={approveMutation.isPending}
          className="flex-2 flex-1 items-center justify-center rounded-2xl py-4"
          style={{ backgroundColor: "#1A3A6B" }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text className="text-sm text-white mt-1" style={{ fontFamily: "Inter-Medium" }}>
            {approveMutation.isPending ? "Processing..." : "Approve"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
