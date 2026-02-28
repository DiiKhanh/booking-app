import { View, Text, StyleSheet } from "react-native";
import type { Message } from "@/types/chat.types";

interface MessageBubbleProps {
  readonly message: Message;
  readonly isMine: boolean;
}

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.content, isMine ? styles.contentMine : styles.contentOther]}>
          {message.content}
        </Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeOther]}>
          {timeLabel(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    marginVertical: 3,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  rowLeft: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: "#1A3A6B",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Inter-Regular",
  },
  contentMine: {
    color: "#FFFFFF",
  },
  contentOther: {
    color: "#0F172A",
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: "Inter-Regular",
  },
  timeMine: {
    color: "rgba(255,255,255,0.65)",
    textAlign: "right",
  },
  timeOther: {
    color: "#94A3B8",
  },
});
