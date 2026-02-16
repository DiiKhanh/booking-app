import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function EventLogsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      <View className="px-6 py-4">
        <Text className="text-2xl font-heading text-neutral-900">
          Event Logs
        </Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
        <Text className="mt-4 text-base text-neutral-400 font-body">
          Event logs coming in Phase 6
        </Text>
      </View>
    </View>
  );
}
