import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Avatar } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

export default function OwnerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
    >
      <View className="items-center px-6 pb-6">
        <Avatar uri={user?.avatar} name={user?.name ?? "O"} size="xl" />
        <Text className="mt-3 text-xl font-heading text-neutral-900">
          {user?.name}
        </Text>
        <Text className="mt-1 text-sm text-neutral-500 font-body">
          Hotel Owner
        </Text>
      </View>

      <View className="px-6">
        <TouchableOpacity
          className="flex-row items-center justify-center rounded-lg bg-error-500/10 py-3.5"
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text className="ml-2 text-base font-heading-semi text-error-500">
            Log Out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
