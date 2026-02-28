import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  type TouchableOpacityProps,
} from "react-native";
import * as Haptics from "expo-haptics";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends TouchableOpacityProps {
  readonly title: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly fullWidth?: boolean;
  readonly leftIcon?: React.ReactNode;
  readonly rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent-500 active:bg-accent-600",
  secondary: "bg-primary-500 active:bg-primary-600",
  outline: "border-2 border-primary-500 bg-transparent",
  ghost: "bg-transparent",
  danger: "bg-error-500 active:bg-error-600",
};

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-white",
  outline: "text-primary-500",
  ghost: "text-primary-500",
  danger: "text-white",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2",
  md: "px-6 py-3",
  lg: "px-8 py-4",
};

const sizeTextStyles: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress: TouchableOpacityProps["onPress"] = (e) => {
    if (!isDisabled && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    props.onPress?.(e);
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center rounded-md ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-50" : ""} ${className ?? ""}`}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
      onPress={handlePress}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost" ? "#1A3A6B" : "#fff"
          }
        />
      ) : (
        <>
          {leftIcon}
          <Text
            className={`font-heading-semi ${variantTextStyles[variant]} ${sizeTextStyles[size]} ${leftIcon ? "ml-2" : ""} ${rightIcon ? "mr-2" : ""}`}
          >
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}
