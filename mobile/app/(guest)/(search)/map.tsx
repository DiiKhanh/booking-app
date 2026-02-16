import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-100">
      <View
        className="absolute left-4 z-10"
        style={{ top: insets.top + 8 }}
      >
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-md shadow-black/10"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center">
        <Ionicons name="map" size={64} color="#CBD5E1" />
        <Text className="mt-4 text-base text-neutral-400 font-body">
          Map view will be integrated in Phase 2
        </Text>
      </View>
    </View>
  );
}
