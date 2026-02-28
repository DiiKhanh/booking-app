import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useBookingFlow } from "@/hooks/useBookingFlow";
import { useBookingStatus } from "@/hooks/useBookings";

type Step = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

const STEPS: Step[] = [
  { key: "pending", label: "Reservation created", icon: "receipt-outline" },
  { key: "awaiting_payment", label: "Processing payment", icon: "card-outline" },
  { key: "processing", label: "Confirming with hotel", icon: "business-outline" },
  { key: "confirmed", label: "Booking confirmed!", icon: "checkmark-circle" },
];

const STATUS_ORDER = ["pending", "awaiting_payment", "processing", "confirmed", "failed"];

function getStepIndex(status: string | null): number {
  const idx = STATUS_ORDER.indexOf(status ?? "pending");
  return idx === -1 ? 0 : idx;
}

function SpinnerDot() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="reload" size={20} color="#FF5733" />
    </Animated.View>
  );
}

export default function ProcessingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sagaStatus, currentBookingId, updateSagaStatus } = useBookingFlow();

  const { data: statusData } = useBookingStatus(
    currentBookingId ?? "",
    !!currentBookingId && sagaStatus !== "confirmed" && sagaStatus !== "failed"
  );

  // Sync polled status into booking flow store
  useEffect(() => {
    if (statusData?.status && statusData.status !== sagaStatus) {
      updateSagaStatus(statusData.status);
    }
  }, [statusData, sagaStatus, updateSagaStatus]);

  useEffect(() => {
    if (sagaStatus === "confirmed" || sagaStatus === "failed") {
      const timeout = setTimeout(() => {
        router.replace("/(guest)/(home)/booking/confirmation");
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [sagaStatus, router]);

  const currentStepIdx = getStepIndex(sagaStatus);
  const isFailed = sagaStatus === "failed";

  return (
    <View
      className="flex-1 bg-white items-center justify-center px-8"
      style={{ paddingBottom: insets.bottom + 24 }}
    >
      {/* Icon */}
      <View
        className="mb-8 h-24 w-24 items-center justify-center rounded-full"
        style={{ backgroundColor: isFailed ? "#FEF2F2" : "#F8FAFC" }}
      >
        {isFailed ? (
          <Ionicons name="close-circle" size={52} color="#EF4444" />
        ) : sagaStatus === "confirmed" ? (
          <Ionicons name="checkmark-circle" size={52} color="#10B981" />
        ) : (
          <SpinnerDot />
        )}
      </View>

      {/* Title */}
      <Text
        className="text-2xl text-neutral-900 text-center mb-2"
        style={{ fontFamily: "PlusJakartaSans-Bold" }}
      >
        {isFailed
          ? "Payment Failed"
          : sagaStatus === "confirmed"
          ? "All Set!"
          : "Processing..."}
      </Text>
      <Text
        className="text-sm text-center mb-10"
        style={{ fontFamily: "Inter-Regular", color: "#64748B", lineHeight: 22 }}
      >
        {isFailed
          ? "Your payment could not be processed. No charges were made."
          : sagaStatus === "confirmed"
          ? "Redirecting you to your booking..."
          : "Please don't close the app while we confirm your booking."}
      </Text>

      {/* Steps */}
      <View className="w-full gap-0">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIdx || sagaStatus === "confirmed";
          const isActive = idx === currentStepIdx && sagaStatus !== "confirmed" && !isFailed;
          const isFuture = idx > currentStepIdx && sagaStatus !== "confirmed";

          return (
            <View key={step.key} className="flex-row items-start">
              {/* Line + circle column */}
              <View className="items-center w-8 mr-4">
                <View
                  className="h-8 w-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDone
                      ? "#10B981"
                      : isActive
                      ? "#FF5733"
                      : "#F1F5F9",
                  }}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : isActive ? (
                    <Ionicons name={step.icon} size={15} color="#fff" />
                  ) : (
                    <Ionicons name={step.icon} size={15} color="#CBD5E1" />
                  )}
                </View>
                {/* Connector */}
                {idx < STEPS.length - 1 && (
                  <View
                    className="w-0.5 flex-1 mt-1 mb-1"
                    style={{
                      backgroundColor: isDone ? "#10B981" : "#E2E8F0",
                      height: 20,
                    }}
                  />
                )}
              </View>

              {/* Label */}
              <View className="flex-1 pb-5">
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: isActive ? "Inter-Medium" : "Inter-Regular",
                    color: isDone ? "#10B981" : isActive ? "#1E293B" : "#94A3B8",
                  }}
                >
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
