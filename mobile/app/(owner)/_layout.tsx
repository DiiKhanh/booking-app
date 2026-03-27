import { Tabs } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { useChatStore } from "@/stores/chat.store";
import {
  MomoTabBar,
  TabConfig,
} from "@/components/navigation/MomoTabBar";

export default function OwnerLayout() {
  const chatUnread = useChatStore((s) => s.totalUnreadCount);

  const leftTabs: TabConfig[] = [
    { routeName: "(dashboard)", label: "Dashboard", icon: "bar-chart" },
    { routeName: "(properties)", label: "Properties", icon: "business" },
  ];

  const centerTab: TabConfig = {
    routeName: "(reservations)",
    label: "Reservations",
    icon: "calendar",
  };

  const rightTabs: TabConfig[] = [
    {
      routeName: "(messages)",
      label: "Messages",
      icon: "chatbubbles",
      badge: chatUnread,
    },
    { routeName: "(owner-profile)", label: "Profile", icon: "person" },
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
          centerColor={["#1A3A6B", "#1E5FAD"]}
        />
      )}
    >
      <Tabs.Screen name="(dashboard)" />
      <Tabs.Screen name="(properties)" />
      <Tabs.Screen name="(reservations)" />
      <Tabs.Screen name="(messages)" />
      <Tabs.Screen name="(owner-profile)" />
    </Tabs>
  );
}
