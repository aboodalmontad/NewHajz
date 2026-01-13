
import { QueueSystemState, Employee, Window, Customer, EmployeeStatus, CustomerStatus } from '../types';

// مفتاح التخزين في LocalStorage
const STORAGE_KEY = 'smart_queue_system_state_v1';

// الحالة الافتراضية للنظام في حال عدم وجود بيانات سابقة
const DEFAULT_STATE: QueueSystemState = {
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
  ticketCounter: 100,
};

// وظيفة لتحميل الحالة من LocalStorage
const loadState = (): QueueSystemState => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // تحويل سلاسل التاريخ النصية إلى كائنات Date
      parsed.customers.forEach((c: any) => {
        if (c.requestTime) c.requestTime = new Date(c.requestTime);
        if (c.callTime) c.callTime = new Date(c.callTime);
        if (c.finishTime) c.finishTime = new Date(c.finishTime);
      });
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load state from localStorage", e);
  }
  return DEFAULT_STATE;
};

// وظيفة لحفظ الحالة في LocalStorage
const saveState = (state: QueueSystemState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state to localStorage", e);
  }
};

// الحالة الحالية (تم تحميلها من المتصفح)
let state: QueueSystemState = loadState();

const NETWORK_DELAY = 300; // تقليل التأخير قليلاً لجعل التطبيق أسرع

const api = {
  getState: (): Promise<QueueSystemState> => {
    return new Promise(resolve => {
      setTimeout(() => resolve(JSON.parse(JSON.stringify(state))), NETWORK_DELAY / 2);
    });
  },

  authenticateEmployee: (username: string, password: string): Promise<Employee | undefined> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const employee = state.employees.find(e => e.username.toLowerCase() === username.toLowerCase() && e.password === password);
        resolve(employee ? { ...employee } : undefined);
      }, NETWORK_DELAY);
    });
  },

  addCustomer: (): Promise<Customer> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const newCustomer: Customer = {
          id: Date.now(),
          ticketNumber: `ر-${state.ticketCounter}`,
          requestTime: new Date(),
          status: CustomerStatus.Waiting,
        };
        state.ticketCounter++;
        state.customers.push(newCustomer);
        state.queue.push(newCustomer.id);
        
        saveState(state); // حفظ التغيير
        resolve({ ...newCustomer });
      }, NETWORK_DELAY);
    });
  },
  
  callNextCustomer: (employeeId: number): Promise<boolean> => {
      return new Promise((resolve) => {
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

              saveState(state); // حفظ التغيير
              resolve(true);
          }, NETWORK_DELAY);
      });
  },

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

              saveState(state); // حفظ التغيير
              resolve(true);
          }, NETWORK_DELAY);
      });
  },

  assignEmployeeToWindow: (employeeId: number, windowId: number): Promise<void> => {
      return new Promise(resolve => {
          setTimeout(() => {
              state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
              
              const targetWindow = state.windows.find(w => w.id === windowId);
              if (targetWindow && targetWindow.employeeId) {
                  state.employees = state.employees.map(e => e.id === targetWindow.employeeId ? {...e, windowId: undefined} : e);
              }

              state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: windowId } : e);
              state.windows = state.windows.map(w => w.id === windowId ? { ...w, employeeId: employeeId } : w);
              
              saveState(state); // حفظ التغيير
              resolve();
          }, NETWORK_DELAY);
      });
  },

  unassignEmployeeFromWindow: (employeeId: number): Promise<void> => {
      return new Promise(resolve => {
          setTimeout(() => {
              state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
              state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e);
              
              saveState(state); // حفظ التغيير
              resolve();
          }, NETWORK_DELAY);
      });
  },
  
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
        
        saveState(state); // حفظ التغيير
        resolve({ ...newEmployee });
      }, NETWORK_DELAY);
    });
  },

  removeEmployee: (id: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const employee = state.employees.find(e => e.id === id);
        if (employee && employee.windowId) {
            state.windows = state.windows.map(w => w.id === employee.windowId ? {...w, employeeId: undefined} : w);
        }
        state.employees = state.employees.filter(e => e.id !== id);
        
        saveState(state); // حفظ التغيير
        resolve();
      }, NETWORK_DELAY);
    });
  },

  addWindow: (name: string, customTask?: string): Promise<Window> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const newWindow: Window = {
          id: Date.now(),
          name,
          customTask: customTask || undefined,
        };
        state.windows.push(newWindow);
        
        saveState(state); // حفظ التغيير
        resolve({ ...newWindow });
      }, NETWORK_DELAY);
    });
  },

  removeWindow: (id: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const window = state.windows.find(w => w.id === id);
        if (window && window.employeeId) {
            state.employees = state.employees.map(e => e.id === window.employeeId ? {...e, windowId: undefined} : e);
        }
        state.windows = state.windows.filter(w => w.id !== id);
        
        saveState(state); // حفظ التغيير
        resolve();
      }, NETWORK_DELAY);
    });
  },

  updateWindowTask: (id: number, task: string): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        state.windows = state.windows.map(w => w.id === id ? {...w, customTask: task} : w);
        
        saveState(state); // حفظ التغيير
        resolve();
      }, NETWORK_DELAY);
    });
  },
};

export default api;
