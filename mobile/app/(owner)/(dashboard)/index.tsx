import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

const STATS = [
  { label: "Revenue", value: "$0", icon: "cash-outline" as const, color: "#10B981" },
  { label: "Bookings", value: "0", icon: "receipt-outline" as const, color: "#3B82F6" },
  { label: "Occupancy", value: "0%", icon: "bed-outline" as const, color: "#F59E0B" },
  { label: "Properties", value: "0", icon: "business-outline" as const, color: "#8B5CF6" },
];

export default function OwnerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { userName } = useAuth();

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 20 }}
    >
      <View className="px-6 mb-6">
        <Text className="text-sm text-neutral-500 font-body">Dashboard</Text>
        <Text className="text-2xl font-heading text-primary-500">
          {userName}
        </Text>
      </View>

      <View className="flex-row flex-wrap px-4 gap-0">
        {STATS.map((stat) => (
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

      <View className="px-6 mt-4">
        <Card>
          <View className="items-center py-8">
            <Ionicons name="bar-chart" size={48} color="#CBD5E1" />
            <Text className="mt-4 text-base text-neutral-400 font-body">
              Revenue chart will appear here
            </Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
