import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/components/ui";

const ADMIN_STATS = [
  { label: "Total Users", value: "0", icon: "people" as const, color: "#3B82F6" },
  { label: "Total Hotels", value: "0", icon: "business" as const, color: "#8B5CF6" },
  { label: "Active Bookings", value: "0", icon: "receipt" as const, color: "#10B981" },
  { label: "Revenue", value: "$0", icon: "cash" as const, color: "#F59E0B" },
];

export default function AdminOverviewScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 20 }}
    >
      <View className="px-6 mb-6">
        <Text className="text-sm text-neutral-500 font-body">Admin Panel</Text>
        <Text className="text-2xl font-heading text-primary-500">
          System Overview
        </Text>
      </View>

      <View className="flex-row flex-wrap px-4">
        {ADMIN_STATS.map((stat) => (
          <View key={stat.label} className="w-1/2 p-2">
            <Card>
              <View className="flex-row items-center mb-2">
                <Ionicons name={stat.icon} size={20} color={stat.color} />
                <Text className="ml-2 text-sm text-neutral-500 font-body">
                  {stat.label}
                </Text>
              </View>
              <Text className="text-2xl font-heading text-neutral-900">
                {stat.value}
              </Text>
            </Card>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
