import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Data Directory for persistence
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Error creating data dir:', e);
  }
}
const DATA_FILE = path.join(DATA_DIR, 'queue-state.json');

// Default initial state
const DEFAULT_STATE = {
  windows: [
    { id: 1, name: 'شباك 1', customTask: 'استقبال' },
    { id: 2, name: 'شباك 2', customTask: 'فتح حساب جديد' },
    { id: 3, name: 'شباك 3', customTask: 'خدمات العملاء' },
    { id: 4, name: 'شباك 4' },
  ],
  employees: [
    { id: 1, name: 'أحمد', username: 'ahmad', password: '123', status: 'متاح', customersServed: 0 },
    { id: 2, name: 'فاطمة', username: 'fatima', password: '123', status: 'متاح', customersServed: 0 },
    { id: 3, name: 'يوسف', username: 'yousef', password: '123', status: 'متاح', customersServed: 0 },
    { id: 4, name: 'ليلى', username: 'layla', password: '123', status: 'متاح', customersServed: 0 },
  ],
  customers: [],
  queue: [],
  ticketCounter: 100,
  printerConfig: {
    paperWidth: '80mm',
    headerText: 'نظام الطابور الذكي',
    headerFontSize: 20,
    numberFontSize: 70,
    detailsFontSize: 14,
    footerText: 'شكراً لزيارتكم',
    showDate: true,
    autoPrint: true
  },
  chatMessages: []
};

// Rooms storage in-memory with file backup
const rooms = new Map<string, any>();

// Load state from file if exists
const loadPersistedRooms = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([code, state]) => {
          rooms.set(code, state);
        });
      }
    }
  } catch (e) {
    console.warn('Could not read state file, initializing fresh:', e);
  }

  // Ensure default room exists
  if (!rooms.has('default')) {
    rooms.set('default', JSON.parse(JSON.stringify(DEFAULT_STATE)));
  }
};

loadPersistedRooms();

const persistRooms = () => {
  try {
    const obj: Record<string, any> = {};
    rooms.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error persisting state to file:', e);
  }
};

// SSE connections map: roomId -> Set of Response objects
const sseSubscribers = new Map<string, Set<Response>>();

const broadcastStateToRoom = (roomId: string, state: any) => {
  const clients = sseSubscribers.get(roomId);
  if (!clients || clients.size === 0) return;

  const payload = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch (e) {
      clients.delete(client);
    }
  }
};

const getRoomState = (roomId?: string) => {
  const key = (roomId && roomId.trim()) ? roomId.trim() : 'default';
  if (!rooms.has(key)) {
    // Clone default state for new room
    const clone = JSON.parse(JSON.stringify(DEFAULT_STATE));
    clone.syncId = key === 'default' ? undefined : key;
    rooms.set(key, clone);
    persistRooms();
  }
  return { key, state: rooms.get(key) };
};

// Detect local IPv4 addresses for LAN display
const getLocalIpAddresses = () => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
};

// API ROUTES
app.get('/api/network-info', (_req: Request, res: Response) => {
  const localIps = getLocalIpAddresses();
  const activeRooms = Array.from(rooms.keys()).filter(k => k !== 'default');
  res.json({
    localIps,
    port: PORT,
    activeRooms,
    serverTime: Date.now()
  });
});

app.get('/api/queue/state', (req: Request, res: Response) => {
  const syncId = req.query.syncId as string | undefined;
  const { state } = getRoomState(syncId);
  res.json(state);
});

const getServicePrefix = (serviceName?: string): string => {
  const name = (serviceName || '').toLowerCase();
  if (name.includes('استقبال')) return 'A';
  if (name.includes('حساب')) return 'B';
  if (name.includes('عملاء')) return 'C';
  if (name.includes('صراف') || name.includes('مالية') || name.includes('سحب')) return 'D';
  return 'S';
};

// Atomic customer ticket issuance to prevent any duplicates or race conditions
app.post('/api/queue/customer/add', (req: Request, res: Response) => {
  const { syncId, serviceName } = req.body;
  const { key, state } = getRoomState(syncId);

  if (!Array.isArray(state.customers)) state.customers = [];
  if (!Array.isArray(state.queue)) state.queue = [];

  // Determine the highest existing ticket number across all historical/active customers
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

  // Ensure next ticket number is strictly greater than both maxExisting and current ticketCounter
  const currentCounter = Number(state.ticketCounter) || 100;
  const nextTicketNumber = Math.max(currentCounter, maxExisting + 1);
  state.ticketCounter = nextTicketNumber + 1;

  const service = serviceName || 'خدمات عامة';
  const prefix = getServicePrefix(service);

  const newCustomer = {
    id: Date.now(),
    ticketNumber: `${prefix}-${nextTicketNumber}`,
    requestTime: new Date().toISOString(),
    status: 'بالانتظار',
    serviceName: service
  };

  state.customers.push(newCustomer);
  state.queue.push(newCustomer.id);

  rooms.set(key, state);
  persistRooms();
  broadcastStateToRoom(key, state);

  res.json({ success: true, customer: newCustomer, state });
});

app.post('/api/queue/state', (req: Request, res: Response) => {
  const syncId = (req.body.syncId || req.query.syncId) as string | undefined;
  const incomingState = req.body.state || req.body;
  if (!incomingState || typeof incomingState !== 'object') {
    return res.status(400).json({ error: 'Invalid state body' });
  }

  const { key } = getRoomState(syncId);

  // Guarantee that ticketCounter cannot be regressed if customers exist
  if (Array.isArray(incomingState.customers)) {
    let maxExisting = 99;
    for (const c of incomingState.customers) {
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
    const incomingCounter = Number(incomingState.ticketCounter) || 100;
    if (incomingCounter <= maxExisting) {
      incomingState.ticketCounter = maxExisting + 1;
    }
  }

  rooms.set(key, incomingState);
  persistRooms();
  broadcastStateToRoom(key, incomingState);

  res.json({ success: true, syncId: key });
});

// Direct chat message sending
app.post('/api/queue/chat/send', (req: Request, res: Response) => {
  const { syncId, windowId, senderType, senderName, text } = req.body;
  if (!windowId || !text || !senderType) {
    return res.status(400).json({ error: 'Missing chat parameters' });
  }

  const { key, state } = getRoomState(syncId);
  if (!Array.isArray(state.chatMessages)) {
    state.chatMessages = [];
  }

  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    windowId: Number(windowId),
    senderType,
    senderName: senderName || (senderType === 'admin' ? 'الإدارة' : `شباك ${windowId}`),
    text: String(text).trim(),
    timestamp: Date.now(),
    readByAdmin: senderType === 'admin',
    readByWindow: senderType === 'window'
  };

  state.chatMessages.push(newMsg);
  if (state.chatMessages.length > 500) {
    state.chatMessages = state.chatMessages.slice(-500);
  }

  rooms.set(key, state);
  persistRooms();
  broadcastStateToRoom(key, state);

  res.json({ success: true, message: newMsg });
});

// Mark chat messages as read
app.post('/api/queue/chat/read', (req: Request, res: Response) => {
  const { syncId, windowId, readerType } = req.body;
  const { key, state } = getRoomState(syncId);

  if (Array.isArray(state.chatMessages) && windowId) {
    let changed = false;
    const targetWinId = Number(windowId);
    state.chatMessages.forEach((msg: any) => {
      if (Number(msg.windowId) === targetWinId) {
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
      rooms.set(key, state);
      persistRooms();
      broadcastStateToRoom(key, state);
    }
  }

  res.json({ success: true });
});

// Broadcast announcement to all windows
app.post('/api/queue/chat/broadcast', (req: Request, res: Response) => {
  const { syncId, senderName, text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing announcement text' });
  }

  const { key, state } = getRoomState(syncId);
  if (!Array.isArray(state.chatMessages)) {
    state.chatMessages = [];
  }

  const windows = Array.isArray(state.windows) ? state.windows : [];
  const trimmed = text.trim();

  windows.forEach((win: any) => {
    state.chatMessages.push({
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

  if (state.chatMessages.length > 500) {
    state.chatMessages = state.chatMessages.slice(-500);
  }

  rooms.set(key, state);
  persistRooms();
  broadcastStateToRoom(key, state);

  res.json({ success: true });
});

// Clear chat history
app.post('/api/queue/chat/clear', (req: Request, res: Response) => {
  const { syncId, windowId } = req.body;
  const { key, state } = getRoomState(syncId);

  if (Array.isArray(state.chatMessages)) {
    if (windowId !== undefined && windowId !== null) {
      const targetWinId = Number(windowId);
      state.chatMessages = state.chatMessages.filter((m: any) => Number(m.windowId) !== targetWinId);
    } else {
      state.chatMessages = [];
    }

    rooms.set(key, state);
    persistRooms();
    broadcastStateToRoom(key, state);
  }

  res.json({ success: true });
});

// SSE Events stream endpoint for live real-time sync across devices on the LAN
app.get('/api/queue/events', (req: Request, res: Response) => {
  const syncId = req.query.syncId as string | undefined;
  const { key, state } = getRoomState(syncId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseSubscribers.has(key)) {
    sseSubscribers.set(key, new Set());
  }
  const clientSet = sseSubscribers.get(key)!;
  clientSet.add(res);

  // Send current state immediately on connect
  res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);

  // Keep alive ping every 15 seconds
  const pingInterval = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (e) {
      clearInterval(pingInterval);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clientSet.delete(res);
  });
});

// START SERVER
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const localIps = getLocalIpAddresses();
    console.log(`🚀 Smart Queue Server running on port ${PORT}`);
    console.log(`📡 Localhost: http://localhost:${PORT}`);
    localIps.forEach(ip => {
      console.log(`🌐 Local Network (LAN): http://${ip}:${PORT}`);
    });
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
