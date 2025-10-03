import { QueueSystemState, Employee, Window, Customer, EmployeeStatus, CustomerStatus } from '../types';

const DB_PREFIX = 'smart_queue_db_';
const NETWORK_DELAY = 300; // ms

// --- DATABASE SIMULATION VIA LOCALSTORAGE ---

const getInitialState = (): QueueSystemState => ({
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
});

const readState = (dbId: string): QueueSystemState => {
    try {
        const rawState = localStorage.getItem(DB_PREFIX + dbId);
        if (rawState) {
            return JSON.parse(rawState);
        }
    } catch (e) {
        console.error("Could not parse state from localStorage", e);
    }
    // If nothing in storage or error, return initial state.
    // This also "creates" a new DB on first use.
    return getInitialState();
};

const writeState = (dbId: string, state: QueueSystemState) => {
    localStorage.setItem(DB_PREFIX + dbId, JSON.stringify(state));
};


// --- API FUNCTIONS ---
// Each function now operates on a specific DB identified by dbId.

const api = {
  // GET the entire state for a given DB
  getState: (dbId: string): Promise<QueueSystemState> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(readState(dbId)), NETWORK_DELAY / 2);
    });
  },

  // AUTHENTICATE an employee for a given DB
  authenticateEmployee: (dbId: string, username: string, password: string): Promise<Employee | undefined> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const state = readState(dbId);
        const employee = state.employees.find(e => e.username.toLowerCase() === username.toLowerCase() && e.password === password);
        resolve(employee ? { ...employee } : undefined);
      }, NETWORK_DELAY);
    });
  },

  // ADD a new customer to a given DB
  addCustomer: (dbId: string): Promise<Customer> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const state = readState(dbId);
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
        state.customers.push(newCustomer);
        state.queue.push(newCustomer.id);
        writeState(dbId, state);
        resolve({ ...newCustomer });
      }, NETWORK_DELAY);
    });
  },
  
  // CALL the next customer in a given DB
  callNextCustomer: (dbId: string, employeeId: number): Promise<boolean> => {
      return new Promise((resolve) => {
          setTimeout(() => {
              const state = readState(dbId);
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
              writeState(dbId, state);
              resolve(true);
          }, NETWORK_DELAY);
      });
  },

  // FINISH service for a customer in a given DB
  finishService: (dbId: string, employeeId: number): Promise<boolean> => {
      return new Promise(resolve => {
          setTimeout(() => {
              const state = readState(dbId);
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
              writeState(dbId, state);
              resolve(true);
          }, NETWORK_DELAY);
      });
  },

  // ASSIGN employee to a window in a given DB
  assignEmployeeToWindow: (dbId: string, employeeId: number, windowId: number): Promise<void> => {
      return new Promise(resolve => {
          setTimeout(() => {
              const state = readState(dbId);
              const currentEmployeeIdAtTargetWindow = state.windows.find(w => w.id === windowId)?.employeeId;
              
              state.windows = state.windows.map(w => w.employeeId === employeeId ? { ...w, employeeId: undefined } : w);
              state.windows = state.windows.map(w => w.id === windowId ? { ...w, employeeId: employeeId } : w);

              state.employees = state.employees.map(e => {
                  if (e.id === employeeId) return { ...e, windowId: windowId };
                  if (e.id === currentEmployeeIdAtTargetWindow) return { ...e, windowId: undefined };
                  return e;
              });
              writeState(dbId, state);
              resolve();
          }, NETWORK_DELAY);
      });
  },

  // UNASSIGN employee from a window in a given DB
  unassignEmployeeFromWindow: (dbId: string, employeeId: number): Promise<void> => {
      return new Promise(resolve => {
          setTimeout(() => {
              const state = readState(dbId);
              state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
              state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e);
              writeState(dbId, state);
              resolve();
          }, NETWORK_DELAY);
      });
  },
  
  // ADD a new employee to a given DB
  addEmployee: (dbId: string, name: string, username: string, password: string): Promise<Employee> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const state = readState(dbId);
        const newEmployee: Employee = {
          id: Date.now(),
          name, username, password,
          status: EmployeeStatus.Available,
          customersServed: 0,
        };
        state.employees.push(newEmployee);
        writeState(dbId, state);
        resolve({ ...newEmployee });
      }, NETWORK_DELAY);
    });
  },

  // REMOVE an employee from a given DB
  removeEmployee: (dbId: string, id: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const state = readState(dbId);
        const employee = state.employees.find(e => e.id === id);
        if (employee && employee.windowId) {
            state.windows = state.windows.map(w => w.id === employee.windowId ? {...w, employeeId: undefined} : w);
        }
        state.employees = state.employees.filter(e => e.id !== id);
        writeState(dbId, state);
        resolve();
      }, NETWORK_DELAY);
    });
  },

  // ADD a new window to a given DB
  addWindow: (dbId: string, name: string, customTask?: string): Promise<Window> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const state = readState(dbId);
        const newWindow: Window = {
          id: Date.now(),
          name,
          customTask: customTask || undefined,
        };
        state.windows.push(newWindow);
        writeState(dbId, state);
        resolve({ ...newWindow });
      }, NETWORK_DELAY);
    });
  },

  // REMOVE a window from a given DB
  removeWindow: (dbId: string, id: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const state = readState(dbId);
        const window = state.windows.find(w => w.id === id);
        if (window && window.employeeId) {
            state.employees = state.employees.map(e => e.id === window.employeeId ? {...e, windowId: undefined} : e);
        }
        state.windows = state.windows.filter(w => w.id !== id);
        writeState(dbId, state);
        resolve();
      }, NETWORK_DELAY);
    });
  },

  // UPDATE a window's task in a given DB
  updateWindowTask: (dbId: string, id: number, task: string): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const state = readState(dbId);
        state.windows = state.windows.map(w => w.id === id ? {...w, customTask: task} : w);
        writeState(dbId, state);
        resolve();
      }, NETWORK_DELAY);
    });
  },
};

export default api;
