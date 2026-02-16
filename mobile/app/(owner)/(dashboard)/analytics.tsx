import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 items-center justify-center bg-neutral-50" style={{ paddingTop: insets.top }}>
      <Ionicons name="analytics-outline" size={48} color="#CBD5E1" />
      <Text className="mt-4 text-base text-neutral-400 font-body">
        Analytics coming in Phase 5
      </Text>
    </View>
  );
}
