
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import api from '../server/api';
import { Customer, Employee, Window, QueueSystemState, MeshMessage, PrinterConfig } from '../types';
import { PeerManager, PeerStatus } from '../server/peerManager';

interface QueueContextType {
  state: QueueSystemState | null;
  isLoading: boolean;
  meshStatus: PeerStatus;
  fetchState: (showLoader?: boolean) => Promise<void>;
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
  disconnectSync: () => Promise<void>;
  
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

  const fetchState = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const serverState = await api.getState();
      setState(serverState);
    } catch (error) {
      console.error("Fetch State Error:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState(true);
  }, [fetchState]);

  useEffect(() => {
    if (state && meshStatus === 'connected' && peerRef.current) {
      peerRef.current.send({ type: 'STATE_UPDATE', state });
    }
  }, [state, meshStatus]);

  const handleMeshMessage = (msg: MeshMessage) => {
    if (msg.type === 'STATE_UPDATE') {
      setState(msg.state);
      localStorage.setItem('smart_queue_system_state_v1', JSON.stringify(msg.state));
    }
  };

  const performAction = async (action: () => Promise<QueueSystemState | null>) => {
    try {
        const updatedState = await action();
        if (updatedState) {
            setState({ ...updatedState }); // تحديث فوري بدون فليكر
        }
    } catch (e) {
      console.error("Action Call Error:", e);
      await fetchState(); // استعادة في حال الخطأ
    }
  };

  const value = {
    state, isLoading, meshStatus, fetchState,
    addCustomer: async (s?: string) => {
        const c = await api.addCustomer(s);
        await fetchState();
        return c;
    },
    callNextCustomer: (id: number) => performAction(() => api.callNextCustomer(id)),
    finishService: (id: number) => performAction(() => api.finishService(id)),
    assignEmployeeToWindow: (eid: number, wid: number) => performAction(() => api.assignEmployeeToWindow(eid, wid)),
    unassignEmployeeFromWindow: (id: number) => performAction(() => api.unassignEmployeeFromWindow(id)),
    addEmployee: async (n: string, u: string, p: string) => { await api.addEmployee(n, u, p); await fetchState(); },
    removeEmployee: async (id: number) => { await api.removeEmployee(id); await fetchState(); },
    addWindow: async (n: string, t?: string) => { await api.addWindow(n, t); await fetchState(); },
    removeWindow: async (id: number) => { await api.removeWindow(id); await fetchState(); },
    updateWindowTask: async (id: number, t: string) => { await api.updateWindowTask(id, t); await fetchState(); },
    authenticateEmployee: api.authenticateEmployee,
    authenticateAdmin: api.authenticateAdmin,
    updateAdminPassword: api.updateAdminPassword,
    updatePrinterConfig: async (c: PrinterConfig) => { await api.updatePrinterConfig(c); await fetchState(); },
    
    enableCloudSync: async () => {
        const id = await api.createSyncSession();
        await fetchState();
        return id;
    },
    joinCloudSync: async (id: string) => {
        const ok = await api.joinSyncSession(id);
        if (ok) await fetchState();
        return ok;
    },
    disconnectSync: async () => {
        await api.disconnectSync();
        await fetchState();
    },
    
    startMeshHost: async () => {
        if (peerRef.current) peerRef.current.close();
        peerRef.current = new PeerManager(handleMeshMessage, setMeshStatus);
        return await peerRef.current.createOffer();
    },
    completeMeshHost: async (ans: string) => {
        if (peerRef.current) await peerRef.current.handleAnswer(ans);
    },
    joinMeshClient: async (off: string) => {
        if (peerRef.current) peerRef.current.close();
        peerRef.current = new PeerManager(handleMeshMessage, setMeshStatus);
        return await peerRef.current.handleOffer(off);
    }
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};
