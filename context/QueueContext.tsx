
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import api from '../server/api';
import { Customer, Employee, Window, QueueSystemState } from '../types';

interface QueueContextType {
  state: QueueSystemState | null;
  isLoading: boolean;
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
  const [state, setState] = useState<QueueSystemState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchState = React.useCallback(async () => {
    try {
      const serverState = await api.getState();
      if (serverState && serverState.customers) {
          serverState.customers.forEach((c: any) => {
              if (c.requestTime) c.requestTime = new Date(c.requestTime);
              if (c.callTime) c.callTime = new Date(c.callTime);
              if (c.finishTime) c.finishTime = new Date(c.finishTime);
          });
          setState(serverState);
      }
    } catch (error) {
      console.error("Failed to fetch state from server:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const performApiCall = async (apiFunc: () => Promise<any>) => {
    try {
        await apiFunc();
        await fetchState();
    } catch (e) {
        console.error("API Call failed", e);
    }
  };

  const addCustomer = async (serviceName?: string) => {
    try {
        const newCustomer = await api.addCustomer(serviceName);
        await fetchState();
        return newCustomer;
    } catch (e) {
        console.error("Add customer failed", e);
        return undefined;
    }
  };

  const callNextCustomer = (employeeId: number) => performApiCall(() => api.callNextCustomer(employeeId));
  const finishService = (employeeId: number) => performApiCall(() => api.finishService(employeeId));
  const assignEmployeeToWindow = (employeeId: number, windowId: number) => performApiCall(() => api.assignEmployeeToWindow(employeeId, windowId));
  const unassignEmployeeFromWindow = (employeeId: number) => performApiCall(() => api.unassignEmployeeFromWindow(employeeId));
  const addEmployee = (name: string, username: string, password: string) => performApiCall(() => api.addEmployee(name, username, password));
  const removeEmployee = (id: number) => performApiCall(() => api.removeEmployee(id));
  const addWindow = (name: string, customTask?: string) => performApiCall(() => api.addWindow(name, customTask));
  const removeWindow = (id: number) => performApiCall(() => api.removeWindow(id));
  const updateWindowTask = (id: number, task: string) => performApiCall(() => api.updateWindowTask(id, task));
  
  const authenticateEmployee = async (username: string, password: string) => {
    try {
        return await api.authenticateEmployee(username, password);
    } catch (e) {
        console.error("Authentication failed", e);
        return undefined;
    }
  };

  const authenticateAdmin = async (password: string) => {
    try {
        return await api.authenticateAdmin(password);
    } catch (e) {
        console.error("Admin authentication failed", e);
        return false;
    }
  };

  const value = {
    state,
    isLoading,
    fetchState,
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
    authenticateEmployee,
    authenticateAdmin,
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};
