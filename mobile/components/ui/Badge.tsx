import { View, Text } from "react-native";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  readonly label: string;
  readonly variant?: BadgeVariant;
  readonly size?: "sm" | "md";
}

const variantBgStyles: Record<BadgeVariant, string> = {
  default: "bg-neutral-100",
  success: "bg-success-500/10",
  warning: "bg-warning-500/10",
  error: "bg-error-500/10",
  info: "bg-primary-100",
};

const variantTextStyles: Record<BadgeVariant, string> = {
  default: "text-neutral-700",
  success: "text-success-600",
  warning: "text-warning-600",
  error: "text-error-600",
  info: "text-primary-600",
};

export function Badge({
  label,
  variant = "default",
  size = "sm",
}: BadgeProps) {
  return (
    <View
      className={`self-start rounded-full ${variantBgStyles[variant]} ${size === "sm" ? "px-2 py-0.5" : "px-3 py-1"}`}
    >
      <Text
        className={`font-body-medium ${variantTextStyles[variant]} ${size === "sm" ? "text-xs" : "text-sm"}`}
      >
        {label}
      </Text>
    </View>
  );
}
