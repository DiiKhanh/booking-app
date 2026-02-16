import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-50">
      <View
        className="flex-row items-center px-4 pb-3 border-b border-neutral-100 bg-white"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-4 text-lg font-heading-semi text-neutral-900">
          Payment Methods
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Ionicons name="card-outline" size={48} color="#CBD5E1" />
        <Text className="mt-4 text-base text-neutral-400 font-body">
          Payment methods coming in Phase 4
        </Text>
      </View>
    </View>
  );
}
