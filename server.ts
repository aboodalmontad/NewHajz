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

  // Fallback to localhost if no external LAN interface is found
  if (addresses.length === 0) {
    addresses.push('localhost');
  }

  return addresses;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Connected clients tracker
  interface ClientSession {
    ws: WebSocket;
    device: ConnectedDevice;
    clientIp: string;
    lastPing: number;
  }
  const clients = new Map<string, ClientSession>();

  function getDeviceList(): ConnectedDevice[] {
    return Array.from(clients.values()).map(c => c.device);
  }

  function broadcast(msg: LanMessage, excludeDeviceId?: string) {
    const data = JSON.stringify(msg);
    clients.forEach((client, id) => {
      if (excludeDeviceId && id === excludeDeviceId) return;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  function sendTo(deviceId: string, msg: LanMessage): boolean {
    const client = clients.get(deviceId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  // WebSocket connection handler
  wss.on('connection', (ws: WebSocket, req) => {
    let currentDeviceId: string | null = null;
    const remoteIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    ws.on('message', (rawData: string) => {
      try {
        const msg: LanMessage = JSON.parse(rawData.toString());

        switch (msg.type) {
          case 'REGISTER_DEVICE': {
            const dev = msg.device;
            currentDeviceId = dev.id;
            dev.ip = remoteIp.replace('::ffff:', '');
            dev.lastSeen = Date.now();
            dev.status = 'online';

            clients.set(dev.id, {
              ws,
              device: dev,
              clientIp: dev.ip,
              lastPing: Date.now()
            });

            // Send full current state to newly joined client
            ws.send(JSON.stringify({
              type: 'STATE_UPDATE',
              state: currentQueueState
            }));

            // Broadcast updated device list to everyone
            const devList = getDeviceList();
            broadcast({
              type: 'DEVICE_LIST',
              devices: devList
            });
            break;
          }

          case 'PING': {
            const now = Date.now();
            if (msg.toId) {
              // Direct ping to another device
              sendTo(msg.toId, msg);
            } else {
              // Ping to server/network
              ws.send(JSON.stringify({
                type: 'PONG',
                pingId: msg.pingId,
                fromId: 'SERVER',
                toId: msg.fromId,
                originalTimestamp: msg.timestamp,
                serverTimestamp: now
              }));
            }
            if (currentDeviceId && clients.has(currentDeviceId)) {
              clients.get(currentDeviceId)!.lastPing = now;
              clients.get(currentDeviceId)!.device.lastSeen = now;
            }
            break;
          }

          case 'PONG': {
            // Forward pong response back to requesting device
            sendTo(msg.toId, msg);
            break;
          }

          case 'CONFIRM_REQUEST': {
            // Route confirmation request to target device (or all devices if no toDeviceId)
            if (msg.toDeviceId) {
              sendTo(msg.toDeviceId, msg);
            } else {
              broadcast(msg, msg.fromDevice.id);
            }
            break;
          }

          case 'CONFIRM_RESPONSE': {
            // Forward ACK back to original requester
            sendTo(msg.toDeviceId, msg);
            break;
          }

          case 'STATE_UPDATE': {
            // Authoritative state update
            persistState(msg.state);
            broadcast(msg, msg.sourceDeviceId);
            break;
          }

          case 'CALL_NOTIFICATION': {
            // Broadcast customer call notification to screens & employee devices
            broadcast(msg);
            break;
          }

          case 'BROADCAST_CHAT': {
            broadcast(msg);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      if (currentDeviceId && clients.has(currentDeviceId)) {
        clients.delete(currentDeviceId);
        broadcast({
          type: 'DEVICE_LEFT',
          deviceId: currentDeviceId
        });
        broadcast({
          type: 'DEVICE_LIST',
          devices: getDeviceList()
        });
      }
    });

    ws.on('error', (err) => {
      console.warn('WebSocket client error:', err.message);
    });
  });

  // REST API Endpoints
  app.get('/api/network-info', (req, res) => {
    const localIps = getLocalIpAddresses();
    const hostHeader = req.headers.host || '';
    const protocol = req.protocol || 'http';
    
    // Choose primary LAN IP (first non-localhost or localhost)
    const primaryIp = localIps.find(ip => ip !== 'localhost') || localIps[0] || 'localhost';
    const primaryLanUrl = hostHeader.includes(':') 
      ? `${protocol}://${primaryIp}:${PORT}` 
      : `${protocol}://${hostHeader}`;

    res.json({
      localIps,
      port: PORT,
      serverTime: Date.now(),
      connectedClientsCount: clients.size,
      connectedDevices: getDeviceList(),
      roomPin: currentQueueState.roomPin || '8240',
      primaryLanUrl
    });
  });

  app.get('/api/state', (_req, res) => {
    res.json(currentQueueState);
  });

  app.post('/api/state', (req, res) => {
    try {
      const newState = req.body;
      if (newState) {
        persistState(newState);
        // Broadcast update via WebSocket
        broadcast({
          type: 'STATE_UPDATE',
          state: newState
        });
      }
      res.json({ success: true, state: currentQueueState });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // In Development, attach Vite middleware
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    console.log(`\n=================================================`);
    console.log(`🚀 خادم الشبكة المحلية يعمل على المنفذ: ${PORT}`);
    console.log(`📱 عناوين الشبكة المحلية (LAN Addresses):`);
    ips.forEach(ip => {
      console.log(`   - http://${ip}:${PORT}`);
    });
    console.log(`=================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
