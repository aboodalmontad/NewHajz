import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import { Customer, Employee, Window, CustomerStatus, QueueSystemState } from '../types';
import api from '../server/api';

interface QueueContextType {
  state: QueueSystemState | null;
  loading: Record<string, boolean>;
  fetchState: () => Promise<void>;
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
  const [state, setState] = useState<QueueSystemState | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const withLoading = async (key: string, fn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      return await fn();
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };
  
  const fetchState = useCallback(async () => {
    const newState = await api.getState();
    setState(newState);
  }, []);

  const performActionAndRefresh = async (action: () => Promise<any>) => {
      await action();
      await fetchState();
  };

  const addCustomer = () => withLoading('addCustomer', api.addCustomer);
  
  const callNextCustomer = (employeeId: number) => 
      withLoading('callNext', () => performActionAndRefresh(() => api.callNextCustomer(employeeId)));

  const finishService = (employeeId: number) => 
      withLoading('finish', () => performActionAndRefresh(() => api.finishService(employeeId)));

  const assignEmployeeToWindow = (employeeId: number, windowId: number) => 
      performActionAndRefresh(() => api.assignEmployeeToWindow(employeeId, windowId));
      
  const unassignEmployeeFromWindow = (employeeId: number) => 
      performActionAndRefresh(() => api.unassignEmployeeFromWindow(employeeId));

  const addEmployee = (name: string, username: string, password: string) =>
    withLoading('addEmployee', () => performActionAndRefresh(() => api.addEmployee(name, username, password)));

  const removeEmployee = (id: number) => 
    withLoading(`removeEmployee_${id}`, () => performActionAndRefresh(() => api.removeEmployee(id)));

  const addWindow = (name: string, customTask?: string) =>
    withLoading('addWindow', () => performActionAndRefresh(() => api.addWindow(name, customTask)));

  const removeWindow = (id: number) => 
    withLoading(`removeWindow_${id}`, () => performActionAndRefresh(() => api.removeWindow(id)));

  const updateWindowTask = (id: number, task: string) =>
    withLoading(`updateWindow_${id}`, () => performActionAndRefresh(() => api.updateWindowTask(id, task)));
  
  const authenticateEmployee = (username: string, password: string) =>
    withLoading('auth', () => api.authenticateEmployee(username, password));


  const getAverageWaitTime = useCallback(() => {
    if (!state) return 0;
    const served = state.customers.filter(c => c.status === CustomerStatus.Served && c.callTime && c.requestTime);
    if (served.length === 0) return 0;
    const totalWait = served.reduce((acc, c) => acc + (new Date(c.callTime!).getTime() - new Date(c.requestTime).getTime()), 0);
    return totalWait / served.length / 1000 / 60; // in minutes
  }, [state]);

  const getAverageServiceTime = useCallback(() => {
    if (!state) return 0;
    const served = state.customers.filter(c => c.status === CustomerStatus.Served && c.finishTime && c.callTime);
    if (served.length === 0) return 0;
    const totalService = served.reduce((acc, c) => acc + (new Date(c.finishTime!).getTime() - new Date(c.callTime!).getTime()), 0);
    return totalService / served.length / 1000 / 60; // in minutes
  }, [state]);


  const value = {
    state,
    loading,
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
    getAverageWaitTime,
    getAverageServiceTime,
    authenticateEmployee,
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};
