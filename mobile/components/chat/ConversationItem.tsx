import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Conversation } from "@/types/chat.types";

interface ConversationItemProps {
  readonly conversation: Conversation;
  readonly currentUserId: string;
  readonly onPress: (conv: Conversation) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationItem({
  conversation,
  currentUserId,
  onPress,
}: ConversationItemProps) {
  const otherId =
    conversation.participantA === currentUserId
      ? conversation.participantB
      : conversation.participantA;

  const displayName = otherId
    ? `User ${otherId.slice(0, 8)}…`
    : "Broadcast";

  const lastContent = conversation.lastMessage?.content ?? "No messages yet";
  const hasUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity
      style={[styles.row, hasUnread && styles.rowUnread]}
      onPress={() => onPress(conversation)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Ionicons
          name={conversation.type === "broadcast" ? "megaphone" : "person"}
          size={22}
          color="#1A3A6B"
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.time}>{timeAgo(conversation.lastMessageAt)}</Text>
        </View>
        <Text
          style={[styles.preview, hasUnread && styles.previewUnread]}
          numberOfLines={1}
        >
          {lastContent}
        </Text>
      </View>

      {/* Unread badge */}
      {hasUnread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  rowUnread: {
    backgroundColor: "#F0F4FF",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8EDF5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    color: "#334155",
    fontFamily: "Inter-Medium",
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  time: {
    fontSize: 11,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  preview: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: "Inter-Regular",
  },
  previewUnread: {
    color: "#475569",
    fontFamily: "Inter-Medium",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF5733",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
});
