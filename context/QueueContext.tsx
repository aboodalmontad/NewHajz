
import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import { Customer, Employee, Window, EmployeeStatus, CustomerStatus } from '../types';

interface QueueContextType {
  customers: Customer[];
  queue: number[];
  employees: Employee[];
  windows: Window[];
  addCustomer: () => Customer;
  callNextCustomer: (employeeId: number) => void;
  finishService: (employeeId: number) => void;
  assignEmployeeToWindow: (employeeId: number, windowId: number) => void;
  unassignEmployeeFromWindow: (employeeId: number) => void;
  addEmployee: (name: string) => void;
  removeEmployee: (id: number) => void;
  addWindow: (name: string, customTask?: string) => void;
  removeWindow: (id: number) => void;
  updateWindowTask: (id: number, task: string) => void;
  getAverageWaitTime: () => number;
  getAverageServiceTime: () => number;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueueSystem = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueSystem must be used within a QueueProvider');
  }
  return context;
};

// Initial mock data
const initialWindows: Window[] = [
  { id: 1, name: 'شباك 1', customTask: 'استعلامات عامة' },
  { id: 2, name: 'شباك 2', customTask: 'فتح حسابات جديدة' },
  { id: 3, name: 'شباك 3' },
  { id: 4, name: 'شباك 4' },
];

const initialEmployees: Employee[] = [
  { id: 1, name: 'أحمد', status: EmployeeStatus.Available, customersServed: 0 },
  { id: 2, name: 'فاطمة', status: EmployeeStatus.Available, customersServed: 0 },
  { id: 3, name: 'يوسف', status: EmployeeStatus.Available, customersServed: 0 },
  { id: 4, name: 'ليلى', status: EmployeeStatus.Available, customersServed: 0 },
];

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [windows, setWindows] = useState<Window[]>(initialWindows);
  const [ticketCounter, setTicketCounter] = useState(100);

  const addCustomer = useCallback(() => {
    const newCustomer: Customer = {
      id: Date.now(),
      ticketNumber: `ر-${ticketCounter}`,
      requestTime: new Date(),
      status: CustomerStatus.Waiting,
    };
    setCustomers(prev => [...prev, newCustomer]);
    setQueue(prev => [...prev, newCustomer.id]);
    setTicketCounter(prev => prev + 1);
    return newCustomer;
  }, [ticketCounter]);

  const callNextCustomer = useCallback((employeeId: number) => {
      if (queue.length === 0) return;

      const employee = employees.find(e => e.id === employeeId);
      if (!employee || employee.status === EmployeeStatus.Busy || !employee.windowId) return;

      const nextCustomerId = queue[0];
      
      setQueue(prev => prev.slice(1));

      setCustomers(prev => prev.map(c => 
          c.id === nextCustomerId ? { ...c, status: CustomerStatus.Serving, callTime: new Date(), servedBy: employeeId, windowId: employee.windowId } : c
      ));

      setEmployees(prev => prev.map(e => 
          e.id === employeeId ? { ...e, status: EmployeeStatus.Busy } : e
      ));

      setWindows(prev => prev.map(w =>
          w.id === employee.windowId ? { ...w, currentCustomerId: nextCustomerId } : w
      ));
  }, [queue, employees]);

  const finishService = useCallback((employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee || !employee.windowId) return;

    const window = windows.find(w => w.id === employee.windowId);
    if (!window || !window.currentCustomerId) return;

    const customerId = window.currentCustomerId;

    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, status: CustomerStatus.Served, finishTime: new Date() } : c
    ));
    
    setEmployees(prev => prev.map(e => 
        e.id === employeeId ? { ...e, status: EmployeeStatus.Available, customersServed: e.customersServed + 1 } : e
    ));

    setWindows(prev => prev.map(w => 
        w.id === employee.windowId ? { ...w, currentCustomerId: undefined } : w
    ));

  }, [employees, windows]);

  const assignEmployeeToWindow = useCallback((employeeId: number, windowId: number) => {
      // Unassign from any previous window
      setEmployees(prev => prev.map(e => e.windowId === windowId ? {...e, windowId: undefined} : e));
      setWindows(prev => prev.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w));
      
      // Assign to new window
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, windowId: windowId } : e));
      setWindows(prev => prev.map(w => w.id === windowId ? { ...w, employeeId: employeeId } : w));
  }, []);

  const unassignEmployeeFromWindow = useCallback((employeeId: number) => {
      setWindows(prev => prev.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w));
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e));
  }, []);

  const addEmployee = useCallback((name: string) => {
    const newEmployee: Employee = {
      id: Date.now(),
      name,
      status: EmployeeStatus.Available,
      customersServed: 0,
    };
    setEmployees(prev => [...prev, newEmployee]);
  }, []);

  const removeEmployee = useCallback((id: number) => {
    unassignEmployeeFromWindow(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
  }, [unassignEmployeeFromWindow]);

  const addWindow = useCallback((name: string, customTask?: string) => {
    const newWindow: Window = {
      id: Date.now(),
      name,
      customTask: customTask || undefined,
    };
    setWindows(prev => [...prev, newWindow]);
  }, []);

  const removeWindow = useCallback((id: number) => {
    const window = windows.find(w => w.id === id);
    if (window && window.employeeId) {
      unassignEmployeeFromWindow(window.employeeId);
    }
    setWindows(prev => prev.filter(w => w.id !== id));
  }, [windows, unassignEmployeeFromWindow]);

  const updateWindowTask = useCallback((id: number, task: string) => {
      setWindows(prev => prev.map(w => w.id === id ? {...w, customTask: task} : w));
  }, []);

  const getAverageWaitTime = useCallback(() => {
    const served = customers.filter(c => c.status === CustomerStatus.Served && c.callTime && c.requestTime);
    if (served.length === 0) return 0;
    const totalWait = served.reduce((acc, c) => acc + (c.callTime!.getTime() - c.requestTime.getTime()), 0);
    return totalWait / served.length / 1000 / 60; // in minutes
  }, [customers]);

  const getAverageServiceTime = useCallback(() => {
    const served = customers.filter(c => c.status === CustomerStatus.Served && c.finishTime && c.callTime);
    if (served.length === 0) return 0;
    const totalService = served.reduce((acc, c) => acc + (c.finishTime!.getTime() - c.callTime!.getTime()), 0);
    return totalService / served.length / 1000 / 60; // in minutes
  }, [customers]);

  const value = {
    customers,
    queue,
    employees,
    windows,
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
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};