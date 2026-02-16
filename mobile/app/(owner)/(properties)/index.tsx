import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card, Button } from "@/components/ui";

export default function PropertiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-2xl font-heading text-neutral-900">
          My Properties
        </Text>
        <Button
          title="Add"
          size="sm"
          leftIcon={<Ionicons name="add" size={18} color="#fff" />}
          onPress={() => router.push("/(owner)/(properties)/create")}
        />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="business-outline" size={48} color="#CBD5E1" />
        <Text className="mt-4 text-base font-heading-semi text-neutral-400">
          No properties yet
        </Text>
        <Text className="mt-1 text-center text-sm text-neutral-400 font-body">
          Add your first hotel to start receiving bookings
        </Text>
      </View>
    </View>
  );
}
