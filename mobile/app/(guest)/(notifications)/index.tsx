import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/components/ui";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <View className="flex-1 bg-neutral-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-2xl font-heading text-neutral-900">
          Notifications
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text className="text-sm text-accent-500 font-body-medium">
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications as Array<(typeof notifications)[number]>}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => markAsRead(item.id)}>
            <Card
              className={`mb-3 ${!item.read ? "border-l-4 border-l-accent-500" : ""}`}
            >
              <Text className="text-base font-heading-semi text-neutral-900">
                {item.title}
              </Text>
              <Text className="mt-1 text-sm text-neutral-500 font-body">
                {item.body}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color="#CBD5E1"
            />
            <Text className="mt-4 text-base font-heading-semi text-neutral-400">
              No notifications
            </Text>
            <Text className="mt-1 text-sm text-neutral-400 font-body">
              You're all caught up!
            </Text>
          </View>
        }
      />
    </View>
  );
}
