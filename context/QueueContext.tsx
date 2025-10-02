import React, { createContext, useState, useCallback, useContext, ReactNode, useEffect } from 'react';
import { Customer, Employee, Window, CustomerStatus, QueueSystemState, EmployeeStatus } from '../types';

const STORAGE_KEY = 'queueSystemState';

const getInitialState = (): QueueSystemState => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            // Re-hydrate Date objects from strings
            parsed.customers.forEach((c: Customer) => {
                if (c.requestTime) c.requestTime = new Date(c.requestTime);
                if (c.callTime) c.callTime = new Date(c.callTime);
                if (c.finishTime) c.finishTime = new Date(c.finishTime);
            });
            return parsed;
        } catch (e) {
            console.error("Failed to parse state from localStorage", e);
        }
    }
    // Default initial state if localStorage is empty or corrupt
    return {
        windows: [
            { id: 1, name: 'شباك 1', customTask: 'استعلامات عامة' },
            { id: 2, name: 'شباك 2', customTask: 'فتح حسابات جديدة' },
            { id: 3, name: 'شباك 3' },
            { id: 4, name: 'شباك 4' },
        ],
        employees: [
            { id: 1, name: 'أحمد', username: 'ahmad', password: '123', status: EmployeeStatus.Available, customersServed: 0 },
            { id: 2, name: 'فاطمة', username: 'fatima', password: '123', status: EmployeeStatus.Available, customersServed: 0 },
            { id: 3, name: 'يوسف', username: 'yousef', password: '123', status: EmployeeStatus.Available, customersServed: 0 },
            { id: 4, name: 'ليلى', username: 'layla', password: '123', status: EmployeeStatus.Available, customersServed: 0 },
        ],
        customers: [],
        queue: [],
    };
};

interface QueueContextType {
  state: QueueSystemState;
  addCustomer: () => Customer;
  callNextCustomer: (employeeId: number) => void;
  finishService: (employeeId: number) => void;
  assignEmployeeToWindow: (employeeId: number, windowId: number) => void;
  unassignEmployeeFromWindow: (employeeId: number) => void;
  addEmployee: (name: string, username: string, password: string) => void;
  removeEmployee: (id: number) => void;
  addWindow: (name: string, customTask?: string) => void;
  removeWindow: (id: number) => void;
  updateWindowTask: (id: number, task: string) => void;
  getAverageWaitTime: () => number;
  getAverageServiceTime: () => number;
  authenticateEmployee: (username: string, password: string) => Employee | undefined;
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
  const [state, setState] = useState<QueueSystemState>(getInitialState);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Listen for changes from other tabs to sync state
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY && e.newValue) {
            try {
                const newState = JSON.parse(e.newValue);
                 // Re-hydrate Date objects
                newState.customers.forEach((c: Customer) => {
                    if (c.requestTime) c.requestTime = new Date(c.requestTime);
                    if (c.callTime) c.callTime = new Date(c.callTime);
                    if (c.finishTime) c.finishTime = new Date(c.finishTime);
                });
                setState(newState);
            } catch (error) {
                console.error("Error syncing state from storage:", error);
            }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addCustomer = () => {
    let newTicketCounter = 100;
    if (state.customers.length > 0) {
        const lastTicketNum = Math.max(0, ...state.customers.map(c => parseInt(c.ticketNumber.split('-')[1], 10) || 0));
        newTicketCounter = lastTicketNum + 1;
    }
    if (newTicketCounter < 100) newTicketCounter = 100;

    const newCustomer: Customer = {
      id: Date.now(),
      ticketNumber: `ر-${newTicketCounter}`,
      requestTime: new Date(),
      status: CustomerStatus.Waiting,
    };
    setState(prevState => ({
        ...prevState,
        customers: [...prevState.customers, newCustomer],
        queue: [...prevState.queue, newCustomer.id],
    }));
    return newCustomer;
  };
  
  const callNextCustomer = (employeeId: number) => {
    setState(prevState => {
        if (prevState.queue.length === 0) return prevState;

        const employee = prevState.employees.find(e => e.id === employeeId);
        if (!employee || employee.status === EmployeeStatus.Busy || !employee.windowId) return prevState;
        
        const queue = [...prevState.queue];
        const nextCustomerId = queue.shift()!;
        
        const newCustomers = prevState.customers.map(c => 
            c.id === nextCustomerId ? { ...c, status: CustomerStatus.Serving, callTime: new Date(), servedBy: employeeId, windowId: employee.windowId } : c
        );
        const newEmployees = prevState.employees.map(e => 
            e.id === employeeId ? { ...e, status: EmployeeStatus.Busy } : e
        );
        const newWindows = prevState.windows.map(w =>
            w.id === employee.windowId ? { ...w, currentCustomerId: nextCustomerId } : w
        );

        return {...prevState, customers: newCustomers, employees: newEmployees, windows: newWindows, queue: queue};
    });
  };

  const finishService = (employeeId: number) => {
    setState(prevState => {
        const employee = prevState.employees.find(e => e.id === employeeId);
        if (!employee || !employee.windowId) return prevState;

        const window = prevState.windows.find(w => w.id === employee.windowId);
        if (!window || !window.currentCustomerId) return prevState;

        const customerId = window.currentCustomerId;

        const newCustomers = prevState.customers.map(c =>
            c.id === customerId ? { ...c, status: CustomerStatus.Served, finishTime: new Date() } : c
        );
        const newEmployees = prevState.employees.map(e => 
            e.id === employeeId ? { ...e, status: EmployeeStatus.Available, customersServed: e.customersServed + 1 } : e
        );
        const newWindows = prevState.windows.map(w => 
            w.id === employee.windowId ? { ...w, currentCustomerId: undefined } : w
        );

        return {...prevState, customers: newCustomers, employees: newEmployees, windows: newWindows};
    });
  };

  const assignEmployeeToWindow = (employeeId: number, windowId: number) => {
    setState(prevState => {
        const currentEmployeeIdAtTargetWindow = prevState.windows.find(w => w.id === windowId)?.employeeId;
        
        const windowsAfterUnassigningMover = prevState.windows.map(w => {
            if (w.employeeId === employeeId) return { ...w, employeeId: undefined };
            return w;
        });
        
        const finalWindows = windowsAfterUnassigningMover.map(w => {
            if (w.id === windowId) return { ...w, employeeId: employeeId };
            return w;
        });

        const finalEmployees = prevState.employees.map(e => {
            if (e.id === employeeId) return { ...e, windowId: windowId };
            if (e.id === currentEmployeeIdAtTargetWindow) return { ...e, windowId: undefined };
            return e;
        });

        return { ...prevState, windows: finalWindows, employees: finalEmployees };
    });
  };

  const unassignEmployeeFromWindow = (employeeId: number) => {
    setState(prevState => {
        const newWindows = prevState.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
        const newEmployees = prevState.employees.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e);
        return {...prevState, windows: newWindows, employees: newEmployees};
    });
  };
  
  const addEmployee = (name: string, username: string, password: string) => {
    const newEmployee: Employee = {
      id: Date.now(),
      name, username, password,
      status: EmployeeStatus.Available,
      customersServed: 0,
    };
    setState(prevState => ({
        ...prevState,
        employees: [...prevState.employees, newEmployee]
    }));
  };

  const removeEmployee = (id: number) => {
    setState(prevState => {
        const employee = prevState.employees.find(e => e.id === id);
        let newWindows = prevState.windows;
        if (employee && employee.windowId) {
            newWindows = prevState.windows.map(w => w.id === employee.windowId ? {...w, employeeId: undefined} : w);
        }
        const newEmployees = prevState.employees.filter(e => e.id !== id);
        return {...prevState, employees: newEmployees, windows: newWindows};
    });
  };

  const addWindow = (name: string, customTask?: string) => {
    const newWindow: Window = {
      id: Date.now(),
      name,
      customTask: customTask || undefined,
    };
    setState(prevState => ({
        ...prevState,
        windows: [...prevState.windows, newWindow]
    }));
  };

  const removeWindow = (id: number) => {
    setState(prevState => {
        const window = prevState.windows.find(w => w.id === id);
        let newEmployees = prevState.employees;
        if (window && window.employeeId) {
            newEmployees = prevState.employees.map(e => e.id === window.employeeId ? {...e, windowId: undefined} : e);
        }
        const newWindows = prevState.windows.filter(w => w.id !== id);
        return {...prevState, windows: newWindows, employees: newEmployees};
    });
  };

  const updateWindowTask = (id: number, task: string) => {
    setState(prevState => ({
        ...prevState,
        windows: prevState.windows.map(w => w.id === id ? {...w, customTask: task} : w)
    }));
  };

  const authenticateEmployee = (username: string, password: string) => {
    return state.employees.find(e => e.username.toLowerCase() === username.toLowerCase() && e.password === password);
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
