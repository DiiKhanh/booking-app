import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function AdminHotelsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      <View className="px-6 py-4">
        <Text className="text-2xl font-heading text-neutral-900">
          Hotel Approvals
        </Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <Ionicons name="shield-checkmark-outline" size={48} color="#CBD5E1" />
        <Text className="mt-4 text-base text-neutral-400 font-body">
          Approval queue coming in Phase 6
        </Text>
      </View>
    </View>
  );
}
