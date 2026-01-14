
import { QueueSystemState, Employee, Window, Customer, EmployeeStatus, CustomerStatus, PrinterConfig } from '../types';

const STORAGE_KEY = 'smart_queue_system_state_v1';
const ADMIN_PASSWORD_KEY = 'admin_password_config';
const SYNC_ENDPOINT = 'https://jsonblob.com/api/jsonBlob';

const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: '80mm',
  headerText: 'نظام الطابور الذكي',
  headerFontSize: 20,
  numberFontSize: 70,
  detailsFontSize: 14,
  footerText: 'شكراً لزيارتكم',
  showDate: true,
  autoPrint: true
};

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
  printerConfig: DEFAULT_PRINTER_CONFIG
};

const getServicePrefix = (serviceName: string): string => {
  const name = serviceName.toLowerCase();
  if (name.includes('استقبال')) return 'A';
  if (name.includes('حساب')) return 'B';
  if (name.includes('عملاء')) return 'C';
  if (name.includes('صراف') || name.includes('مالية') || name.includes('سحب')) return 'D';
  return 'S';
};

const loadLocalState = (): QueueSystemState => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      parsed.customers?.forEach((c: any) => {
        if (c.requestTime) c.requestTime = new Date(c.requestTime);
        if (c.callTime) c.callTime = new Date(c.callTime);
        if (c.finishTime) c.finishTime = new Date(c.finishTime);
      });
      if (!parsed.printerConfig) parsed.printerConfig = DEFAULT_PRINTER_CONFIG;
      return parsed;
    }
  } catch (e) {
    console.warn("Local state load failed", e);
  }
  return DEFAULT_STATE;
};

const saveLocalState = (state: QueueSystemState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Local save error:", e);
  }
};

const pushToCloud = async (state: QueueSystemState) => {
  if (!state.syncId) return;
  try {
    await fetch(`${SYNC_ENDPOINT}/${state.syncId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).catch(e => console.error("Cloud push failed:", e));
  } catch (e) {
    console.error("Cloud push fatal error:", e);
  }
};

const api = {
  getState: async (): Promise<QueueSystemState> => {
    let local = loadLocalState();
    if (local.syncId) {
      try {
        const response = await fetch(`${SYNC_ENDPOINT}/${local.syncId}`);
        if (response.ok) {
          const remote = await response.json();
          remote.customers?.forEach((c: any) => {
            if (c.requestTime) c.requestTime = new Date(c.requestTime);
            if (c.callTime) c.callTime = new Date(c.callTime);
            if (c.finishTime) c.finishTime = new Date(c.finishTime);
          });
          // التعزيز: التأكد من بقاء معرف المزامنة في الحالة المسترجعة
          remote.syncId = local.syncId;
          saveLocalState(remote);
          return remote;
        }
      } catch (e) {
        console.warn("Cloud sync failed, using persistent local state");
      }
    }
    return local;
  },

  createSyncSession: async (): Promise<string> => {
    const currentState = loadLocalState();
    try {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState)
      });
      const location = response.headers.get('Location');
      const syncId = location?.split('/').pop() || '';
      if (syncId) {
        currentState.syncId = syncId;
        saveLocalState(currentState);
        return syncId;
      }
    } catch (e) {
      console.error("Session creation error:", e);
    }
    return '';
  },

  joinSyncSession: async (syncId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${SYNC_ENDPOINT}/${syncId}`);
      if (response.ok) {
        const remote = await response.json();
        remote.syncId = syncId;
        saveLocalState(remote);
        return true;
      }
    } catch (e) {
      console.error("Join sync error:", e);
    }
    return false;
  },

  disconnectSync: async (): Promise<void> => {
    const state = loadLocalState();
    delete state.syncId;
    saveLocalState(state);
  },

  authenticateEmployee: async (username: string, password: string): Promise<Employee | undefined> => {
    const state = await api.getState();
    return state.employees.find(e => e.username.toLowerCase() === username.toLowerCase() && e.password === password);
  },

  authenticateAdmin: async (password: string): Promise<boolean> => {
    const savedAdminPass = localStorage.getItem(ADMIN_PASSWORD_KEY) || 'admin123';
    return password === savedAdminPass;
  },

  updateAdminPassword: async (newPassword: string): Promise<void> => {
    localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
  },

  addCustomer: async (serviceName?: string): Promise<Customer> => {
    const state = await api.getState();
    const service = serviceName || 'خدمات عامة';
    const prefix = getServicePrefix(service);
    
    const newCustomer: Customer = {
      id: Date.now(),
      ticketNumber: `${prefix}-${state.ticketCounter}`,
      requestTime: new Date(),
      status: CustomerStatus.Waiting,
      serviceName: service
    };
    state.ticketCounter++;
    state.customers.push(newCustomer);
    state.queue.push(newCustomer.id);
    saveLocalState(state);
    pushToCloud(state);
    return newCustomer;
  },

  updatePrinterConfig: async (config: PrinterConfig): Promise<void> => {
    const state = await api.getState();
    state.printerConfig = config;
    saveLocalState(state);
    pushToCloud(state);
  },
  
  callNextCustomer: async (employeeId: number): Promise<QueueSystemState | null> => {
      const state = await api.getState();
      const employee = state.employees.find(e => e.id === employeeId);
      if (!employee || employee.status === EmployeeStatus.Busy || !employee.windowId) return null;
      const window = state.windows.find(w => w.id === employee.windowId);
      if (!window) return null;

      const windowTask = window.customTask || 'خدمات عامة';
      let queueIndex = windowTask !== 'خدمات عامة' 
          ? state.queue.findIndex(id => state.customers.find(c => c.id === id)?.serviceName === windowTask)
          : 0;

      if (queueIndex === -1) return null;

      const nextId = state.queue.splice(queueIndex, 1)[0];
      state.customers = state.customers.map(c => c.id === nextId ? { ...c, status: CustomerStatus.Serving, callTime: new Date(), servedBy: employeeId, windowId: employee.windowId } : c);
      state.employees = state.employees.map(e => e.id === employeeId ? { ...e, status: EmployeeStatus.Busy } : e);
      state.windows = state.windows.map(w => w.id === employee.windowId ? { ...w, currentCustomerId: nextId } : w);
      
      saveLocalState(state);
      pushToCloud(state);
      return state;
  },

  finishService: async (employeeId: number): Promise<QueueSystemState | null> => {
      const state = await api.getState();
      const employee = state.employees.find(e => e.id === employeeId);
      if (!employee || !employee.windowId) return null;
      const window = state.windows.find(w => w.id === employee.windowId);
      if (!window || !window.currentCustomerId) return null;

      const customerId = window.currentCustomerId;
      state.customers = state.customers.map(c => c.id === customerId ? { ...c, status: CustomerStatus.Served, finishTime: new Date() } : c);
      state.employees = state.employees.map(e => e.id === employeeId ? { ...e, status: EmployeeStatus.Available, customersServed: e.customersServed + 1 } : e);
      state.windows = state.windows.map(w => w.id === employee.windowId ? { ...w, currentCustomerId: undefined } : w);

      saveLocalState(state);
      pushToCloud(state);
      return state;
  },

  assignEmployeeToWindow: async (employeeId: number, windowId: number): Promise<QueueSystemState | null> => {
      const state = await api.getState();
      state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
      state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: windowId } : e);
      state.windows = state.windows.map(w => w.id === windowId ? { ...w, employeeId: employeeId } : w);
      saveLocalState(state);
      pushToCloud(state);
      return state;
  },

  unassignEmployeeFromWindow: async (employeeId: number): Promise<QueueSystemState | null> => {
      const state = await api.getState();
      state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
      state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e);
      saveLocalState(state);
      pushToCloud(state);
      return state;
  },
  
  addEmployee: async (name: string, username: string, password: string): Promise<Employee> => {
    const state = await api.getState();
    const newEmp: Employee = { id: Date.now(), name, username, password, status: EmployeeStatus.Available, customersServed: 0 };
    state.employees.push(newEmp);
    saveLocalState(state);
    pushToCloud(state);
    return newEmp;
  },

  removeEmployee: async (id: number): Promise<void> => {
    const state = await api.getState();
    state.employees = state.employees.filter(e => e.id !== id);
    saveLocalState(state);
    pushToCloud(state);
  },

  addWindow: async (name: string, customTask?: string): Promise<Window> => {
    const state = await api.getState();
    const newWin: Window = { id: Date.now(), name, customTask };
    state.windows.push(newWin);
    saveLocalState(state);
    pushToCloud(state);
    return newWin;
  },

  removeWindow: async (id: number): Promise<void> => {
    const state = await api.getState();
    state.windows = state.windows.filter(w => w.id !== id);
    saveLocalState(state);
    pushToCloud(state);
  },

  updateWindowTask: async (id: number, task: string): Promise<void> => {
    const state = await api.getState();
    state.windows = state.windows.map(w => w.id === id ? {...w, customTask: task} : w);
    saveLocalState(state);
    pushToCloud(state);
  }
};

export default api;
