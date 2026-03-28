import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * WebSocket hook для real-time соединений
 * Поддерживает автоматическое переподключение и обработку состояний
 */
export const useWebSocket = (url, options = {}) => {
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const retryCountRef = useRef(0);
    const mountedRef = useRef(true);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);
    const [readyState, setReadyState] = useState(3); // WebSocket.CLOSED
    const [retryCount, setRetryCount] = useState(0);

    const {
        onOpen,
        onMessage,
        onClose,
        onError,
        reconnectInterval = 1000,
        maxReconnectAttempts = 6,
        protocols = [],
    } = options;

    // Store callbacks in refs to avoid stale closures and dependency changes
    const onOpenRef = useRef(onOpen);
    const onMessageRef = useRef(onMessage);
    const onCloseRef = useRef(onClose);
    const onErrorRef = useRef(onError);

    useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
    useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    // Get auth token for WebSocket authentication
    const getAuthToken = useCallback(() => {
        try {
            const tokens = JSON.parse(localStorage.getItem('wibeTokens'));
            return tokens?.access || null;
        } catch {
            return null;
        }
    }, []);

    const connectRef = useRef(null);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        try {
            // Build URL with auth token if available
            const token = getAuthToken();
            const separator = url.includes('?') ? '&' : '?';
            const wsUrl = token ? `${url}${separator}token=${token}` : url;

            wsRef.current = new WebSocket(wsUrl, protocols);
            setReadyState(WebSocket.CONNECTING);

            wsRef.current.onopen = (event) => {
                if (!mountedRef.current) return;
                setReadyState(WebSocket.OPEN);
                setIsConnected(true);
                setError(null);
                retryCountRef.current = 0;
                setRetryCount(0);
                if (onOpenRef.current) onOpenRef.current(event);
                if (import.meta.env.DEV) console.log('[WebSocket] Connected:', url);
            };

            wsRef.current.onmessage = (event) => {
                if (!mountedRef.current) return;
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                    if (onMessageRef.current) onMessageRef.current(data);
                } catch {
                    if (onMessageRef.current) onMessageRef.current(event.data);
                }
            };

            wsRef.current.onclose = (event) => {
                if (!mountedRef.current) return;
                setReadyState(WebSocket.CLOSED);
                setIsConnected(false);
                if (onCloseRef.current) onCloseRef.current(event);
                if (import.meta.env.DEV) console.log('[WebSocket] Disconnected:', url);

                // Attempt to reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s, capped at 30s)
                if (retryCountRef.current < maxReconnectAttempts && mountedRef.current) {
                    const currentRetry = retryCountRef.current;
                    const delay = Math.min(reconnectInterval * Math.pow(2, currentRetry), 30000);
                    if (import.meta.env.DEV) console.log(`[WebSocket] Reconnecting in ${delay}ms... (attempt ${currentRetry + 1}/${maxReconnectAttempts})`);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (mountedRef.current && connectRef.current) {
                            const nextRetry = currentRetry + 1;
                            retryCountRef.current = nextRetry;
                            setRetryCount(nextRetry);
                            connectRef.current();
                        }
                    }, delay);
                } else {
                    if (import.meta.env.DEV) console.error('[WebSocket] Max reconnect attempts reached');
                }
            };

            wsRef.current.onerror = (event) => {
                if (!mountedRef.current) return;
                setError(event);
                if (onErrorRef.current) onErrorRef.current(event);
                if (import.meta.env.DEV) console.error('[WebSocket] Error:', url);
            };
        } catch (err) {
            setError(err);
            if (onErrorRef.current) onErrorRef.current(err);
        }
    }, [url, protocols, getAuthToken, reconnectInterval, maxReconnectAttempts]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.onclose = null; // Prevent reconnect on manual disconnect
            wsRef.current.close();
            wsRef.current = null;
        }

        setReadyState(WebSocket.CLOSED);
        setIsConnected(false);
        setLastMessage(null);
        setError(null);
        retryCountRef.current = 0;
        setRetryCount(0);
    }, []);

    const sendMessage = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            wsRef.current.send(message);
            return true;
        }
        if (import.meta.env.DEV) console.warn('[WebSocket] Cannot send message - not connected');
        return false;
    }, []);

    // Auto-connect on mount, cleanup on unmount (defer connect to avoid sync setState in effect)
    useEffect(() => {
        mountedRef.current = true;
        const t = setTimeout(() => connect(), 0);
        return () => {
            clearTimeout(t);
            mountedRef.current = false;
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        isConnected,
        lastMessage,
        error,
        retryCount,
        sendMessage,
        connect,
        disconnect,
        readyState,
    };
};

/**
 * Хук для WebSocket чата
 */
export const useChatWebSocket = (chatId, callbacks = {}) => {
    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'}/ws/chat/${chatId}/`;

    // Memoize callbacks to avoid recreating WebSocket connection
    const callbacksRef = useRef(callbacks);
    useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);

    const handleMessage = useCallback((data) => {
        if (callbacksRef.current.onMessage) {
            callbacksRef.current.onMessage(data);
        }
    }, []);

    return useWebSocket(wsUrl, {
        onMessage: handleMessage,
        onOpen: callbacks.onOpen,
        onClose: callbacks.onClose,
        onError: callbacks.onError,
    });
};

/**
 * Хук для WebSocket уведомлений
 */
export const useNotificationWebSocket = (callbacks = {}) => {
    const wsUrl = `${import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'}/ws/notifications/`;

    // Memoize callbacks to avoid recreating WebSocket connection
    const callbacksRef = useRef(callbacks);
    useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);

    const handleMessage = useCallback((data) => {
        if (callbacksRef.current.onMessage) {
            callbacksRef.current.onMessage(data);
        }
    }, []);

    return useWebSocket(wsUrl, {
        onMessage: handleMessage,
        onOpen: callbacks.onOpen,
        onClose: callbacks.onClose,
        onError: callbacks.onError,
    });
};

export default useWebSocket;
