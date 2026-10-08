import { ConnectedDevice, DeviceRole, DevicePlatform, LanMessage, ConnectionTestLog, QueueSystemState } from '../types';
import { sounds } from './audio';

export type LanConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'fallback_local';

export interface ConfirmationAlert {
  id: string;
  fromName: string;
  fromRole: string;
  timestamp: number;
  note?: string;
}

type MessageListener = (msg: LanMessage) => void;
type StatusListener = (status: LanConnectionStatus) => void;
type DeviceListListener = (devices: ConnectedDevice[]) => void;
type ConfirmAlertListener = (alert: ConfirmationAlert) => void;

class LanClientManager {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private device: ConnectedDevice;
  private status: LanConnectionStatus = 'disconnected';
  private connectedDevices: ConnectedDevice[] = [];
  private testLogs: ConnectionTestLog[] = [];
  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private deviceListListeners: Set<DeviceListListener> = new Set();
  private confirmAlertListeners: Set<ConfirmAlertListener> = new Set();
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private pendingPings = new Map<string, { timestamp: number; toId: string; toName: string }>();
  private pendingConfirmations = new Map<string, { timestamp: number; toId: string; toName: string; resolve: (log: ConnectionTestLog) => void }>();

  constructor() {
    this.device = this.initDeviceIdentity();
    this.initBroadcastChannel();
  }

  private initDeviceIdentity(): ConnectedDevice {
    const storedId = localStorage.getItem('lan_device_id');
    const deviceId = storedId || 'dev_' + Math.random().toString(36).substring(2, 9);
    if (!storedId) {
      localStorage.setItem('lan_device_id', deviceId);
    }

    const storedName = localStorage.getItem('lan_device_name');
    const storedRole = (localStorage.getItem('lan_device_role') as DeviceRole) || 'display';

    let platform: DevicePlatform = 'desktop';
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/tablet|ipad/.test(ua)) platform = 'tablet';
      else if (/mobile|android|iphone/.test(ua)) platform = 'mobile';
    }

    const defaultName = platform === 'mobile' 
      ? 'هاتف ذكي' 
      : platform === 'tablet' 
      ? 'جهاز لوحي (تابلت)' 
      : 'جهاز حاسوب محلي';

    return {
      id: deviceId,
      name: storedName || `${defaultName} (${deviceId.slice(-4)})`,
      role: storedRole,
      platform,
      status: 'online',
      lastSeen: Date.now(),
      latencyMs: 0
    };
  }

  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.bc = new BroadcastChannel('lan_queue_mesh');
        this.bc.onmessage = (event) => {
          this.handleIncomingMessage(event.data);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }
  }

  public getDevice(): ConnectedDevice {
    return this.device;
  }

  public getStatus(): LanConnectionStatus {
    return this.status;
  }

  public getConnectedDevices(): ConnectedDevice[] {
    return this.connectedDevices;
  }

  public getTestLogs(): ConnectionTestLog[] {
    return this.testLogs;
  }

  public updateDeviceInfo(name: string, role: DeviceRole, employeeName?: string, windowId?: number) {
    this.device.name = name;
    this.device.role = role;
    this.device.employeeName = employeeName;
    this.device.windowId = windowId;

    localStorage.setItem('lan_device_name', name);
    localStorage.setItem('lan_device_role', role);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'REGISTER_DEVICE',
        device: this.device
      }));
    }

    if (this.bc) {
      this.bc.postMessage({
        type: 'REGISTER_DEVICE',
        device: this.device
      });
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }

    this.setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        // Register this device with server
        this.ws?.send(JSON.stringify({
          type: 'REGISTER_DEVICE',
          device: this.device
        }));

        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: LanMessage = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.error = () => {
        this.setStatus('disconnected');
      };
    } catch (err) {
      console.warn('WebSocket connect error, fallback to BroadcastChannel', err);
      this.setStatus('fallback_local');
    }
  }

  private setStatus(status: LanConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 4000);
    // Initial ping
    this.sendPing();
  }

  private stopHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  public sendPing(targetDeviceId?: string) {
    const pingId = 'ping_' + Math.random().toString(36).substring(2, 9);
    const now = Date.now();

    this.pendingPings.set(pingId, {
      timestamp: now,
      toId: targetDeviceId || 'SERVER',
      toName: targetDeviceId ? (this.connectedDevices.find(d => d.id === targetDeviceId)?.name || 'جهاز') : 'الخادم الرئيسي'
    });

    const pingMsg: LanMessage = {
      type: 'PING',
      pingId,
      fromId: this.device.id,
      toId: targetDeviceId,
      timestamp: now
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(pingMsg));
    }
    if (this.bc) {
      this.bc.postMessage(pingMsg);
    }
  }

  /**
   * The core feature requested: Send a two-way confirmation ping to test & confirm connection!
   */
  public async confirmConnectionWithDevice(targetDevice?: ConnectedDevice): Promise<ConnectionTestLog> {
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const toId = targetDevice ? targetDevice.id : 'ALL';
    const toName = targetDevice ? targetDevice.name : 'جميع الأجهزة المتصلة بالشبكة';

    return new Promise((resolve) => {
      // Set timeout for test
      const timeoutId = setTimeout(() => {
        if (this.pendingConfirmations.has(requestId)) {
          this.pendingConfirmations.delete(requestId);
          const failureLog: ConnectionTestLog = {
            id: requestId,
            fromId: this.device.id,
            fromName: this.device.name,
            toId,
            toName,
            latencyMs: 3000,
            status: 'timeout',
            timestamp: Date.now(),
            message: 'انتهت مهلة الانتظار - لم يتم استلام رد من الجهاز المستهدف'
          };
          this.testLogs.unshift(failureLog);
          resolve(failureLog);
        }
      }, 4000);

      this.pendingConfirmations.set(requestId, {
        timestamp: now,
        toId,
        toName,
        resolve: (log) => {
          clearTimeout(timeoutId);
          resolve(log);
        }
      });

      const confirmMsg: LanMessage = {
        type: 'CONFIRM_REQUEST',
        requestId,
        fromDevice: this.device,
        toDeviceId: targetDevice ? targetDevice.id : undefined,
        note: `إشارة تأكيد اتصال صادرة من ${this.device.name}`,
        timestamp: now
      };

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(confirmMsg));
      }
      if (this.bc) {
        this.bc.postMessage(confirmMsg);
      }
    });
  }

  private handleIncomingMessage(msg: LanMessage) {
    switch (msg.type) {
      case 'DEVICE_LIST': {
        this.connectedDevices = msg.devices.map(d => ({
          ...d,
          isHost: d.id === this.device.id
        }));
        this.deviceListListeners.forEach(l => l(this.connectedDevices));
        break;
      }

      case 'PING': {
        // If ping is addressed to this device, respond with PONG
        if (msg.toId === this.device.id || !msg.toId) {
          const pongMsg: LanMessage = {
            type: 'PONG',
            pingId: msg.pingId,
            fromId: this.device.id,
            toId: msg.fromId,
            originalTimestamp: msg.timestamp,
            serverTimestamp: Date.now()
          };
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(pongMsg));
          }
          if (this.bc) {
            this.bc.postMessage(pongMsg);
          }
        }
        break;
      }

      case 'PONG': {
        // Calculate latency
        const pending = this.pendingPings.get(msg.pingId);
        if (pending) {
          const latency = Math.max(1, Date.now() - pending.timestamp);
          this.device.latencyMs = latency;
          this.pendingPings.delete(msg.pingId);

          // Update device in list
          this.connectedDevices = this.connectedDevices.map(d => 
            d.id === msg.fromId ? { ...d, latencyMs: latency, lastSeen: Date.now() } : d
          );
          this.deviceListListeners.forEach(l => l(this.connectedDevices));
        }
        break;
      }

      case 'CONFIRM_REQUEST': {
        // Only react if this message came from another device
        if (msg.fromDevice.id !== this.device.id) {
          // Play pleasant confirmation sound!
          sounds.playConfirmChime();

          // Alert on screen
          const alert: ConfirmationAlert = {
            id: msg.requestId,
            fromName: msg.fromDevice.name,
            fromRole: msg.fromDevice.role,
            timestamp: msg.timestamp,
            note: msg.note
          };
          this.confirmAlertListeners.forEach(l => l(alert));

          // Send confirmation response (ACK) back
          const responseMsg: LanMessage = {
            type: 'CONFIRM_RESPONSE',
            requestId: msg.requestId,
            fromDevice: this.device,
            toDeviceId: msg.fromDevice.id,
            roundtripMs: Date.now() - msg.timestamp,
            timestamp: Date.now()
          };

          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(responseMsg));
          }
          if (this.bc) {
            this.bc.postMessage(responseMsg);
          }
        }
        break;
      }

      case 'CONFIRM_RESPONSE': {
        // Requester received confirmation acknowledgment!
        const pending = this.pendingConfirmations.get(msg.requestId);
        if (pending) {
          const roundtrip = Math.max(1, Date.now() - pending.timestamp);
          sounds.playConfirmChime();

          const log: ConnectionTestLog = {
            id: msg.requestId,
            fromId: this.device.id,
            fromName: this.device.name,
            toId: msg.fromDevice.id,
            toName: msg.fromDevice.name,
            latencyMs: roundtrip,
            status: 'success',
            timestamp: Date.now(),
            message: `تم تأكيد الاتصال بنجاح وتلقي الرد خلال ${roundtrip} مللي ثانية`
          };

          this.testLogs.unshift(log);
          this.pendingConfirmations.delete(msg.requestId);
          pending.resolve(log);
        }
        break;
      }

      case 'CALL_NOTIFICATION': {
        // Customer called sound and notification
        sounds.playCallChime();
        break;
      }
    }

    // Forward to general message listeners
    this.messageListeners.forEach(l => l(msg));
  }

  public broadcastState(state: QueueSystemState) {
    const msg: LanMessage = {
      type: 'STATE_UPDATE',
      state,
      sourceDeviceId: this.device.id
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
    if (this.bc) {
      this.bc.postMessage(msg);
    }
  }

  public notifyCustomerCalled(ticketNumber: string, windowName: string, windowId: number) {
    const msg: LanMessage = {
      type: 'CALL_NOTIFICATION',
      ticketNumber,
      windowName,
      windowId
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
    if (this.bc) {
      this.bc.postMessage(msg);
    }
  }

  // Event listener subscriptions
  public onMessage(listener: MessageListener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public onDeviceList(listener: DeviceListListener) {
    this.deviceListListeners.add(listener);
    listener(this.connectedDevices);
    return () => this.deviceListListeners.delete(listener);
  }

  public onConfirmAlert(listener: ConfirmAlertListener) {
    this.confirmAlertListeners.add(listener);
    return () => this.confirmAlertListeners.delete(listener);
  }
}

export const lanClient = new LanClientManager();
