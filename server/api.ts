import { QueueSystemState, Employee, Window, Customer, EmployeeStatus, CustomerStatus, PrinterConfig, ChatMessage } from '../types';

const STORAGE_KEY = 'smart_queue_system_state_v1';
const ADMIN_PASSWORD_KEY = 'admin_password_config';

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
  printerConfig: DEFAULT_PRINTER_CONFIG,
  chatMessages: []
};

const getServicePrefix = (serviceName: string): string => {
  const name = serviceName.toLowerCase();
  if (name.includes('استقبال')) return 'A';
  if (name.includes('حساب')) return 'B';
  if (name.includes('عملاء')) return 'C';
  if (name.includes('صراف') || name.includes('مالية') || name.includes('سحب')) return 'D';
  return 'S';
};

const parseDatesInState = (state: any): QueueSystemState => {
  if (!state) return DEFAULT_STATE;
  state.customers?.forEach((c: any) => {
    if (c.requestTime) c.requestTime = new Date(c.requestTime);
    if (c.callTime) c.callTime = new Date(c.callTime);
    if (c.finishTime) c.finishTime = new Date(c.finishTime);
  });
  if (!state.printerConfig) state.printerConfig = DEFAULT_PRINTER_CONFIG;
  if (!Array.isArray(state.chatMessages)) state.chatMessages = [];
  if (!Array.isArray(state.windows)) state.windows = DEFAULT_STATE.windows;
  if (!Array.isArray(state.employees)) state.employees = DEFAULT_STATE.employees;
  if (!Array.isArray(state.queue)) state.queue = [];
  if (!Array.isArray(state.customers)) state.customers = [];

  // Protect ticketCounter from ever being regressed or lower than existing tickets
  let maxExisting = 99;
  for (const c of state.customers) {
    if (c && c.ticketNumber) {
      const match = String(c.ticketNumber).match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxExisting) {
          maxExisting = num;
        }
      }
    }
  }
  const counterVal = Number(state.ticketCounter) || 100;
  if (counterVal <= maxExisting) {
    state.ticketCounter = maxExisting + 1;
  }

  return state;
};

const loadLocalState = (): QueueSystemState => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      return parseDatesInState(parsed);
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

const pushToServer = async (state: QueueSystemState) => {
  try {
    const syncParam = state.syncId ? `?syncId=${encodeURIComponent(state.syncId)}` : '';
    await fetch(`/api/queue/state${syncParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, syncId: state.syncId })
    });
  } catch (e) {
    // If local network or offline, local storage will maintain it
  }
};

export interface NetworkInfo {
  localIps: string[];
  port: number;
  activeRooms: string[];
  serverTime: number;
}

const api = {
  getNetworkInfo: async (): Promise<NetworkInfo | null> => {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Network info fetch failed', e);
    }
    return null;
  },

  getState: async (syncIdOverride?: string): Promise<QueueSystemState> => {
    const local = loadLocalState();
    const activeSyncId = syncIdOverride !== undefined ? syncIdOverride : local.syncId;

    try {
      const syncParam = activeSyncId ? `?syncId=${encodeURIComponent(activeSyncId)}` : '';
      const response = await fetch(`/api/queue/state${syncParam}`);
      if (response.ok) {
        const remote = await response.json();
        const parsed = parseDatesInState(remote);
        if (activeSyncId) parsed.syncId = activeSyncId;
        saveLocalState(parsed);
        return parsed;
      }
    } catch (e) {
      // Server not reachable yet, use local state
    }
    return local;
  },

  createSyncSession: async (): Promise<string> => {
    const newId = 'LAN-' + Math.floor(1000 + Math.random() * 9000);
    const currentState = loadLocalState();
    currentState.syncId = newId;
    saveLocalState(currentState);
    await pushToServer(currentState);
    return newId;
  },

  joinSyncSession: async (syncId: string): Promise<boolean> => {
    const cleanId = syncId.trim();
    if (!cleanId) return false;

    try {
      const response = await fetch(`/api/queue/state?syncId=${encodeURIComponent(cleanId)}`);
      if (response.ok) {
        const remote = await response.json();
        const parsed = parseDatesInState(remote);
        parsed.syncId = cleanId;
        saveLocalState(parsed);
        return true;
      }
    } catch (e) {
      console.error("Join sync error:", e);
    }

    // Fallback: set local syncId and attempt to push
    const local = loadLocalState();
    local.syncId = cleanId;
    saveLocalState(local);
    await pushToServer(local);
    return true;
  },

  createCustomSyncSession: async (customId: string): Promise<boolean> => {
    const cleanId = customId.trim();
    if (!cleanId) return false;

    const currentState = loadLocalState();
    currentState.syncId = cleanId;
    saveLocalState(currentState);
    await pushToServer(currentState);
    return true;
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
    const service = serviceName || 'خدمات عامة';
    const local = loadLocalState();
    const syncId = local.syncId;

    // 1. Try atomic server endpoint first
    try {
      const res = await fetch('/api/queue/customer/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId, serviceName: service })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.customer) {
          const parsedCustomer: Customer = {
            ...data.customer,
            requestTime: new Date(data.customer.requestTime)
          };
          if (data.state) {
            const parsedState = parseDatesInState(data.state);
            saveLocalState(parsedState);
          }
          return parsedCustomer;
        }
      }
    } catch (e) {
      console.warn("Direct customer add API failed, using local offline fallback", e);
    }

    // 2. Safe local / offline fallback
    const state = await api.getState();
    const prefix = getServicePrefix(service);

    let maxExisting = 99;
    if (Array.isArray(state.customers)) {
      for (const c of state.customers) {
        if (c && c.ticketNumber) {
          const match = String(c.ticketNumber).match(/\d+$/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (!isNaN(num) && num > maxExisting) {
              maxExisting = num;
            }
          }
        }
      }
    }

    const currentCounter = Number(state.ticketCounter) || 100;
    const nextTicketNumber = Math.max(currentCounter, maxExisting + 1);
    state.ticketCounter = nextTicketNumber + 1;

    const newCustomer: Customer = {
      id: Date.now(),
      ticketNumber: `${prefix}-${nextTicketNumber}`,
      requestTime: new Date(),
      status: CustomerStatus.Waiting,
      serviceName: service
    };

    if (!Array.isArray(state.customers)) state.customers = [];
    if (!Array.isArray(state.queue)) state.queue = [];
    state.customers.push(newCustomer);
    state.queue.push(newCustomer.id);
    saveLocalState(state);
    await pushToServer(state);
    return newCustomer;
  },

  updatePrinterConfig: async (config: PrinterConfig): Promise<void> => {
    const state = await api.getState();
    state.printerConfig = config;
    saveLocalState(state);
    await pushToServer(state);
  },
  
  callNextCustomer: async (employeeId: number): Promise<boolean> => {
    const state = await api.getState();
    const employee = state.employees.find(e => e.id === employeeId);
    if (!employee || employee.status === EmployeeStatus.Busy || !employee.windowId) return false;
    const window = state.windows.find(w => w.id === employee.windowId);
    if (!window) return false;

    const windowTask = window.customTask || 'خدمات عامة';
    let queueIndex = windowTask !== 'خدمات عامة' 
        ? state.queue.findIndex(id => state.customers.find(c => c.id === id)?.serviceName === windowTask)
        : 0;

    if (queueIndex === -1) return false;

    const nextId = state.queue.splice(queueIndex, 1)[0];
    state.customers = state.customers.map(c => c.id === nextId ? { ...c, status: CustomerStatus.Serving, callTime: new Date(), servedBy: employeeId, windowId: employee.windowId } : c);
    state.employees = state.employees.map(e => e.id === employeeId ? { ...e, status: EmployeeStatus.Busy } : e);
    state.windows = state.windows.map(w => w.id === employee.windowId ? { ...w, currentCustomerId: nextId } : w);
    
    saveLocalState(state);
    await pushToServer(state);
    return true;
  },

  finishService: async (employeeId: number): Promise<boolean> => {
    const state = await api.getState();
    const employee = state.employees.find(e => e.id === employeeId);
    if (!employee || !employee.windowId) return false;
    const window = state.windows.find(w => w.id === employee.windowId);
    if (!window || !window.currentCustomerId) return false;

    const customerId = window.currentCustomerId;
    state.customers = state.customers.map(c => c.id === customerId ? { ...c, status: CustomerStatus.Served, finishTime: new Date() } : c);
    state.employees = state.employees.map(e => e.id === employeeId ? { ...e, status: EmployeeStatus.Available, customersServed: e.customersServed + 1 } : e);
    state.windows = state.windows.map(w => w.id === employee.windowId ? { ...w, currentCustomerId: undefined } : w);

    saveLocalState(state);
    await pushToServer(state);
    return true;
  },

  assignEmployeeToWindow: async (employeeId: number, windowId: number): Promise<void> => {
    const state = await api.getState();
    state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
    state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: windowId } : e);
    state.windows = state.windows.map(w => w.id === windowId ? { ...w, employeeId: employeeId } : w);
    saveLocalState(state);
    await pushToServer(state);
  },

  unassignEmployeeFromWindow: async (employeeId: number): Promise<void> => {
    const state = await api.getState();
    state.windows = state.windows.map(w => w.employeeId === employeeId ? {...w, employeeId: undefined} : w);
    state.employees = state.employees.map(e => e.id === employeeId ? { ...e, windowId: undefined } : e);
    saveLocalState(state);
    await pushToServer(state);
  },
  
  addEmployee: async (name: string, username: string, password: string): Promise<Employee> => {
    const state = await api.getState();
    const newEmp: Employee = { id: Date.now(), name, username, password, status: EmployeeStatus.Available, customersServed: 0 };
    state.employees.push(newEmp);
    saveLocalState(state);
    await pushToServer(state);
    return newEmp;
  },

  updateEmployee: async (id: number, name: string, username: string, password?: string): Promise<void> => {
    const state = await api.getState();
    state.employees = state.employees.map(e => e.id === id ? { ...e, name, username, ...(password ? { password } : {}) } : e);
    saveLocalState(state);
    await pushToServer(state);
  },

  removeEmployee: async (id: number): Promise<void> => {
    const state = await api.getState();
    state.employees = state.employees.filter(e => e.id !== id);
    saveLocalState(state);
    await pushToServer(state);
  },

  addWindow: async (name: string, customTask?: string): Promise<Window> => {
    const state = await api.getState();
    const newWin: Window = { id: Date.now(), name, customTask };
    state.windows.push(newWin);
    saveLocalState(state);
    await pushToServer(state);
    return newWin;
  },

  updateWindowName: async (id: number, name: string): Promise<void> => {
    const state = await api.getState();
    state.windows = state.windows.map(w => w.id === id ? {...w, name} : w);
    saveLocalState(state);
    await pushToServer(state);
  },

  removeWindow: async (id: number): Promise<void> => {
    const state = await api.getState();
    state.windows = state.windows.filter(w => w.id !== id);
    saveLocalState(state);
    await pushToServer(state);
  },

  updateWindowTask: async (id: number, task: string): Promise<void> => {
    const state = await api.getState();
    state.windows = state.windows.map(w => w.id === id ? {...w, customTask: task} : w);
    saveLocalState(state);
    await pushToServer(state);
  },

  rateCustomer: async (customerId: number, rating: number, feedback?: string): Promise<void> => {
    const state = await api.getState();
    state.customers = state.customers.map(c => c.id === customerId ? { ...c, rating, feedback } : c);
    saveLocalState(state);
    await pushToServer(state);
  },

  resetSystem: async (): Promise<void> => {
    const state = await api.getState();
    state.customers = [];
    state.queue = [];
    state.ticketCounter = 100;
    state.windows = state.windows.map(w => ({ ...w, currentCustomerId: undefined, employeeId: undefined }));
    state.employees = state.employees.map(e => ({ ...e, windowId: undefined, status: EmployeeStatus.Available, customersServed: 0 }));
    state.chatMessages = [];
    saveLocalState(state);
    await pushToServer(state);
  },

  sendChatMessage: async (windowId: number, senderType: 'admin' | 'window', senderName: string, text: string): Promise<ChatMessage> => {
    const local = loadLocalState();
    const syncId = local.syncId;

    // Try server endpoint first
    try {
      const res = await fetch('/api/queue/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId, windowId, senderType, senderName, text })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.message) {
          if (!Array.isArray(local.chatMessages)) local.chatMessages = [];
          local.chatMessages.push(body.message);
          saveLocalState(local);
          return body.message;
        }
      }
    } catch (e) {
      // Offline fallback
    }

    if (!Array.isArray(local.chatMessages)) local.chatMessages = [];
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      windowId: Number(windowId),
      senderType,
      senderName,
      text: text.trim(),
      timestamp: Date.now(),
      readByAdmin: senderType === 'admin',
      readByWindow: senderType === 'window'
    };
    local.chatMessages.push(newMessage);
    if (local.chatMessages.length > 500) {
      local.chatMessages = local.chatMessages.slice(-500);
    }
    saveLocalState(local);
    await pushToServer(local);
    return newMessage;
  },

  broadcastChatMessage: async (senderName: string, text: string): Promise<void> => {
    const local = loadLocalState();
    const syncId = local.syncId;

    try {
      const res = await fetch('/api/queue/chat/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId, senderName, text })
      });
      if (res.ok) {
        return;
      }
    } catch (e) {
      // Offline fallback
    }

    if (!Array.isArray(local.chatMessages)) local.chatMessages = [];
    const trimmed = text.trim();
    if (!trimmed || local.windows.length === 0) return;

    local.windows.forEach(win => {
      local.chatMessages.push({
        id: `msg_bcast_${Date.now()}_${win.id}_${Math.random().toString(36).substring(2, 5)}`,
        windowId: Number(win.id),
        senderType: 'admin',
        senderName: senderName || 'الإدارة (تعميم عام)',
        text: `📢 [تعميم لكافة الشبابيك]: ${trimmed}`,
        timestamp: Date.now(),
        readByAdmin: true,
        readByWindow: false
      });
    });

    if (local.chatMessages.length > 500) {
      local.chatMessages = local.chatMessages.slice(-500);
    }
    saveLocalState(local);
    await pushToServer(local);
  },

  markChatMessagesAsRead: async (windowId: number, readerType: 'admin' | 'window'): Promise<void> => {
    const local = loadLocalState();
    const syncId = local.syncId;

    try {
      await fetch('/api/queue/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId, windowId, readerType })
      });
    } catch (e) {
      // Offline fallback
    }

    if (Array.isArray(local.chatMessages) && local.chatMessages.length > 0) {
      let changed = false;
      const targetId = Number(windowId);
      local.chatMessages.forEach(msg => {
        if (Number(msg.windowId) === targetId) {
          if (readerType === 'admin' && !msg.readByAdmin) {
            msg.readByAdmin = true;
            changed = true;
          } else if (readerType === 'window' && !msg.readByWindow) {
            msg.readByWindow = true;
            changed = true;
          }
        }
      });
      if (changed) {
        saveLocalState(local);
      }
    }
  },

  clearChatHistory: async (windowId?: number): Promise<void> => {
    const local = loadLocalState();
    const syncId = local.syncId;

    try {
      await fetch('/api/queue/chat/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncId, windowId })
      });
    } catch (e) {
      // Offline fallback
    }

    if (Array.isArray(local.chatMessages)) {
      if (windowId !== undefined && windowId !== null) {
        const targetId = Number(windowId);
        local.chatMessages = local.chatMessages.filter(m => Number(m.windowId) !== targetId);
      } else {
        local.chatMessages = [];
      }
      saveLocalState(local);
    }
  }
};

export default api;
