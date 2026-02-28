import { useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { useNotifications } from "@/hooks/useNotifications";
import { apiClient } from "@/services/api";
import { API } from "@/constants/api";
import type { ApiResponse } from "@/types";

interface ApiNotification {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly type: string;
  readonly read: boolean;
  readonly createdAt: string;
  readonly data?: Record<string, unknown>;
}

const TYPE_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  "payment.succeeded": {
    icon: "checkmark-circle",
    color: "#059669",
    bg: "#ECFDF5",
  },
  "payment.failed": { icon: "close-circle", color: "#DC2626", bg: "#FEF2F2" },
  "booking.confirmed": { icon: "bed", color: "#2563EB", bg: "#EFF6FF" },
  "booking.cancelled": {
    icon: "calendar-clear",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  "booking.pending": { icon: "time", color: "#D97706", bg: "#FFFBEB" },
  promo: { icon: "pricetag", color: "#7C3AED", bg: "#F5F3FF" },
  info: { icon: "information-circle", color: "#0891B2", bg: "#ECFEFF" },
};

function getTypeConfig(type: string) {
  return (
    TYPE_CONFIG[type] ?? {
      icon: "notifications" as keyof typeof Ionicons.glyphMap,
      color: "#64748B",
      bg: "#F1F5F9",
    }
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface NotificationItemProps {
  item: ApiNotification;
  onRead: (id: string) => void;
  index: number;
}

function NotificationItem({ item, onRead, index }: NotificationItemProps) {
  const cfg = getTypeConfig(item.type);

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 50)}>
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifCardUnread]}
        activeOpacity={0.75}
        onPress={() => onRead(item.id)}
      >
        {/* Type icon */}
        <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={22} color={cfg.color} />
        </View>

        {/* Content */}
        <View style={styles.notifContent}>
          <View style={styles.notifTopRow}>
            <Text
              style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
        </View>

        {/* Unread dot */}
        {!item.read ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

function SkeletonNotif() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonIcon} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skeletonLine, { width: "60%" }]} />
        <View style={[styles.skeletonLine, { width: "85%", height: 12 }]} />
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Fetch from API and hydrate store (React Query v5 — no onSuccess)
  const hydratedRef = useRef(false);
  const {
    data: fetched,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res =
        await apiClient.get<ApiResponse<readonly ApiNotification[]>>(
          "/notifications",
        );
      return res.data.data ?? [];
    },
  });

  useEffect(() => {
    if (!fetched || hydratedRef.current) return;
    hydratedRef.current = true;
    const existingIds = new Set(notifications.map((n) => n.id));
    fetched
      .filter((n) => !existingIds.has(n.id))
      .forEach((n) => addNotification(n));
  }, [fetched]);

  const displayList: readonly ApiNotification[] =
    notifications.length > 0
      ? (notifications as unknown as ApiNotification[])
      : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 ? (
            <Text style={styles.headerSubtitle}>
              {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
            </Text>
          ) : null}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done-outline" size={16} color="#FF5733" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading && displayList.length === 0 ? (
        <View style={styles.listContent}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonNotif key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FF5733"
            />
          }
          renderItem={({ item, index }) => (
            <NotificationItem item={item} onRead={markAsRead} index={index} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="notifications-off-outline"
                  size={36}
                  color="#1A3A6B"
                />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                You have no notifications right now. We'll let you know when
                something happens.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter-Regular",
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF0EC",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  markAllText: {
    fontSize: 12,
    color: "#FF5733",
    fontFamily: "Inter-Medium",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  notifCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  notifCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: "#1A3A6B",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    color: "#334155",
    fontFamily: "Inter-Medium",
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  notifTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  notifBody: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Inter-Regular",
    lineHeight: 19,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5733",
    marginTop: 4,
    flexShrink: 0,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  skeletonLine: {
    height: 14,
    backgroundColor: "#E2E8F0",
    borderRadius: 7,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#E8EDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
