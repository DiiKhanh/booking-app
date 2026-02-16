import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { useBookingFlow } from "@/hooks/useBookingFlow";

const STATUS_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  pending: {
    title: "Preparing your booking...",
    subtitle: "Hang tight, we're getting things ready",
  },
  awaiting_payment: {
    title: "Processing payment...",
    subtitle: "Securely handling your payment",
  },
  processing: {
    title: "Almost there...",
    subtitle: "Confirming with the hotel",
  },
};

export default function ProcessingScreen() {
  const router = useRouter();
  const { sagaStatus } = useBookingFlow();

  useEffect(() => {
    if (sagaStatus === "confirmed") {
      router.replace("/(guest)/(home)/booking/confirmation");
    }
    if (sagaStatus === "failed") {
      router.replace("/(guest)/(home)/booking/confirmation");
    }
  }, [sagaStatus, router]);

  const statusKey = sagaStatus ?? "pending";
  const message = STATUS_MESSAGES[statusKey] ?? STATUS_MESSAGES.pending;

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <ActivityIndicator size="large" color="#FF5733" />
      <Text className="mt-6 text-xl font-heading-semi text-neutral-900">
        {message.title}
      </Text>
      <Text className="mt-2 text-center text-sm text-neutral-500 font-body">
        {message.subtitle}
      </Text>
    </View>
  );
}
