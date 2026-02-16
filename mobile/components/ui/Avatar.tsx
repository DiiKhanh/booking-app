import { View, Text } from "react-native";
import { Image } from "expo-image";

interface AvatarProps {
  readonly uri?: string | null;
  readonly name: string;
  readonly size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: { container: "h-8 w-8", text: "text-xs" },
  md: { container: "h-10 w-10", text: "text-sm" },
  lg: { container: "h-14 w-14", text: "text-lg" },
  xl: { container: "h-20 w-20", text: "text-2xl" },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ uri, name, size = "md" }: AvatarProps) {
  const styles = sizeMap[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        className={`${styles.container} rounded-full`}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View
      className={`${styles.container} items-center justify-center rounded-full bg-primary-100`}
    >
      <Text className={`font-heading-semi text-primary-600 ${styles.text}`}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
