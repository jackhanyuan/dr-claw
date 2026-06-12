import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { IS_PLATFORM } from '../constants/config';

type WebSocketContextType = {
  ws: WebSocket | null;
  sendMessage: (message: any) => void;
  latestMessage: any | null;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

const buildWebSocketUrl = (token: string | null) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  if (IS_PLATFORM) {
    return `${protocol}//${window.location.host}/ws`;
  }

  if (!token) {
    return null;
  }

  return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
};

const useWebSocketProviderState = (): WebSocketContextType => {
  const wsRef = useRef<WebSocket | null>(null);
  const unmountedRef = useRef(false);
  const [latestMessage, setLatestMessage] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const { token } = useAuth();

  // Message queue: ensures every WebSocket message is delivered to consumers
  // even when multiple arrive before React can re-render.
  const messageQueueRef = useRef<any[]>([]);
  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drainQueue = useCallback(() => {
    drainTimerRef.current = null;
    if (messageQueueRef.current.length === 0) return;
    const next = messageQueueRef.current.shift()!;
    setLatestMessage(next);
    if (messageQueueRef.current.length > 0) {
      drainTimerRef.current = setTimeout(drainQueue, 0);
    }
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    
    return () => {
      unmountedRef.current = true;
      retryCountRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (drainTimerRef.current) {
        clearTimeout(drainTimerRef.current);
      }
      const socket = wsRef.current;
      wsRef.current = null;
      if (socket) {
        // Detach handlers before closing so a socket that closes during teardown
        // (including one still in CONNECTING state) cannot schedule a reconnect or
        // mutate state from a torn-down effect.
        socket.onopen = null;
        socket.onclose = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.close();
      }
    };
  }, [token]);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    try {
      const wsUrl = buildWebSocketUrl(token);

      if (!wsUrl) return console.warn('No authentication token found for WebSocket connection');

      const websocket = new WebSocket(wsUrl);
      // Track the socket immediately (not just in onopen) so effect cleanup can always
      // close an in-flight CONNECTING socket and we never leak a half-open connection.
      wsRef.current = websocket;

      websocket.onopen = () => {
        if (wsRef.current !== websocket) return; // superseded by a newer connection
        retryCountRef.current = 0;
        setIsConnected(true);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          messageQueueRef.current.push(data);
          if (!drainTimerRef.current) {
            drainTimerRef.current = setTimeout(drainQueue, 0);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        if (wsRef.current !== websocket) return; // a newer socket replaced this one
        setIsConnected(false);
        wsRef.current = null;

        if (unmountedRef.current) return; // do not reconnect after teardown

        const delay = Math.min(3000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (unmountedRef.current) return;
          connect();
        }, delay);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [token, drainQueue]);

  const sendMessage = useCallback((message: any) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  const value: WebSocketContextType = useMemo(() =>
  ({
    ws: wsRef.current,
    sendMessage,
    latestMessage,
    isConnected
  }), [sendMessage, latestMessage, isConnected]);

  return value;
};

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const webSocketData = useWebSocketProviderState();
  
  return (
    <WebSocketContext.Provider value={webSocketData}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
