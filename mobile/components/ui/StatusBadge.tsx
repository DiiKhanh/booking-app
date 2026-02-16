import { View, Text } from "react-native";
import type { BookingStatus } from "@/types";

interface StatusBadgeProps {
  readonly status: BookingStatus;
}

const statusConfig: Record<
  BookingStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-warning-500/10",
    text: "text-warning-600",
    dot: "bg-warning-500",
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    bg: "bg-primary-100",
    text: "text-primary-600",
    dot: "bg-primary-500",
  },
  processing: {
    label: "Processing",
    bg: "bg-primary-100",
    text: "text-primary-600",
    dot: "bg-primary-500",
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-success-500/10",
    text: "text-success-600",
    dot: "bg-success-500",
  },
  failed: {
    label: "Failed",
    bg: "bg-error-500/10",
    text: "text-error-600",
    dot: "bg-error-500",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    dot: "bg-neutral-400",
  },
  completed: {
    label: "Completed",
    bg: "bg-success-500/10",
    text: "text-success-600",
    dot: "bg-success-500",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View
      className={`flex-row items-center self-start rounded-full px-3 py-1 ${config.bg}`}
    >
      <View className={`mr-1.5 h-2 w-2 rounded-full ${config.dot}`} />
      <Text className={`text-xs font-body-medium ${config.text}`}>
        {config.label}
      </Text>
    </View>
  );
}
