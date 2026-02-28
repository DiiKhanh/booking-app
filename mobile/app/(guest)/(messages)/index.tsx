import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { ConversationItem } from "@/components/chat/ConversationItem";
import { chatService } from "@/services/chat.service";
import { useChatStore } from "@/stores/chat.store";
import { useAuthStore } from "@/stores/auth.store";
import type { Conversation } from "@/types/chat.types";

export default function GuestMessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);

  const { isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => chatService.listConversations(),
    select: (res) => res.data,
  });

  const { data } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: () => chatService.listConversations(),
  });

  useEffect(() => {
    if (data?.data) {
      setConversations(data.data);
    }
  }, [data]);

  const handlePress = useCallback(
    (conv: Conversation) => {
      router.push(`/(guest)/(messages)/${conv.id}`);
    },
    [router],
  );

  const displayList = conversations.length > 0
    ? [...conversations].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      )
    : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={displayList}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FF5733"
          />
        }
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            currentUserId={userId}
            onPress={handlePress}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Message a hotel owner from the hotel detail page.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-Bold",
  },
  list: { flexGrow: 1 },
  separator: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 76 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
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
