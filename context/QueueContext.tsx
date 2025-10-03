
import React, { createContext, useState, useCallback, useContext, ReactNode, useEffect, useRef } from 'react';
import { Customer, Employee, CustomerStatus, QueueSystemState } from '../types';
import api from '../server/api';

const getInitialState = (): QueueSystemState => ({
    windows: [],
    employees: [],
    customers: [],
    queue: [],
});

interface QueueContextType {
  state: QueueSystemState;
  addCustomer: () => Promise<Customer>;
  callNextCustomer: (employeeId: number) => Promise<void>;
  finishService: (employeeId: number) => Promise<void>;
  assignEmployeeToWindow: (employeeId: number, windowId: number) => Promise<void>;
  unassignEmployeeFromWindow: (employeeId: number) => Promise<void>;
  addEmployee: (name: string, username: string, password: string) => Promise<void>;
  removeEmployee: (id: number) => Promise<void>;
  addWindow: (name: string, customTask?: string) => Promise<void>;
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
  const [state, setState] = useState<QueueSystemState>(getInitialState());
  const isPolling = useRef(false);

  const refreshState = useCallback(async () => {
    try {
      const freshState = await api.getState();
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
  }, []);

  // Initial fetch and polling for real-time updates
  useEffect(() => {
    refreshState(); // Initial fetch
    const intervalId = setInterval(() => {
        if (!isPolling.current) {
            isPolling.current = true;
            refreshState().finally(() => {
                isPolling.current = false;
            });
        }
    }, 2000); // Poll every 2 seconds
    return () => clearInterval(intervalId);
  }, [refreshState]);

  // Wrapper for API calls to refresh state after mutation
  const mutateAndRefresh = async <T,>(mutation: () => Promise<T>): Promise<T> => {
    const result = await mutation();
    await refreshState();
    return result;
  }
  
  const addCustomer = () => mutateAndRefresh(api.addCustomer);
  const callNextCustomer = (employeeId: number) => mutateAndRefresh(() => api.callNextCustomer(employeeId));
  const finishService = (employeeId: number) => mutateAndRefresh(() => api.finishService(employeeId));
  const assignEmployeeToWindow = (employeeId: number, windowId: number) => mutateAndRefresh(() => api.assignEmployeeToWindow(employeeId, windowId));
  const unassignEmployeeFromWindow = (employeeId: number) => mutateAndRefresh(() => api.unassignEmployeeFromWindow(employeeId));
  const addEmployee = (name: string, username: string, password: string) => mutateAndRefresh(() => api.addEmployee(name, username, password));
  const removeEmployee = (id: number) => mutateAndRefresh(() => api.removeEmployee(id));
  const addWindow = (name: string, customTask?: string) => mutateAndRefresh(() => api.addWindow(name, customTask));
  const removeWindow = (id: number) => mutateAndRefresh(() => api.removeWindow(id));
  const updateWindowTask = (id: number, task: string) => mutateAndRefresh(() => api.updateWindowTask(id, task));
  
  // No refresh needed for authentication, it's a read-only operation
  const authenticateEmployee = (username: string, password: string) => {
    return api.authenticateEmployee(username, password);
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

  const value = {
    state,
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
