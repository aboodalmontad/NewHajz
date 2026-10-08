import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import api, { NetworkInfo } from '../server/api';
import { Customer, Employee, Window, QueueSystemState, MeshMessage, PrinterConfig, ChatMessage } from '../types';
import { PeerManager, PeerStatus } from '../server/peerManager';
import { playMessageNotificationSound } from '../utils/sound';

interface QueueContextType {
  state: QueueSystemState | null;
  isLoading: boolean;
  meshStatus: PeerStatus;
  networkInfo: NetworkInfo | null;
  refreshNetworkInfo: () => Promise<void>;
  fetchState: () => Promise<void>;
  addCustomer: (serviceName?: string) => Promise<Customer | undefined>;
  callNextCustomer: (employeeId: number) => Promise<void>;
  finishService: (employeeId: number) => Promise<void>;
  assignEmployeeToWindow: (employeeId: number, windowId: number) => Promise<void>;
  unassignEmployeeFromWindow: (employeeId: number) => Promise<void>;
  addEmployee: (name: string, username: string, password: string) => Promise<void>;
  updateEmployee: (id: number, name: string, username: string, password?: string) => Promise<void>;
  removeEmployee: (id: number) => Promise<void>;
  addWindow: (name: string, customTask?: string) => Promise<void>;
  updateWindowName: (id: number, name: string) => Promise<void>;
  removeWindow: (id: number) => Promise<void>;
  updateWindowTask: (id: number, task: string) => Promise<void>;
  rateCustomer: (customerId: number, rating: number, feedback?: string) => Promise<void>;
  resetSystem: () => Promise<void>;
  authenticateEmployee: (username: string, password: string) => Promise<Employee | undefined>;
  authenticateAdmin: (password: string) => Promise<boolean>;
  updateAdminPassword: (newPassword: string) => Promise<void>;
  updatePrinterConfig: (config: PrinterConfig) => Promise<void>;

  // Chat between Admin and Windows
  sendChatMessage: (windowId: number, senderType: 'admin' | 'window', senderName: string, text: string) => Promise<ChatMessage | undefined>;
  broadcastChatMessage: (senderName: string, text: string) => Promise<void>;
  markChatMessagesAsRead: (windowId: number, readerType: 'admin' | 'window') => Promise<void>;
  clearChatHistory: (windowId?: number) => Promise<void>;
  
  // Local Network & Cloud Sync Methods
  enableCloudSync: () => Promise<string>;
  joinCloudSync: (syncId: string) => Promise<boolean>;
  createCustomSyncSession: (customId: string) => Promise<boolean>;
  
  // Local Mesh Methods
  startMeshHost: () => Promise<string>;
  completeMeshHost: (answer: string) => Promise<void>;
  joinMeshClient: (offer: string) => Promise<string>;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueueSystem = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueueSystem must be used within a QueueProvider');
  return context;
};

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<QueueSystemState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [meshStatus, setMeshStatus] = useState<PeerStatus>('idle');
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  const peerRef = useRef<PeerManager | null>(null);
  const prevChatCountRef = useRef<number>(0);
  const currentSyncIdRef = useRef<string | undefined>(undefined);

  currentSyncIdRef.current = state?.syncId;

  const refreshNetworkInfo = useCallback(async () => {
    try {
      const info = await api.getNetworkInfo();
      if (info) setNetworkInfo(info);
    } catch (e) {
      console.warn("Could not fetch network info", e);
    }
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const serverState = await api.getState();
      setState(serverState);
    } catch (error) {
      console.error("Fetch State Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial state & network info
  useEffect(() => {
    fetchState();
    refreshNetworkInfo();
  }, [fetchState, refreshNetworkInfo]);

  // Real-time SSE Connection for LAN Instant Updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        const syncParam = state?.syncId ? `?syncId=${encodeURIComponent(state.syncId)}` : '';
        eventSource = new EventSource(`/api/queue/events${syncParam}`);

        eventSource.addEventListener('state', (event) => {
          try {
            const incoming = JSON.parse(event.data);
            if (incoming) {
              incoming.customers?.forEach((c: any) => {
                if (c.requestTime) c.requestTime = new Date(c.requestTime);
                if (c.callTime) c.callTime = new Date(c.callTime);
                if (c.finishTime) c.finishTime = new Date(c.finishTime);
              });
              setState(incoming);
            }
          } catch (e) {
            console.error("Error parsing SSE state", e);
          }
        });

        eventSource.onerror = () => {
          eventSource?.close();
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        console.warn("SSE connection error", err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [state?.syncId]);

  // Periodic polling fallback (every 2.5s) to guarantee multi-device LAN sync even without SSE
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchState();
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [fetchState]);

  // Peer-to-peer WebRTC mesh sync if active
  useEffect(() => {
    if (state && meshStatus === 'connected' && peerRef.current) {
      peerRef.current.send({ type: 'STATE_UPDATE', state });
    }
  }, [state, meshStatus]);

  // Track new chat messages and trigger notification chime
  useEffect(() => {
    if (state && Array.isArray(state.chatMessages)) {
      const currentCount = state.chatMessages.length;
      if (prevChatCountRef.current > 0 && currentCount > prevChatCountRef.current) {
        playMessageNotificationSound();
      }
      prevChatCountRef.current = currentCount;
    }
  }, [state?.chatMessages]);

  // BroadcastChannel for instant local multi-tab/screen sync on same device
  useEffect(() => {
    const channel = new BroadcastChannel('smart_queue_broadcast_v1');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'STATE_SYNC' && event.data.state) {
        const remoteState = event.data.state;
        remoteState.customers?.forEach((c: any) => {
          if (c.requestTime) c.requestTime = new Date(c.requestTime);
          if (c.callTime) c.callTime = new Date(c.callTime);
          if (c.finishTime) c.finishTime = new Date(c.finishTime);
        });
        setState(remoteState);
        localStorage.setItem('smart_queue_system_state_v1', JSON.stringify(remoteState));
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (state) {
      try {
        const channel = new BroadcastChannel('smart_queue_broadcast_v1');
        channel.postMessage({ type: 'STATE_SYNC', state });
        channel.close();
      } catch (e) {}
    }
  }, [state]);

  const handleMeshMessage = (msg: MeshMessage) => {
    if (msg.type === 'STATE_UPDATE') {
      setState(msg.state);
      localStorage.setItem('smart_queue_system_state_v1', JSON.stringify(msg.state));
    }
  };

  const enableCloudSync = async () => {
    const id = await api.createSyncSession();
    await fetchState();
    return id;
  };

  const joinCloudSync = async (syncId: string) => {
    const success = await api.joinSyncSession(syncId);
    if (success) await fetchState();
    return success;
  };

  const createCustomSyncSession = async (customId: string) => {
    const success = await api.createCustomSyncSession(customId);
    if (success) await fetchState();
    return success;
  };

  const startMeshHost = async () => {
    if (peerRef.current) peerRef.current.close();
    peerRef.current = new PeerManager(handleMeshMessage, setMeshStatus);
    return await peerRef.current.createOffer();
  };

  const completeMeshHost = async (answer: string) => {
    if (peerRef.current) await peerRef.current.handleAnswer(answer);
  };

  const joinMeshClient = async (offer: string) => {
    if (peerRef.current) peerRef.current.close();
    peerRef.current = new PeerManager(handleMeshMessage, setMeshStatus);
    return await peerRef.current.handleOffer(offer);
  };

  const performApiCall = async (apiFunc: () => Promise<any>) => {
    try {
      await apiFunc();
      await fetchState();
    } catch (e) {
      console.error("API Call Error:", e);
    }
  };

  const sendChatMessage = async (windowId: number, senderType: 'admin' | 'window', senderName: string, text: string) => {
    try {
      const msg = await api.sendChatMessage(windowId, senderType, senderName, text);
      await fetchState();
      return msg;
    } catch (e) {
      console.error("Send chat error", e);
    }
  };

  const broadcastChatMessage = async (senderName: string, text: string) => {
    try {
      await api.broadcastChatMessage(senderName, text);
      await fetchState();
    } catch (e) {
      console.error("Broadcast chat error", e);
    }
  };

  const markChatMessagesAsRead = async (windowId: number, readerType: 'admin' | 'window') => {
    try {
      await api.markChatMessagesAsRead(windowId, readerType);
      await fetchState();
    } catch (e) {
      console.error("Mark chat read error", e);
    }
  };

  const clearChatHistory = async (windowId?: number) => {
    try {
      await api.clearChatHistory(windowId);
      await fetchState();
    } catch (e) {
      console.error("Clear chat error", e);
    }
  };

  const value: QueueContextType = {
    state,
    isLoading,
    meshStatus,
    networkInfo,
    refreshNetworkInfo,
    fetchState,
    addCustomer: async (s?: string) => {
      const c = await api.addCustomer(s);
      await fetchState();
      return c;
    },
    callNextCustomer: (id: number) => performApiCall(() => api.callNextCustomer(id)),
    finishService: (id: number) => performApiCall(() => api.finishService(id)),
    assignEmployeeToWindow: (eid: number, wid: number) => performApiCall(() => api.assignEmployeeToWindow(eid, wid)),
    unassignEmployeeFromWindow: (id: number) => performApiCall(() => api.unassignEmployeeFromWindow(id)),
    addEmployee: (n: string, u: string, p: string) => performApiCall(() => api.addEmployee(n, u, p)),
    updateEmployee: (id: number, n: string, u: string, p?: string) => performApiCall(() => api.updateEmployee(id, n, u, p)),
    removeEmployee: (id: number) => performApiCall(() => api.removeEmployee(id)),
    addWindow: (n: string, task?: string) => performApiCall(() => api.addWindow(n, task)),
    updateWindowName: (id: number, n: string) => performApiCall(() => api.updateWindowName(id, n)),
    removeWindow: (id: number) => performApiCall(() => api.removeWindow(id)),
    updateWindowTask: (id: number, t: string) => performApiCall(() => api.updateWindowTask(id, t)),
    rateCustomer: (cid: number, r: number, f?: string) => performApiCall(() => api.rateCustomer(cid, r, f)),
    resetSystem: () => performApiCall(() => api.resetSystem()),
    authenticateEmployee: (u: string, p: string) => api.authenticateEmployee(u, p),
    authenticateAdmin: (p: string) => api.authenticateAdmin(p),
    updateAdminPassword: (p: string) => performApiCall(() => api.updateAdminPassword(p)),
    updatePrinterConfig: (c: PrinterConfig) => performApiCall(() => api.updatePrinterConfig(c)),
    sendChatMessage,
    broadcastChatMessage,
    markChatMessagesAsRead,
    clearChatHistory,
    enableCloudSync,
    joinCloudSync,
    createCustomSyncSession,
    startMeshHost,
    completeMeshHost,
    joinMeshClient,
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
};
