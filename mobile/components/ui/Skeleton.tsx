import { View, type DimensionValue } from "react-native";
import { MotiView } from "moti";

interface SkeletonProps {
  readonly width?: DimensionValue;
  readonly height?: number;
  readonly borderRadius?: number;
  readonly className?: string;
}

export function Skeleton({
  width = "100%" as DimensionValue,
  height = 20,
  borderRadius = 8,
  className,
}: SkeletonProps) {
  return (
    <View
      className={className}
      style={{ width, height, borderRadius, overflow: "hidden" as const }}
    >
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 0.7 }}
        transition={{
          type: "timing",
          duration: 800,
          loop: true,
        }}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#E2E8F0",
          borderRadius,
        }}
      />
    </View>
  );
}
