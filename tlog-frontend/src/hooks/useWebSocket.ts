import { useCallback, useEffect, useRef, useState } from 'react';
import { WebSocketMessage, WebSocketMessageSchema } from '../api/types';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
const WS_ENABLED = import.meta.env.VITE_WS_ENABLED === 'true' || false; // Временно отключено

interface UseWebSocketOptions {
  onMessage?: (data: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(roundId: string, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { onMessage, onConnect, onDisconnect, onError } = options;

  const connect = useCallback(() => {
    // Временно отключаем WebSocket
    if (!WS_ENABLED) {
      console.log('WebSocket disabled - using polling instead');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/round/${roundId}`);

      ws.onopen = () => {
        setIsConnected(true);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message = WebSocketMessageSchema.parse(data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();
      };

      ws.onerror = (error) => {
        console.warn('WebSocket error:', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.warn('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  }, [roundId, onMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    isEnabled: WS_ENABLED,
  };
}
