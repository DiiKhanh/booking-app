import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

interface ConflictRetryModalProps {
  readonly visible: boolean;
  readonly onRetry: () => void;
  readonly onViewAlternatives: () => void;
  readonly onChangeDates: () => void;
  readonly onDismiss: () => void;
  readonly retrying?: boolean;
}

export function ConflictRetryModal({
  visible,
  onRetry,
  onViewAlternatives,
  onChangeDates,
  onDismiss,
  retrying = false,
}: ConflictRetryModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        <Animated.View
          entering={ZoomIn.delay(100).duration(300)}
          className="w-full rounded-3xl bg-white overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 20,
          }}
        >
          {/* Header Icon */}
          <View className="items-center pt-8 pb-4">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "#FFF0EC" }}
            >
              <Ionicons name="alert-circle" size={44} color="#FF5733" />
            </View>
          </View>

          {/* Content */}
          <View className="px-6 pb-2">
            <Text
              className="text-center text-xl text-neutral-900"
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
            >
              Room Just Booked
            </Text>
            <Text
              className="mt-2 text-center text-sm"
              style={{ fontFamily: "Inter-Regular", color: "#64748B", lineHeight: 22 }}
            >
              Someone else just reserved this room. Don't worry — you have other options to get a great stay!
            </Text>
          </View>

          {/* Options */}
          <View className="px-6 py-6 gap-3">
            {/* Retry */}
            <TouchableOpacity
              onPress={onRetry}
              disabled={retrying}
              className="flex-row items-center rounded-2xl p-4 gap-4"
              style={{ backgroundColor: "#FFF0EC" }}
              activeOpacity={0.7}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#FF5733" }}
              >
                {retrying ? (
                  <Ionicons name="reload" size={20} color="#fff" />
                ) : (
                  <Ionicons name="refresh" size={20} color="#fff" />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm text-neutral-900"
                  style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                >
                  Try Again
                </Text>
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                >
                  {retrying ? "Checking availability..." : "Attempt to book this room again"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#FF5733" />
            </TouchableOpacity>

            {/* View Alternatives */}
            <TouchableOpacity
              onPress={onViewAlternatives}
              className="flex-row items-center rounded-2xl p-4 gap-4"
              style={{ backgroundColor: "#F1F5F9" }}
              activeOpacity={0.7}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#1A3A6B" }}
              >
                <Ionicons name="search" size={20} color="#fff" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm text-neutral-900"
                  style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                >
                  View Similar Rooms
                </Text>
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                >
                  See other available options at this hotel
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Change Dates */}
            <TouchableOpacity
              onPress={onChangeDates}
              className="flex-row items-center rounded-2xl p-4 gap-4"
              style={{ backgroundColor: "#F1F5F9" }}
              activeOpacity={0.7}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#10B981" }}
              >
                <Ionicons name="calendar" size={20} color="#fff" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm text-neutral-900"
                  style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                >
                  Change Dates
                </Text>
                <Text
                  className="text-xs"
                  style={{ fontFamily: "Inter-Regular", color: "#94A3B8" }}
                >
                  Try different check-in / check-out dates
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Cancel */}
          <TouchableOpacity
            onPress={onDismiss}
            className="items-center pb-8"
          >
            <Text
              className="text-sm"
              style={{ fontFamily: "Inter-Medium", color: "#94A3B8" }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
