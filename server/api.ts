
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

const loadLocalState = (): QueueSystemState => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // تحويل التواريخ من نصوص إلى كائنات Date
      parsed.customers?.forEach((c: any) => {
        if (c.requestTime) c.requestTime = new Date(c.requestTime);
        if (c.callTime) c.callTime = new Date(c.callTime);
        if (c.finishTime) c.finishTime = new Date(c.finishTime);
      });
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load local state", e);
  }
  return DEFAULT_STATE;
};

const saveLocalState = (state: QueueSystemState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save local state", e);
  }
};

const pushToCloud = async (state: QueueSystemState) => {
  if (!state.syncId) return;
  try {
    await fetch(`${SYNC_ENDPOINT}/${state.syncId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
  } catch (e) {
    console.warn("Cloud sync push failed, will retry later.");
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
          // دمج معرف المزامنة المحلي مع البيانات القادمة من السحابة
          remote.syncId = local.syncId;
          saveLocalState(remote);
          return remote;
        }
      } catch (e) {
        console.warn("Cloud sync unavailable, using persistent local state.");
      }
    }
    return local;
  },

  createSyncSession: async (): Promise<string> => {
    const state = loadLocalState();
    try {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      const location = response.headers.get('Location');
      const syncId = location?.split('/').pop() || '';
      if (syncId) {
        state.syncId = syncId;
        saveLocalState(state);
        return syncId;
      }
    } catch (e) {
      console.error("Failed to create cloud session", e);
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
      console.error("Failed to join session", e);
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
    return state.employees.find(e => e.username === username && e.password === password);
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
    // تحديد البادئة بناءً على اسم الخدمة
    const prefix = service.includes('حساب') ? 'B' : service.includes('استقبال') ? 'A' : 'S';
    
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

  callNextCustomer: async (employeeId: number): Promise<QueueSystemState | null> => {
    const state = await api.getState();
    const emp = state.employees.find(e => e.id === employeeId);
    if (!emp || !emp.windowId || emp.status === EmployeeStatus.Busy) return null;
    
    const win = state.windows.find(w => w.id === emp.windowId);
    const task = win?.customTask || 'خدمات عامة';
    
    // محاولة إيجاد أول شخص في الطابور يطلب تخصص هذا الشباك
    const qIdx = task === 'خدمات عامة' 
      ? 0 
      : state.queue.findIndex(id => state.customers.find(c => c.id === id)?.serviceName === task);
    
    const finalIdx = qIdx === -1 && task !== 'خدمات عامة' ? -1 : (qIdx === -1 ? 0 : qIdx);
    
    if (finalIdx === -1 || state.queue.length === 0) return null;

    const nextId = state.queue.splice(finalIdx, 1)[0];
    state.customers = state.customers.map(c => c.id === nextId ? { 
      ...c, 
      status: CustomerStatus.Serving, 
      callTime: new Date(), 
      servedBy: employeeId, 
      windowId: emp.windowId 
    } : c);
    
    state.employees = state.employees.map(e => e.id === employeeId ? { ...e, status: EmployeeStatus.Busy } : e);
    state.windows = state.windows.map(w => w.id === emp.windowId ? { ...w, currentCustomerId: nextId } : w);
    
    saveLocalState(state);
    pushToCloud(state);
    return state;
  },

  finishService: async (employeeId: number): Promise<QueueSystemState | null> => {
    const state = await api.getState();
    const emp = state.employees.find(e => e.id === employeeId);
    if (!emp || !emp.windowId) return null;
    const win = state.windows.find(w => w.id === emp.windowId);
    if (!win || !win.currentCustomerId) return null;

    const customerId = win.currentCustomerId;
    state.customers = state.customers.map(c => c.id === customerId ? { ...c, status: CustomerStatus.Served, finishTime: new Date() } : c);
    state.employees = state.employees.map(e => e.id === employeeId ? { ...e, status: EmployeeStatus.Available, customersServed: e.customersServed + 1 } : e);
    state.windows = state.windows.map(w => w.id === emp.windowId ? { ...w, currentCustomerId: undefined } : w);

    saveLocalState(state);
    pushToCloud(state);
    return state;
  },

  assignEmployeeToWindow: async (employeeId: number, windowId: number): Promise<QueueSystemState | null> => {
    const state = await api.getState();
    state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId } : e);
    state.windows = state.windows.map(w => w.id === windowId ? { ...w, employeeId } : w);
    saveLocalState(state);
    pushToCloud(state);
    return state;
  },

  unassignEmployeeFromWindow: async (employeeId: number): Promise<QueueSystemState | null> => {
    const state = await api.getState();
    state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e);
    state.windows = state.windows.map(w => w.employeeId === employeeId ? { ...w, employeeId: undefined } : w);
    saveLocalState(state);
    pushToCloud(state);
    return state;
  },

  addEmployee: async (name: string, username: string, password: string): Promise<Employee> => {
    const state = await api.getState();
    const newEmp = { id: Date.now(), name, username, password, status: EmployeeStatus.Available, customersServed: 0 };
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
    const newWin = { id: Date.now(), name, customTask };
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
    state.windows = state.windows.map(w => w.id === id ? { ...w, customTask: task } : w);
    saveLocalState(state);
    pushToCloud(state);
  },

  updatePrinterConfig: async (config: PrinterConfig): Promise<void> => {
    const state = await api.getState();
    state.printerConfig = config;
    saveLocalState(state);
    pushToCloud(state);
  }
};

export default api;
