import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  readonly variant?: "elevated" | "outlined" | "filled";
  readonly padding?: "none" | "sm" | "md" | "lg";
}

const variantStyles: Record<string, string> = {
  elevated: "bg-white shadow-md shadow-black/10",
  outlined: "bg-white border border-neutral-200",
  filled: "bg-neutral-50",
};

const paddingStyles: Record<string, string> = {
  none: "",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  variant = "elevated",
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <View
      className={`rounded-lg ${variantStyles[variant]} ${paddingStyles[padding]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </View>
  );
}
