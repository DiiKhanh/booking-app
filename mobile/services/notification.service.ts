import { API } from "@/constants/api";

type NotificationCallback = (data: unknown) => void;

export function createWebSocket(
  path: string,
  onMessage: NotificationCallback,
) {
  const ws = new WebSocket(`${API.WS_URL}${path}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      onMessage(data);
    } catch {
      // ignore malformed messages
    }
  };

  ws.onerror = () => {
    ws.close();
  };

  return ws;
}
