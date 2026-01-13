
import { QueueSystemState, Employee, Window, Customer, EmployeeStatus, CustomerStatus } from '../types';

const STORAGE_KEY = 'smart_queue_system_state_v1';
const ADMIN_PASSWORD_KEY = 'admin_password_config';

const DEFAULT_STATE: QueueSystemState = {
  windows: [
    { id: 1, name: 'شباك 1', customTask: 'استقبال' },
    { id: 2, name: 'شباك 2', customTask: 'فتح حساب جديد' },
    { id: 3, name: 'شباك 3', customTask: 'خدمات العملاء' },
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
  ticketCounter: 100,
};

const loadState = (): QueueSystemState => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (!parsed || typeof parsed !== 'object') return DEFAULT_STATE;
      
      parsed.customers = Array.isArray(parsed.customers) ? parsed.customers : [];
      parsed.employees = Array.isArray(parsed.employees) ? parsed.employees : DEFAULT_STATE.employees;
      parsed.windows = Array.isArray(parsed.windows) ? parsed.windows : DEFAULT_STATE.windows;
      parsed.queue = Array.isArray(parsed.queue) ? parsed.queue : [];
      parsed.ticketCounter = typeof parsed.ticketCounter === 'number' ? parsed.ticketCounter : 100;

      parsed.customers.forEach((c: any) => {
        if (c.requestTime) c.requestTime = new Date(c.requestTime);
        if (c.callTime) c.callTime = new Date(c.callTime);
        if (c.finishTime) c.finishTime = new Date(c.finishTime);
      });
      
      return parsed as QueueSystemState;
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return DEFAULT_STATE;
};

const saveState = (state: QueueSystemState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};

let state: QueueSystemState = loadState();

const NETWORK_DELAY = 50; 

const api = {
  getState: (): Promise<QueueSystemState> => {
    return new Promise(resolve => {
      state = loadState();
      setTimeout(() => resolve(JSON.parse(JSON.stringify(state))), NETWORK_DELAY);
    });
  },

  authenticateEmployee: (username: string, password: string): Promise<Employee | undefined> => {
    state = loadState();
    return new Promise(resolve => {
      setTimeout(() => {
        const employee = state.employees.find(e => e.username.toLowerCase() === username.toLowerCase() && e.password === password);
        resolve(employee ? { ...employee } : undefined);
      }, NETWORK_DELAY);
    });
  },

  authenticateAdmin: (password: string): Promise<boolean> => {
    return new Promise(resolve => {
      setTimeout(() => {
        // كلمة مرور المدير الافتراضية هي admin123
        const savedAdminPass = localStorage.getItem(ADMIN_PASSWORD_KEY) || 'admin123';
        resolve(password === savedAdminPass);
      }, NETWORK_DELAY);
    });
  },

  addCustomer: (serviceName?: string): Promise<Customer> => {
    state = loadState();
    return new Promise(resolve => {
      setTimeout(() => {
        const newCustomer: Customer = {
          id: Date.now(),
          ticketNumber: `ر-${state.ticketCounter}`,
          requestTime: new Date(),
          status: CustomerStatus.Waiting,
          serviceName: serviceName || 'خدمات عامة'
        };
        state.ticketCounter++;
        state.customers.push(newCustomer);
        state.queue.push(newCustomer.id);
        
        saveState(state);
        resolve({ ...newCustomer });
      }, NETWORK_DELAY);
    });
  },
  
  callNextCustomer: (employeeId: number): Promise<boolean> => {
      state = loadState();
      return new Promise((resolve) => {
          setTimeout(() => {
              if (state.queue.length === 0) return resolve(false);

              const employee = state.employees.find(e => e.id === employeeId);
              if (!employee || employee.status === EmployeeStatus.Busy || !employee.windowId) return resolve(false);

              const window = state.windows.find(w => w.id === employee.windowId);
              if (!window) return resolve(false);

              const windowTask = window.customTask || 'خدمات عامة';
              let nextCustomerId: number | undefined;
              let queueIndex = -1;

              // البحث عن عملاء يطابقون تخصص الشباك
              if (windowTask !== 'خدمات عامة') {
                  queueIndex = state.queue.findIndex(id => {
                      const cust = state.customers.find(c => c.id === id);
                      return cust?.serviceName === windowTask;
                  });
              } else {
                  // إذا كان خدمات عامة، نأخذ أول واحد في الطابور أياً كان نوع خدمته
                  queueIndex = 0;
              }

              // إذا لم يتم العثور على أي شخص يطابق التخصص (في حال كان الشباك متخصصاً)
              if (queueIndex === -1) {
                  return resolve(false);
              }

              nextCustomerId = state.queue.splice(queueIndex, 1)[0];
              
              state.customers = state.customers.map(c => 
                  c.id === nextCustomerId ? { ...c, status: CustomerStatus.Serving, callTime: new Date(), servedBy: employeeId, windowId: employee.windowId } : c
              );

              state.employees = state.employees.map(e => 
                  e.id === employeeId ? { ...e, status: EmployeeStatus.Busy } : e
              );

              state.windows = state.windows.map(w =>
                  w.id === employee.windowId ? { ...w, currentCustomerId: nextCustomerId } : w
              );

              saveState(state);
              resolve(true);
          }, NETWORK_DELAY);
      });
  },

  finishService: (employeeId: number): Promise<boolean> => {
      state = loadState();
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

              saveState(state);
              resolve(true);
          }, NETWORK_DELAY);
      });
  },

  assignEmployeeToWindow: (employeeId: number, windowId: number): Promise<void> => {
      state = loadState();
      return new Promise(resolve => {
          setTimeout(() => {
              state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
              const targetWindow = state.windows.find(w => w.id === windowId);
              if (targetWindow && targetWindow.employeeId) {
                  state.employees = state.employees.map(e => e.id === targetWindow.employeeId ? {...e, windowId: undefined} : e);
              }
              state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: windowId } : e);
              state.windows = state.windows.map(w => w.id === windowId ? { ...w, employeeId: employeeId } : w);
              saveState(state);
              resolve();
          }, NETWORK_DELAY);
      });
  },

  unassignEmployeeFromWindow: (employeeId: number): Promise<void> => {
      state = loadState();
      return new Promise(resolve => {
          setTimeout(() => {
              state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
              state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e);
              saveState(state);
              resolve();
          }, NETWORK_DELAY);
      });
  },
  
  addEmployee: (name: string, username: string, password: string): Promise<Employee> => {
    state = loadState();
    return new Promise(resolve => {
      setTimeout(() => {
        const newEmployee: Employee = {
          id: Date.now(),
          name, username, password,
          status: EmployeeStatus.Available,
          customersServed: 0,
        };
        state.employees.push(newEmployee);
        saveState(state);
        resolve({ ...newEmployee });
      }, NETWORK_DELAY);
    });
  },

  removeEmployee: (id: number): Promise<void> => {
    state = loadState();
    return new Promise(resolve => {
      setTimeout(() => {
        const employee = state.employees.find(e => e.id === id);
        if (employee && employee.windowId) {
            state.windows = state.windows.map(w => w.id === employee.windowId ? {...w, employeeId: undefined} : w);
        }
        state.employees = state.employees.filter(e => e.id !== id);
        saveState(state);
        resolve();
      }, NETWORK_DELAY);
    });
  },

  addWindow: (name: string, customTask?: string): Promise<Window> => {
    state = loadState();
    return new Promise(resolve => {
      setTimeout(() => {
        const newWindow: Window = {
          id: Date.now(),
          name,
          customTask: customTask || undefined,
        };
        state.windows.push(newWindow);
        saveState(state);
        resolve({ ...newWindow });
      }, NETWORK_DELAY);
    });
  },

  removeWindow: (id: number): Promise<void> => {
    state = loadState();
    return new Promise(resolve => {
      setTimeout(() => {
        const window = state.windows.find(w => w.id === id);
        if (window && window.employeeId) {
            state.employees = state.employees.map(e => e.id === window.employeeId ? {...e, windowId: undefined} : e);
        }
        state.windows = state.windows.filter(w => w.id !== id);
        saveState(state);
        resolve();
      }, NETWORK_DELAY);
    });
  },

  updateWindowTask: (id: number, task: string): Promise<void> => {
    state = loadState();
    return new Promise(resolve => {
      setTimeout(() => {
        state.windows = state.windows.map(w => w.id === id ? {...w, customTask: task} : w);
        saveState(state);
        resolve();
      }, NETWORK_DELAY);
    });
  },
};

export default api;
