import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { chatService } from "@/services/chat.service";
import { useChatStore } from "@/stores/chat.store";
import { useAuthStore } from "@/stores/auth.store";
import type { Message } from "@/types/chat.types";

export default function OwnerChatRoomScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const convId = Number(conversationId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id ?? "");

  const messages = useChatStore((s) => s.messagesByConversation[convId] ?? []);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendOlder = useChatStore((s) => s.appendOlderMessages);
  const markRead = useChatStore((s) => s.markConversationRead);
  const isTyping = useChatStore((s) => s.isTyping[convId] ?? false);
  const prependMessage = useChatStore((s) => s.prependMessage);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Initial load
  useEffect(() => {
    void (async () => {
      try {
        const msgs = await chatService.getMessages(convId);
        setMessages(convId, msgs);
        setHasMore(msgs.length >= 50);
      } finally {
        setLoading(false);
      }
    })();
  }, [convId]);

  // Mark read on focus
  useFocusEffect(
    useCallback(() => {
      void chatService.markRead(convId).catch(() => {});
      markRead(convId);
    }, [convId]),
  );

  const loadMore = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[messages.length - 1];
      const older = await chatService.getMessages(convId, oldest.id);
      if (older.length === 0) {
        setHasMore(false);
      } else {
        appendOlder(convId, older);
        setHasMore(older.length >= 50);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async (content: string) => {
    setSending(true);
    try {
      const msg = await chatService.sendMessage(convId, content);
      prependMessage(convId, msg);
      updateLastMessage(convId, msg);
    } finally {
      setSending(false);
    }
  };

  // Display messages in chronological order (oldest at top).
  const displayMessages = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#1A3A6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guest Message</Text>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#1A3A6B" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMine={item.senderId === userId} />
          )}
          inverted
          contentContainerStyle={styles.messageList}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#94A3B8" style={styles.loadingMore} />
            ) : null
          }
          ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
        />
      )}

      {/* Input */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput onSend={handleSend} disabled={sending} />
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    color: "#0F172A",
    fontFamily: "PlusJakartaSans-SemiBold",
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    paddingVertical: 12,
  },
  loadingMore: {
    paddingVertical: 12,
  },
});
