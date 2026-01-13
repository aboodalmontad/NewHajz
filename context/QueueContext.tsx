import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import api from '../server/api';
import { Customer, Employee, Window, QueueSystemState } from '../types';

interface QueueContextType {
  state: QueueSystemState | null; // State can be null initially
  isLoading: boolean;
  fetchState: () => Promise<void>;
  addCustomer: () => Promise<Customer | undefined>;
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
      // Dates from server will be strings, so we need to parse them
       serverState.customers.forEach((c: any) => {
          if (c.requestTime) c.requestTime = new Date(c.requestTime);
          if (c.callTime) c.callTime = new Date(c.callTime);
          if (c.finishTime) c.finishTime = new Date(c.finishTime);
      });
      setState(serverState);
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
    await apiFunc();
    await fetchState();
  };

  const addCustomer = async () => {
    // This one returns the new customer, so it's a bit different
    const newCustomer = await api.addCustomer();
    await fetchState();
    return newCustomer;
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
    return api.authenticateEmployee(username, password);
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
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};
