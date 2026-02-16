import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card } from "@/components/ui";
import { useBookingFlow } from "@/hooks/useBookingFlow";

export default function BookingFormScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft } = useBookingFlow();

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center px-4 pb-3 border-b border-neutral-100"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-4 text-lg font-heading-semi text-neutral-900">
          Book Room
        </Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <Card variant="outlined" className="mb-4">
          <Text className="text-base font-heading-semi text-neutral-900">
            {draft?.roomName ?? "Selected Room"}
          </Text>
          <Text className="mt-1 text-sm text-neutral-500 font-body">
            {draft?.hotelName ?? "Hotel"}
          </Text>
        </Card>

        <Text className="mb-3 text-base font-heading-semi text-neutral-900">
          Select Dates
        </Text>
        <Card variant="outlined" className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 items-center">
              <Text className="text-xs text-neutral-400 font-body">
                CHECK-IN
              </Text>
              <Text className="mt-1 text-base font-body-medium text-neutral-700">
                {draft?.checkIn || "Select date"}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
            <View className="flex-1 items-center">
              <Text className="text-xs text-neutral-400 font-body">
                CHECK-OUT
              </Text>
              <Text className="mt-1 text-base font-body-medium text-neutral-700">
                {draft?.checkOut || "Select date"}
              </Text>
            </View>
          </View>
        </Card>

        <Text className="mb-3 text-base font-heading-semi text-neutral-900">
          Guests
        </Text>
        <Card variant="outlined" className="mb-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-neutral-700 font-body">
              {draft?.guests ?? 1} Guest(s)
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                <Ionicons name="remove" size={18} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                <Ionicons name="add" size={18} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </ScrollView>

      <View
        className="border-t border-neutral-100 px-6 pb-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          title="Continue to Review"
          fullWidth
          size="lg"
          onPress={() => router.push("/(guest)/(home)/booking/review")}
        />
      </View>
    </View>
  );
}
