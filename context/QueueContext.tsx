import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import api from '../server/api';
import { Customer, Employee, QueueSystemState, PrinterConfig, ConnectedDevice, ConnectionTestLog, DeviceRole } from '../types';
import { lanClient, LanConnectionStatus, ConfirmationAlert } from '../utils/lanClient';
import { sounds } from '../utils/audio';

interface QueueContextType {
  state: QueueSystemState | null;
  isLoading: boolean;
  lanStatus: LanConnectionStatus;
  currentDevice: ConnectedDevice;
  connectedDevices: ConnectedDevice[];
  testLogs: ConnectionTestLog[];
  confirmAlert: ConfirmationAlert | null;
  dismissConfirmAlert: () => void;
  updateDeviceIdentity: (name: string, role: DeviceRole, employeeName?: string, windowId?: number) => void;
  confirmConnectionWithDevice: (targetDevice?: ConnectedDevice) => Promise<ConnectionTestLog>;
  pingAllDevices: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  
  // State methods
  fetchState: () => Promise<void>;
  addCustomer: (serviceName?: string) => Promise<Customer | undefined>;
  callNextCustomer: (employeeId: number) => Promise<boolean>;
  finishService: (employeeId: number) => Promise<boolean>;
  assignEmployeeToWindow: (employeeId: number, windowId: number) => Promise<void>;
  unassignEmployeeFromWindow: (employeeId: number) => Promise<void>;
  addEmployee: (name: string, username: string, password: string) => Promise<Employee>;
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
  setRoomPin: (pin: string) => Promise<void>;
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
  const [lanStatus, setLanStatus] = useState<LanConnectionStatus>(lanClient.getStatus());
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [testLogs, setTestLogs] = useState<ConnectionTestLog[]>([]);
  const [confirmAlert, setConfirmAlert] = useState<ConfirmationAlert | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);

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

  // Initialize LAN client and listeners
  useEffect(() => {
    lanClient.connect();

    const unsubStatus = lanClient.onStatus((status) => {
      setLanStatus(status);
    });

    const unsubDevices = lanClient.onDeviceList((devices) => {
      setConnectedDevices([...devices]);
    });

    const unsubConfirm = lanClient.onConfirmAlert((alert) => {
      setConfirmAlert(alert);
      // Auto-dismiss alert after 6 seconds
      setTimeout(() => {
        setConfirmAlert(curr => curr?.id === alert.id ? null : curr);
      }, 6000);
    });

    const unsubMsg = lanClient.onMessage((msg) => {
      if (msg.type === 'STATE_UPDATE') {
        setState(msg.state);
        try {
          localStorage.setItem('smart_queue_system_state_v1', JSON.stringify(msg.state));
        } catch {}
      }
    });

    fetchState();

    return () => {
      unsubStatus();
      unsubDevices();
      unsubConfirm();
      unsubMsg();
    };
  }, [fetchState]);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    sounds.setSoundEnabled(enabled);
  };

  const updateDeviceIdentity = (name: string, role: DeviceRole, employeeName?: string, windowId?: number) => {
    lanClient.updateDeviceInfo(name, role, employeeName, windowId);
  };

  const confirmConnectionWithDevice = async (targetDevice?: ConnectedDevice): Promise<ConnectionTestLog> => {
    const log = await lanClient.confirmConnectionWithDevice(targetDevice);
    setTestLogs([...lanClient.getTestLogs()]);
    return log;
  };

  const pingAllDevices = () => {
    lanClient.sendPing();
  };

  const dismissConfirmAlert = () => {
    setConfirmAlert(null);
  };

  const syncStateMutation = async (mutation: () => Promise<any>) => {
    const result = await mutation();
    const updatedState = await api.getState();
    setState(updatedState);
    lanClient.broadcastState(updatedState);
    return result;
  };

  const addCustomer = async (serviceName?: string): Promise<Customer | undefined> => {
    const customer = await api.addCustomer(serviceName);
    const updatedState = await api.getState();
    setState(updatedState);
    lanClient.broadcastState(updatedState);
    return customer;
  };

  const callNextCustomer = async (employeeId: number): Promise<boolean> => {
    const success = await api.callNextCustomer(employeeId);
    if (success) {
      const updatedState = await api.getState();
      setState(updatedState);
      lanClient.broadcastState(updatedState);

      // Find the window and customer to announce call
      const emp = updatedState.employees.find(e => e.id === employeeId);
      const win = updatedState.windows.find(w => w.id === emp?.windowId);
      const customer = updatedState.customers.find(c => c.id === win?.currentCustomerId);
      if (customer && win) {
        lanClient.notifyCustomerCalled(customer.ticketNumber, win.name, win.id);
      }
    }
    return success;
  };

  const finishService = async (employeeId: number): Promise<boolean> => {
    const success = await api.finishService(employeeId);
    if (success) {
      const updatedState = await api.getState();
      setState(updatedState);
      lanClient.broadcastState(updatedState);
    }
    return success;
  };

  const setRoomPin = async (pin: string) => {
    if (!state) return;
    const newState = { ...state, roomPin: pin };
    setState(newState);
    await api.getState();
    lanClient.broadcastState(newState);
  };

  const value: QueueContextType = {
    state,
    isLoading,
    lanStatus,
    currentDevice: lanClient.getDevice(),
    connectedDevices,
    testLogs,
    confirmAlert,
    dismissConfirmAlert,
    updateDeviceIdentity,
    confirmConnectionWithDevice,
    pingAllDevices,
    soundEnabled,
    setSoundEnabled,
    fetchState,
    addCustomer,
    callNextCustomer,
    finishService,
    assignEmployeeToWindow: (eid, wid) => syncStateMutation(() => api.assignEmployeeToWindow(eid, wid)),
    unassignEmployeeFromWindow: (eid) => syncStateMutation(() => api.unassignEmployeeFromWindow(eid)),
    addEmployee: (name, user, pass) => syncStateMutation(() => api.addEmployee(name, user, pass)),
    updateEmployee: (id, name, user, pass) => syncStateMutation(() => api.updateEmployee(id, name, user, pass)),
    removeEmployee: (id) => syncStateMutation(() => api.removeEmployee(id)),
    addWindow: (name, task) => syncStateMutation(() => api.addWindow(name, task)),
    updateWindowName: (id, name) => syncStateMutation(() => api.updateWindowName(id, name)),
    removeWindow: (id) => syncStateMutation(() => api.removeWindow(id)),
    updateWindowTask: (id, task) => syncStateMutation(() => api.updateWindowTask(id, task)),
    rateCustomer: (cid, rating, fb) => syncStateMutation(() => api.rateCustomer(cid, rating, fb)),
    resetSystem: () => syncStateMutation(() => api.resetSystem()),
    authenticateEmployee: api.authenticateEmployee,
    authenticateAdmin: api.authenticateAdmin,
    updateAdminPassword: api.updateAdminPassword,
    updatePrinterConfig: (c) => syncStateMutation(() => api.updatePrinterConfig(c)),
    setRoomPin
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};
