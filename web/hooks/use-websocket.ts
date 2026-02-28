"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseWebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: string | object) => void;
  disconnect: () => void;
}

export function useWebSocket(
  url: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(reconnectDelay);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!url || !mountedRef.current) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      reconnectDelayRef.current = reconnectDelay;
      onOpen?.();
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      onMessage?.(event);
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      onClose?.();

      if (reconnect) {
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * 2,
              maxReconnectDelay
            );
            connect();
          }
        }, reconnectDelayRef.current);
      }
    };

    ws.onerror = (event) => {
      if (!mountedRef.current) return;
      onError?.(event);
    };
  }, [url, onMessage, onOpen, onClose, onError, reconnect, reconnectDelay, maxReconnectDelay]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        typeof data === "string" ? data : JSON.stringify(data)
      );
    }
  }, []);

  const disconnect = useCallback(() => {
    mountedRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  return { isConnected, send, disconnect };
}
