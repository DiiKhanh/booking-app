import { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useChatStore } from "@/stores/chat.store";

const ACTIVE_COLOR = "#1A3A6B";
const INACTIVE_COLOR = "#94A3B8";
const PILL_COLOR = "#1A3A6B";
const ICON_SIZE = 22;

interface MomoTabIconProps {
  readonly name: keyof typeof Ionicons.glyphMap;
  readonly focused: boolean;
  readonly badge?: number;
}

function MomoTabIcon({ name, focused, badge }: MomoTabIconProps) {
  const pillOpacity = useSharedValue(focused ? 1 : 0);
  const pillScale = useSharedValue(focused ? 1 : 0.75);
  const iconScale = useSharedValue(focused ? 1 : 0.88);

  useEffect(() => {
    pillOpacity.value = withSpring(focused ? 1 : 0, {
      damping: 18,
      stiffness: 320,
    });
    pillScale.value = withSpring(focused ? 1 : 0.75, {
      damping: 14,
      stiffness: 280,
    });
    iconScale.value = withSpring(focused ? 1 : 0.88, {
      damping: 12,
      stiffness: 250,
    });
  }, [focused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const outlineName = `${name}-outline` as keyof typeof Ionicons.glyphMap;

  return (
    <View style={styles.iconWrapper}>
      {/* Animated pill background */}
      <Animated.View style={[styles.pill, pillStyle]} />

      {/* Icon */}
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? name : outlineName}
          size={ICON_SIZE}
          color={focused ? "#FFFFFF" : INACTIVE_COLOR}
        />
      </Animated.View>

      {/* Notification badge */}
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function GuestLayout() {
  const { unreadCount } = useNotifications();
  const chatUnread = useChatStore((s) => s.totalUnreadCount);
  useRealtimeConnection();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : "#FFFFFF",
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 26 : 10,
          paddingTop: 8,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.07,
          shadowRadius: 20,
          ...(Platform.OS === "android" && {
            borderTopColor: "#F1F5F9",
            borderTopWidth: 1,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter-Medium",
          marginTop: 3,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        // iOS blur effect underneath
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={90}
              tint="light"
              style={StyleSheet.absoluteFillObject}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <MomoTabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(search)"
        options={{
          title: "Search",
          tabBarIcon: ({ focused }) => (
            <MomoTabIcon name="search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(bookings)"
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused }) => (
            <MomoTabIcon name="receipt" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(notifications)"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => (
            <MomoTabIcon
              name="notifications"
              focused={focused}
              badge={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(messages)"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => (
            <MomoTabIcon
              name="chatbubbles"
              focused={focused}
              badge={chatUnread}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <MomoTabIcon name="person" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 52,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    width: 52,
    height: 34,
    borderRadius: 17,
    backgroundColor: PILL_COLOR,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF5733",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 9,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
});
