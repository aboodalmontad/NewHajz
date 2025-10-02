import { QueueSystemState, Employee, Window, Customer, EmployeeStatus, CustomerStatus } from '../types';

// --- DATABASE SIMULATION ---
// This is the single source of truth for the application state.
// In a real application, this would be a database.
let state: QueueSystemState = {
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

let ticketCounter = 100;
const NETWORK_DELAY = 500; // ms

// --- API FUNCTIONS ---
// Each function simulates an async API call with a delay.

const api = {
  // GET the entire state
  getState: (): Promise<QueueSystemState> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(JSON.parse(JSON.stringify(state))), NETWORK_DELAY / 2); // Faster read
    });
  },

  // AUTHENTICATE an employee
  authenticateEmployee: (username: string, password: string): Promise<Employee | undefined> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const employee = state.employees.find(e => e.username.toLowerCase() === username.toLowerCase() && e.password === password);
        resolve(employee ? { ...employee } : undefined);
      }, NETWORK_DELAY);
    });
  },

  // ADD a new customer
  addCustomer: (): Promise<Customer> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const newCustomer: Customer = {
          id: Date.now(),
          ticketNumber: `ر-${ticketCounter}`,
          requestTime: new Date(),
          status: CustomerStatus.Waiting,
        };
        ticketCounter++;
        state.customers.push(newCustomer);
        state.queue.push(newCustomer.id);
        resolve({ ...newCustomer });
      }, NETWORK_DELAY);
    });
  },
  
  // CALL the next customer
  callNextCustomer: (employeeId: number): Promise<boolean> => {
      return new Promise((resolve, reject) => {
          setTimeout(() => {
              if (state.queue.length === 0) return resolve(false);

              const employee = state.employees.find(e => e.id === employeeId);
              if (!employee || employee.status === EmployeeStatus.Busy || !employee.windowId) return resolve(false);

              const nextCustomerId = state.queue.shift()!;
              
              state.customers = state.customers.map(c => 
                  c.id === nextCustomerId ? { ...c, status: CustomerStatus.Serving, callTime: new Date(), servedBy: employeeId, windowId: employee.windowId } : c
              );

              state.employees = state.employees.map(e => 
                  e.id === employeeId ? { ...e, status: EmployeeStatus.Busy } : e
              );

              state.windows = state.windows.map(w =>
                  w.id === employee.windowId ? { ...w, currentCustomerId: nextCustomerId } : w
              );
              resolve(true);
          }, NETWORK_DELAY);
      });
  },

  // FINISH service for a customer
  finishService: (employeeId: number): Promise<boolean> => {
      return new Promise(resolve => {
          setTimeout(() => {
              const employee = state.employees.find(e => e.id === employeeId);
              if (!employee || !employee.windowId) return resolve(false);

              const window = state.windows.find(w => w.id === employee.windowId);
              if (!window || !window.currentCustomerId) return resolve(false);

              const customerId = window.currentCustomerId;

              state.customers = state.customers.map(c =>
                  c.id === customerId ? { ...c, status: CustomerStatus.Served, finishTime: new Date() } : c
              );
              
              state.employees = state.employees.map(e => 
                  e.id === employeeId ? { ...e, status: EmployeeStatus.Available, customersServed: e.customersServed + 1 } : e
              );

              state.windows = state.windows.map(w => 
                  w.id === employee.windowId ? { ...w, currentCustomerId: undefined } : w
              );
              resolve(true);
          }, NETWORK_DELAY);
      });
  },

  // ASSIGN employee to a window
  assignEmployeeToWindow: (employeeId: number, windowId: number): Promise<void> => {
      return new Promise(resolve => {
          setTimeout(() => {
              const currentEmployeeOnWindow = state.employees.find(e => e.windowId === windowId);
              if (currentEmployeeOnWindow) {
                  currentEmployeeOnWindow.windowId = undefined;
              }

              state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);

              state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: windowId } : e);
              state.windows = state.windows.map(w => w.id === windowId ? { ...w, employeeId: employeeId } : w);
              resolve();
          }, NETWORK_DELAY);
      });
  },

  // UNASSIGN employee from a window
  unassignEmployeeFromWindow: (employeeId: number): Promise<void> => {
      return new Promise(resolve => {
          setTimeout(() => {
              state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
              state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e);
              resolve();
          }, NETWORK_DELAY);
      });
  },
  
  // ADD a new employee
  addEmployee: (name: string, username: string, password: string): Promise<Employee> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const newEmployee: Employee = {
          id: Date.now(),
          name, username, password,
          status: EmployeeStatus.Available,
          customersServed: 0,
        };
        state.employees.push(newEmployee);
        resolve({ ...newEmployee });
      }, NETWORK_DELAY);
    });
  },

  // REMOVE an employee
  removeEmployee: (id: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        // Unassign before removing
        const employee = state.employees.find(e => e.id === id);
        if (employee && employee.windowId) {
            state.windows = state.windows.map(w => w.id === employee.windowId ? {...w, employeeId: undefined} : w);
        }
        state.employees = state.employees.filter(e => e.id !== id);
        resolve();
      }, NETWORK_DELAY);
    });
  },

  // ADD a new window
  addWindow: (name: string, customTask?: string): Promise<Window> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const newWindow: Window = {
          id: Date.now(),
          name,
          customTask: customTask || undefined,
        };
        state.windows.push(newWindow);
        resolve({ ...newWindow });
      }, NETWORK_DELAY);
    });
  },

  // REMOVE a window
  removeWindow: (id: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const window = state.windows.find(w => w.id === id);
        if (window && window.employeeId) {
            state.employees = state.employees.map(e => e.id === window.employeeId ? {...e, windowId: undefined} : e);
        }
        state.windows = state.windows.filter(w => w.id !== id);
        resolve();
      }, NETWORK_DELAY);
    });
  },

  // UPDATE a window's task
  updateWindowTask: (id: number, task: string): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        state.windows = state.windows.map(w => w.id === id ? {...w, customTask: task} : w);
        resolve();
      }, NETWORK_DELAY);
    });
  },
};

export default api;
