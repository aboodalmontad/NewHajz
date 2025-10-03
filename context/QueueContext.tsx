
import React, { createContext, useState, useCallback, useContext, ReactNode, useEffect, useRef } from 'react';
// FIX: Import Window type to be used in the context.
import { Customer, Employee, CustomerStatus, QueueSystemState, Window } from '../types';
import api from '../server/api';

const initialSystemState: QueueSystemState = {
    windows: [],
    employees: [],
    customers: [],
    queue: [],
};

interface QueueContextType {
  state: QueueSystemState;
  dbKey: string | null;
  setDbKey: ((key: string | null) => void) | null;
  addCustomer: () => Promise<Customer>;
  // FIX: Updated return type to match API response. The API returns a boolean.
  callNextCustomer: (employeeId: number) => Promise<boolean>;
  // FIX: Updated return type to match API response. The API returns a boolean.
  finishService: (employeeId: number) => Promise<boolean>;
  assignEmployeeToWindow: (employeeId: number, windowId: number) => Promise<void>;
  unassignEmployeeFromWindow: (employeeId: number) => Promise<void>;
  // FIX: Updated return type to match API response. The API returns the created Employee.
  addEmployee: (name: string, username: string, password: string) => Promise<Employee>;
  removeEmployee: (id: number) => Promise<void>;
  // FIX: Updated return type to match API response. The API returns the created Window.
  addWindow: (name: string, customTask?: string) => Promise<Window>;
  removeWindow: (id: number) => Promise<void>;
  updateWindowTask: (id: number, task: string) => Promise<void>;
  getAverageWaitTime: () => number;
  getAverageServiceTime: () => number;
  authenticateEmployee: (username: string, password: string) => Promise<Employee | undefined>;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueueSystem = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueSystem must be used within a QueueProvider');
  }
  return context;
};

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dbKey, setDbKey] = useState<string | null>(null);
  const [state, setState] = useState<QueueSystemState>(initialSystemState);
  const isPolling = useRef(false);

  const refreshState = useCallback(async () => {
    if (!dbKey) return;
    try {
      const freshState = await api.getState(dbKey);
      // Re-hydrate Date objects from strings
      freshState.customers.forEach((c: Customer) => {
          if (c.requestTime) c.requestTime = new Date(c.requestTime);
          if (c.callTime) c.callTime = new Date(c.callTime);
          if (c.finishTime) c.finishTime = new Date(c.finishTime);
      });
      setState(freshState);
    } catch (e) {
      console.error("Failed to refresh state from API", e);
    }
  }, [dbKey]);

  useEffect(() => {
    if (!dbKey) {
        setState(initialSystemState); // Reset state on disconnect
        return;
    }
    refreshState();
    const intervalId = setInterval(() => {
        if (!isPolling.current) {
            isPolling.current = true;
            refreshState().finally(() => {
                isPolling.current = false;
            });
        }
    }, 2000);
    return () => clearInterval(intervalId);
  }, [dbKey, refreshState]);

  const mutateAndRefresh = async <T,>(mutation: () => Promise<T>): Promise<T> => {
    const result = await mutation();
    await refreshState();
    return result;
  }
  
  const ensureDbKey = (): string => {
      if (!dbKey) throw new Error("No database connected");
      return dbKey;
  }
  
  const addCustomer = () => mutateAndRefresh(() => api.addCustomer(ensureDbKey()));
  const callNextCustomer = (employeeId: number) => mutateAndRefresh(() => api.callNextCustomer(ensureDbKey(), employeeId));
  const finishService = (employeeId: number) => mutateAndRefresh(() => api.finishService(ensureDbKey(), employeeId));
  const assignEmployeeToWindow = (employeeId: number, windowId: number) => mutateAndRefresh(() => api.assignEmployeeToWindow(ensureDbKey(), employeeId, windowId));
  const unassignEmployeeFromWindow = (employeeId: number) => mutateAndRefresh(() => api.unassignEmployeeFromWindow(ensureDbKey(), employeeId));
  const addEmployee = (name: string, username: string, password: string) => mutateAndRefresh(() => api.addEmployee(ensureDbKey(), name, username, password));
  const removeEmployee = (id: number) => mutateAndRefresh(() => api.removeEmployee(ensureDbKey(), id));
  const addWindow = (name: string, customTask?: string) => mutateAndRefresh(() => api.addWindow(ensureDbKey(), name, customTask));
  const removeWindow = (id: number) => mutateAndRefresh(() => api.removeWindow(ensureDbKey(), id));
  const updateWindowTask = (id: number, task: string) => mutateAndRefresh(() => api.updateWindowTask(ensureDbKey(), id, task));
  
  const authenticateEmployee = (username: string, password: string) => {
    return api.authenticateEmployee(ensureDbKey(), username, password);
  };
  
  const getAverageWaitTime = useCallback(() => {
    const served = state.customers.filter(c => c.status === CustomerStatus.Served && c.callTime && c.requestTime);
    if (served.length === 0) return 0;
    const totalWait = served.reduce((acc, c) => acc + (new Date(c.callTime!).getTime() - new Date(c.requestTime).getTime()), 0);
    return totalWait / served.length / 1000 / 60; // in minutes
  }, [state.customers]);

  const getAverageServiceTime = useCallback(() => {
    const served = state.customers.filter(c => c.status === CustomerStatus.Served && c.finishTime && c.callTime);
    if (served.length === 0) return 0;
    const totalService = served.reduce((acc, c) => acc + (new Date(c.finishTime!).getTime() - new Date(c.callTime!).getTime()), 0);
    return totalService / served.length / 1000 / 60; // in minutes
  }, [state.customers]);

  const value: QueueContextType = {
    state,
    dbKey,
    setDbKey,
    addCustomer,
    callNextCustomer,
    finishService,
    assignEmployeeToWindow,
    unassignEmployeeFromWindow,
    addEmployee,
    removeEmployee,
    addWindow,
    removeWindow,
    updateWindowTask,
    getAverageWaitTime,
    getAverageServiceTime,
    authenticateEmployee,
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};
