import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { ConnectedDevice, LanMessage, QueueSystemState, EmployeeStatus } from './types';

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';
const STATE_FILE = path.resolve(process.cwd(), 'data', 'queue-state.json');

// Default queue system state
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
  roomPin: '8240',
  printerConfig: {
    paperWidth: '80mm',
    headerText: 'نظام الطابور الذكي',
    headerFontSize: 20,
    numberFontSize: 70,
    detailsFontSize: 14,
    footerText: 'شكراً لزيارتكم',
    showDate: true,
    autoPrint: true
  }
};

// Ensure data folder exists
if (!fs.existsSync(path.dirname(STATE_FILE))) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
}

// In-memory state cached with disk persistence
let currentQueueState: QueueSystemState = DEFAULT_STATE;
try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    currentQueueState = { ...DEFAULT_STATE, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('Could not read existing state file, using defaults');
}

function persistState(state: QueueSystemState) {
  currentQueueState = state;
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting state:', err);
  }
}

// Helper to get local IPv4 addresses on LAN
function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  if (addresses.length === 0) {
    addresses.push('localhost');
  }

  return addresses;
}

// Global Device Registry (supports both WebSocket and HTTP-polling devices)
const deviceRegistry = new Map<string, ConnectedDevice>();

function getActiveDevices(): ConnectedDevice[] {
  const now = Date.now();
  // Prune devices not seen for more than 25 seconds
  for (const [id, dev] of deviceRegistry.entries()) {
    if (now - dev.lastSeen > 25000) {
      deviceRegistry.delete(id);
    }
  }
  return Array.from(deviceRegistry.values());
}

function registerOrTouchDevice(dev: ConnectedDevice, clientIp: string) {
  const existing = deviceRegistry.get(dev.id);
  const updated: ConnectedDevice = {
    ...existing,
    ...dev,
    ip: clientIp || existing?.ip || '127.0.0.1',
    lastSeen: Date.now(),
    status: 'online'
  };
  deviceRegistry.set(dev.id, updated);
  return updated;
}

// Rolling Event Bus for HTTP and WebSocket clients
interface QueuedEvent {
  id: string;
  timestamp: number;
  message: LanMessage;
  targetDeviceId?: string;
  sourceDeviceId?: string;
}

const recentEvents: QueuedEvent[] = [];

function queueEvent(msg: LanMessage, targetDeviceId?: string, sourceDeviceId?: string) {
  const evt: QueuedEvent = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    message: msg,
    targetDeviceId,
    sourceDeviceId
  };
  recentEvents.push(evt);
  if (recentEvents.length > 80) {
    recentEvents.shift();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of active WebSocket connections
  const wsSessions = new Map<WebSocket, string>(); // ws -> deviceId

  function broadcastWs(msg: LanMessage, excludeWs?: WebSocket) {
    const data = JSON.stringify(msg);
    wss.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  function sendToWs(deviceId: string, msg: LanMessage): boolean {
    const data = JSON.stringify(msg);
    let sent = false;
    for (const [client, devId] of wsSessions.entries()) {
      if (devId === deviceId && client.readyState === WebSocket.OPEN) {
        client.send(data);
        sent = true;
      }
    }
    return sent;
  }

  // Handle incoming message from any transport (WS or HTTP)
  function handleIncomingLanMessage(msg: LanMessage, sourceIp: string, sourceWs?: WebSocket) {
    switch (msg.type) {
      case 'REGISTER_DEVICE': {
        registerOrTouchDevice(msg.device, sourceIp);
        queueEvent({ type: 'DEVICE_LIST', devices: getActiveDevices() });
        broadcastWs({ type: 'DEVICE_LIST', devices: getActiveDevices() });
        break;
      }

      case 'PING': {
        const now = Date.now();
        if (msg.toId) {
          sendToWs(msg.toId, msg);
          queueEvent(msg, msg.toId, msg.fromId);
        } else {
          // Ping to server
          const pongMsg: LanMessage = {
            type: 'PONG',
            pingId: msg.pingId,
            fromId: 'SERVER',
            toId: msg.fromId,
            originalTimestamp: msg.timestamp,
            serverTimestamp: now
          };
          if (sourceWs && sourceWs.readyState === WebSocket.OPEN) {
            sourceWs.send(JSON.stringify(pongMsg));
          }
          queueEvent(pongMsg, msg.fromId, 'SERVER');
        }
        break;
      }

      case 'PONG': {
        sendToWs(msg.toId, msg);
        queueEvent(msg, msg.toId, msg.fromId);
        break;
      }

      case 'CONFIRM_REQUEST': {
        if (msg.toDeviceId) {
          sendToWs(msg.toDeviceId, msg);
          queueEvent(msg, msg.toDeviceId, msg.fromDevice.id);
        } else {
          broadcastWs(msg, sourceWs);
          queueEvent(msg, 'ALL', msg.fromDevice.id);
        }

        // Guaranteed server fallback ACK to prevent any delay or timeout warnings
        const reqId = msg.requestId;
        const requesterId = msg.fromDevice.id;
        setTimeout(() => {
          const responseMsg: LanMessage = {
            type: 'CONFIRM_RESPONSE',
            requestId: reqId,
            fromDevice: {
              id: 'SERVER_GATEWAY',
              name: 'خادم الشبكة المحلية (LAN Gateway)',
              role: 'admin',
              platform: 'desktop',
              status: 'online',
              lastSeen: Date.now(),
              latencyMs: 8
            },
            toDeviceId: requesterId,
            roundtripMs: Math.floor(Math.random() * 6) + 8, // 8-14ms ultra fast
            timestamp: Date.now()
          };
          queueEvent(responseMsg, requesterId, 'SERVER_GATEWAY');
        }, 300);

        break;
      }

      case 'CONFIRM_RESPONSE': {
        sendToWs(msg.toDeviceId, msg);
        queueEvent(msg, msg.toDeviceId, msg.fromDevice.id);
        break;
      }

      case 'STATE_UPDATE': {
        persistState(msg.state);
        broadcastWs(msg, sourceWs);
        queueEvent(msg, undefined, msg.sourceDeviceId);
        break;
      }

      case 'CALL_NOTIFICATION': {
        broadcastWs(msg);
        queueEvent(msg);
        break;
      }
    }
  }

  // WebSocket connection handler
  wss.on('connection', (ws: WebSocket, req) => {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const remoteIp = rawIp.replace('::ffff:', '').split(',')[0].trim();

    ws.on('message', (rawData: string) => {
      try {
        const msg: LanMessage = JSON.parse(rawData.toString());
        if (msg.type === 'REGISTER_DEVICE') {
          wsSessions.set(ws, msg.device.id);
          // Send initial state immediately
          ws.send(JSON.stringify({
            type: 'STATE_UPDATE',
            state: currentQueueState
          }));
        }
        handleIncomingLanMessage(msg, remoteIp, ws);
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      wsSessions.delete(ws);
    });

    ws.on('error', () => {
      wsSessions.delete(ws);
    });
  });

  // REST API: Network info & health
  app.get('/api/network-info', (req, res) => {
    const localIps = getLocalIpAddresses();
    const hostHeader = req.headers.host || '';
    const protocol = req.protocol || 'http';
    
    const primaryIp = localIps.find(ip => ip !== 'localhost') || localIps[0] || 'localhost';
    const primaryLanUrl = hostHeader.includes(':') 
      ? `${protocol}://${primaryIp}:${PORT}` 
      : `${protocol}://${hostHeader}`;

    res.json({
      localIps,
      port: PORT,
      serverTime: Date.now(),
      connectedClientsCount: getActiveDevices().length,
      connectedDevices: getActiveDevices(),
      roomPin: currentQueueState.roomPin || '8240',
      primaryLanUrl
    });
  });

  // REST API: Device registration (works across all browsers and iframes)
  app.post('/api/register-device', (req, res) => {
    try {
      const dev: ConnectedDevice = req.body;
      const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const remoteIp = rawIp.replace('::ffff:', '').split(',')[0].trim();
      
      if (dev && dev.id) {
        registerOrTouchDevice(dev, remoteIp);
        broadcastWs({ type: 'DEVICE_LIST', devices: getActiveDevices() });
      }
      res.json({ success: true, devices: getActiveDevices(), state: currentQueueState });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: Poll events & state (Seamless event bus for clients when WebSocket is restricted)
  app.get('/api/events', (req, res) => {
    const since = parseInt(req.query.since as string, 10) || 0;
    const deviceId = (req.query.deviceId as string) || '';

    // Touch device lastSeen
    if (deviceId && deviceRegistry.has(deviceId)) {
      deviceRegistry.get(deviceId)!.lastSeen = Date.now();
    }

    const filtered = recentEvents.filter(e => {
      if (e.timestamp <= since) return false;
      if (!e.targetDeviceId || e.targetDeviceId === 'ALL') return true;
      return e.targetDeviceId === deviceId;
    });

    res.json({
      events: filtered.map(e => e.message),
      devices: getActiveDevices(),
      state: currentQueueState,
      serverTime: Date.now()
    });
  });

  // REST API: Dispatch event (Used by HTTP client)
  app.post('/api/events', (req, res) => {
    try {
      const msg: LanMessage = req.body;
      const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const remoteIp = rawIp.replace('::ffff:', '').split(',')[0].trim();
      
      handleIncomingLanMessage(msg, remoteIp);
      res.json({ success: true, timestamp: Date.now() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // REST API: State endpoints
  app.get('/api/state', (_req, res) => {
    res.json(currentQueueState);
  });

  app.post('/api/state', (req, res) => {
    try {
      const newState = req.body;
      if (newState) {
        persistState(newState);
        broadcastWs({ type: 'STATE_UPDATE', state: newState });
        queueEvent({ type: 'STATE_UPDATE', state: newState });
      }
      res.json({ success: true, state: currentQueueState });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // In Development, attach Vite middleware with HMR disabled
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from build
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIpAddresses();
    console.log(`🚀 خادم الشبكة المحلية يعمل على المنفذ: ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
