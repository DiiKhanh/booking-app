import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button, Card } from "@/components/ui";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import { formatCurrency, calculateNights, formatDateRange } from "@/utils/format";

export default function BookingReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draft } = useBookingFlow();

  const nights = draft ? calculateNights(draft.checkIn, draft.checkOut) : 0;
  const total = draft ? draft.pricePerNight * nights : 0;

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
          Review Booking
        </Text>
      </View>

      <ScrollView className="flex-1 p-6">
        <Card variant="outlined" className="mb-4">
          <Text className="text-lg font-heading-semi text-neutral-900">
            {draft?.hotelName}
          </Text>
          <Text className="mt-1 text-sm text-neutral-500 font-body">
            {draft?.roomName}
          </Text>
        </Card>

        <Card variant="outlined" className="mb-4">
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500 font-body">Dates</Text>
              <Text className="text-sm font-body-medium text-neutral-700">
                {draft
                  ? formatDateRange(draft.checkIn, draft.checkOut)
                  : "—"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500 font-body">
                Guests
              </Text>
              <Text className="text-sm font-body-medium text-neutral-700">
                {draft?.guests ?? 0}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-neutral-500 font-body">
                {nights} night(s) x{" "}
                {draft
                  ? formatCurrency(draft.pricePerNight, draft.currency)
                  : "—"}
              </Text>
              <Text className="text-sm font-body-medium text-neutral-700">
                {formatCurrency(total, draft?.currency)}
              </Text>
            </View>
            <View className="border-t border-neutral-100 pt-3 flex-row justify-between">
              <Text className="text-base font-heading-semi text-neutral-900">
                Total
              </Text>
              <Text className="text-lg font-price text-accent-500">
                {formatCurrency(total, draft?.currency)}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <View
        className="border-t border-neutral-100 px-6 pb-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          title="Confirm & Pay"
          fullWidth
          size="lg"
          onPress={() => router.push("/(guest)/(home)/booking/processing")}
        />
      </View>
    </View>
  );
}
