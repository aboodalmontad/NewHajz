
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import api from '../server/api';
import { Customer, Employee, Window, QueueSystemState, MeshMessage, PrinterConfig } from '../types';
import { PeerManager, PeerStatus } from '../server/peerManager';

interface QueueContextType {
  state: QueueSystemState | null;
  isLoading: boolean;
  meshStatus: PeerStatus;
  fetchState: () => Promise<void>;
  addCustomer: (serviceName?: string) => Promise<Customer | undefined>;
  callNextCustomer: (employeeId: number) => Promise<void>;
  finishService: (employeeId: number) => Promise<void>;
  assignEmployeeToWindow: (employeeId: number, windowId: number) => Promise<void>;
  unassignEmployeeFromWindow: (employeeId: number) => Promise<void>;
  addEmployee: (name: string, username: string, password: string) => Promise<void>;
  removeEmployee: (id: number) => Promise<void>;
  addWindow: (name: string, customTask?: string) => Promise<void>;
  removeWindow: (id: number) => Promise<void>;
  updateWindowTask: (id: number, task: string) => Promise<void>;
  authenticateEmployee: (username: string, password: string) => Promise<Employee | undefined>;
  authenticateAdmin: (password: string) => Promise<boolean>;
  updateAdminPassword: (newPassword: string) => Promise<void>;
  updatePrinterConfig: (config: PrinterConfig) => Promise<void>;
  
  // Cloud Sync Methods
  enableCloudSync: () => Promise<string>;
  joinCloudSync: (syncId: string) => Promise<boolean>;
  
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
  const peerRef = useRef<PeerManager | null>(null);

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

  useEffect(() => {
    if (state && meshStatus === 'connected' && peerRef.current) {
      peerRef.current.send({ type: 'STATE_UPDATE', state });
    }
  }, [state, meshStatus]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

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

  const value = {
    state, isLoading, meshStatus, fetchState,
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
    removeEmployee: (id: number) => performApiCall(() => api.removeEmployee(id)),
    addWindow: (n: string, t?: string) => performApiCall(() => api.addWindow(n, t)),
    removeWindow: (id: number) => performApiCall(() => api.removeWindow(id)),
    updateWindowTask: (id: number, t: string) => performApiCall(() => api.updateWindowTask(id, t)),
    authenticateEmployee: api.authenticateEmployee,
    authenticateAdmin: api.authenticateAdmin,
    updateAdminPassword: api.updateAdminPassword,
    updatePrinterConfig: (c: PrinterConfig) => performApiCall(() => api.updatePrinterConfig(c)),
    enableCloudSync, joinCloudSync,
    startMeshHost, completeMeshHost, joinMeshClient
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};
