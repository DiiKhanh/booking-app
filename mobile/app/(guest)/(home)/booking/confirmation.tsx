import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui";
import { useBookingFlow } from "@/hooks/useBookingFlow";

export default function ConfirmationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSuccess, reset } = useBookingFlow();

  const handleDone = () => {
    reset();
    router.replace("/(guest)/(home)/");
  };

  const handleViewBookings = () => {
    reset();
    router.replace("/(guest)/(bookings)/");
  };

  return (
    <View
      className="flex-1 items-center justify-center bg-white px-6"
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      <View
        className={`mb-6 h-20 w-20 items-center justify-center rounded-full ${isSuccess ? "bg-success-500/10" : "bg-error-500/10"}`}
      >
        <Ionicons
          name={isSuccess ? "checkmark-circle" : "close-circle"}
          size={48}
          color={isSuccess ? "#10B981" : "#EF4444"}
        />
      </View>

      <Text className="mb-2 text-2xl font-heading text-neutral-900">
        {isSuccess ? "Booking Confirmed!" : "Booking Failed"}
      </Text>
      <Text className="mb-8 text-center text-base text-neutral-500 font-body">
        {isSuccess
          ? "Your reservation has been confirmed. Check your bookings for details."
          : "Something went wrong with your booking. Please try again."}
      </Text>

      <View className="w-full gap-3">
        {isSuccess ? (
          <>
            <Button
              title="View My Bookings"
              fullWidth
              size="lg"
              onPress={handleViewBookings}
            />
            <Button
              title="Back to Home"
              variant="outline"
              fullWidth
              size="lg"
              onPress={handleDone}
            />
          </>
        ) : (
          <>
            <Button
              title="Try Again"
              fullWidth
              size="lg"
              onPress={() => router.back()}
            />
            <Button
              title="Back to Home"
              variant="outline"
              fullWidth
              size="lg"
              onPress={handleDone}
            />
          </>
        )}
      </View>
    </View>
  );
}
