import { Tabs } from "expo-router";
import { View, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";

const TAB_ICON_SIZE = 22;

function TabBarIcon({
  name,
  color,
  focused,
}: {
  readonly name: keyof typeof Ionicons.glyphMap;
  readonly color: string;
  readonly focused: boolean;
}) {
  return (
    <View className="items-center justify-center pt-1.5">
      {focused && (
        <View
          className="absolute -top-0.5 h-1 w-5 rounded-full"
          style={{ backgroundColor: "#FF5733" }}
        />
      )}
      <Ionicons name={name} size={TAB_ICON_SIZE} color={color} />
    </View>
  );
}

export default function GuestLayout() {
  const { unreadCount } = useNotifications();
  // Establish WebSocket connection for real-time booking status + notifications.
  useRealtimeConnection();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF5733",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          position: "absolute",
          backgroundColor:
            Platform.OS === "ios" ? "rgba(255, 255, 255, 0.85)" : "#FFFFFF",
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 8,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          ...(Platform.OS === "android" && {
            borderTopColor: "#F1F5F9",
            borderTopWidth: 1,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter-Medium",
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(search)"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "search" : "search-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(bookings)"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "receipt" : "receipt-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(notifications)"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabBarIcon
                name={focused ? "notifications" : "notifications-outline"}
                color={color}
                focused={focused}
              />
              {unreadCount > 0 && (
                <View
                  className="absolute -right-2.5 -top-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full px-1"
                  style={{ backgroundColor: "#FF5733" }}
                >
                  <Text
                    className="text-[10px] text-white"
                    style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "person" : "person-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
