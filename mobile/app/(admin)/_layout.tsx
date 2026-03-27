import { Tabs } from "expo-router";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import {
  MomoTabBar,
  TabConfig,
} from "@/components/navigation/MomoTabBar";

export default function AdminLayout() {
  const leftTabs: TabConfig[] = [
    { routeName: "(overview)", label: "Overview", icon: "grid" },
    { routeName: "(users)", label: "Users", icon: "people" },
  ];

  const centerTab: TabConfig = {
    routeName: "(hotels)",
    label: "Hotels",
    icon: "business",
  };

  const rightTabs: TabConfig[] = [
    { routeName: "(system)", label: "System", icon: "server" },
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
          centerColor={["#7C3AED", "#9F67FA"]}
        />
      )}
    >
      <Tabs.Screen name="(overview)" />
      <Tabs.Screen name="(users)" />
      <Tabs.Screen name="(hotels)" />
      <Tabs.Screen name="(system)" />
    </Tabs>
  );
}
