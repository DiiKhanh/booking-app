import { Tabs } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useChatStore } from "@/stores/chat.store";
import { MomoTabBar, TabConfig } from "@/components/navigation/MomoTabBar";

export default function GuestLayout() {
  const { unreadCount } = useNotifications();
  const chatUnread = useChatStore((s) => s.totalUnreadCount);
  useRealtimeConnection();

  // 5 items total: 2 left + 1 center floating + 2 right
  const leftTabs: TabConfig[] = [
    { routeName: "(home)", label: "Home", icon: "home" },
    { routeName: "(search)", label: "Search", icon: "search" },
  ];

  const centerTab: TabConfig = {
    routeName: "(bookings)",
    label: "Bookings",
    icon: "receipt",
  };

  const rightTabs: TabConfig[] = [
    {
      routeName: "(notifications)",
      label: "Alerts",
      icon: "notifications",
      badge: unreadCount,
    },
    { routeName: "(profile)", label: "Profile", icon: "person" },
  ];

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => (
        <MomoTabBar
          {...props}
          leftTabs={leftTabs}
          centerTab={centerTab}
          rightTabs={rightTabs}
          centerColor={["#1A3A6B", "#2D62B5"]}
        />
      )}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(search)" />
      <Tabs.Screen name="(bookings)" />
      <Tabs.Screen name="(notifications)" />
      {/* Messages accessible via push navigation, not shown in tab bar */}
      <Tabs.Screen name="(messages)" options={{ href: null }} />
      <Tabs.Screen name="(profile)" />
    </Tabs>
  );
}
