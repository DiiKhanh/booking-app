import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Avatar, Card } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

const MENU_ITEMS = [
  {
    icon: "settings-outline" as const,
    label: "Settings",
    route: "/(guest)/(profile)/settings",
  },
  {
    icon: "card-outline" as const,
    label: "Payment Methods",
    route: "/(guest)/(profile)/payment-methods",
  },
  {
    icon: "help-circle-outline" as const,
    label: "Help & Support",
    route: null,
  },
  {
    icon: "document-text-outline" as const,
    label: "Terms of Service",
    route: null,
  },
  { icon: "shield-outline" as const, label: "Privacy Policy", route: null },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View className="items-center px-6 pb-6">
        <Avatar uri={user?.avatar} name={user?.name ?? "U"} size="xl" />
        <Text className="mt-3 text-xl font-heading text-neutral-900">
          {user?.name}
        </Text>
        <Text className="mt-1 text-sm text-neutral-500 font-body">
          {user?.email}
        </Text>
      </View>

      <View className="px-6">
        <Card>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`flex-row items-center py-3.5 ${index < MENU_ITEMS.length - 1 ? "border-b border-neutral-100" : ""}`}
              onPress={() => {
                if (item.route) router.push(item.route as never);
              }}
            >
              <Ionicons name={item.icon} size={22} color="#475569" />
              <Text className="ml-3 flex-1 text-base text-neutral-700 font-body">
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity
          className="mt-6 flex-row items-center justify-center rounded-lg bg-error-500/10 py-3.5"
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
