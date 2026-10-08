import { ConnectedDevice, DeviceRole, DevicePlatform, LanMessage, ConnectionTestLog, QueueSystemState } from '../types';
import { sounds } from './audio';

export type LanConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'fallback_local';
export type LanTransport = 'ws' | 'http';

export interface ConfirmationAlert {
  id: string;
  fromName: string;
  fromRole: string;
  timestamp: number;
  note?: string;
}

type MessageListener = (msg: LanMessage) => void;
type StatusListener = (status: LanConnectionStatus, transport?: LanTransport) => void;
type DeviceListListener = (devices: ConnectedDevice[]) => void;
type ConfirmAlertListener = (alert: ConfirmationAlert) => void;

class LanClientManager {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private device: ConnectedDevice;
  private status: LanConnectionStatus = 'connected';
  private transport: LanTransport = 'http';
  private connectedDevices: ConnectedDevice[] = [];
  private testLogs: ConnectionTestLog[] = [];
  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private deviceListListeners: Set<DeviceListListener> = new Set();
  private confirmAlertListeners: Set<ConfirmAlertListener> = new Set();

  private pollInterval: any = null;
  private lastEventTimestamp: number = 0;
  private isPolling = false;
  private wsRetryCount = 0;
  private wsRetryTimer: any = null;

  private pendingPings = new Map<string, { timestamp: number; toId: string; toName: string }>();
  private pendingConfirmations = new Map<string, { timestamp: number; toId: string; toName: string; resolve: (log: ConnectionTestLog) => void }>();

  constructor() {
    this.device = this.initDeviceIdentity();
    this.initBroadcastChannel();
  }

  private initDeviceIdentity(): ConnectedDevice {
    // Session-based ID ensures different tabs are treated as separate clients
    let deviceId = '';
    if (typeof sessionStorage !== 'undefined') {
      deviceId = sessionStorage.getItem('lan_session_device_id') || '';
    }
    if (!deviceId) {
      const storedLocal = typeof localStorage !== 'undefined' ? localStorage.getItem('lan_device_id') : null;
      deviceId = storedLocal 
        ? storedLocal + '_' + Math.random().toString(36).substring(2, 6)
        : 'dev_' + Math.random().toString(36).substring(2, 9);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('lan_session_device_id', deviceId);
      }
    }

    const storedName = typeof localStorage !== 'undefined' ? localStorage.getItem('lan_device_name') : null;
    const storedRole = (typeof localStorage !== 'undefined' ? localStorage.getItem('lan_device_role') as DeviceRole : null) || 'display';

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
      latencyMs: 5
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

  public getTransport(): LanTransport {
    return this.transport;
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

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lan_device_name', name);
      localStorage.setItem('lan_device_role', role);
    }

    // Register via HTTP and WS
    this.registerDeviceOnServer();

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

  /**
   * Main connect: starts the reliable HTTP sync loop AND attempts WebSocket in background.
   * If WebSocket disconnects or fails, the connection STAYS ON via HTTP with zero flapping!
   */
  public connect() {
    if (typeof window === 'undefined') return;

    // Immediately mark as connected via HTTP to prevent UI flicker
    this.setStatus('connected', 'http');
    this.lastEventTimestamp = Date.now() - 5000;

    // Register device and start HTTP Event Engine
    this.registerDeviceOnServer();
    this.startHttpEventLoop();

    // Try WebSocket connection in background
    this.tryWebSocketConnection();
  }

  private setStatus(status: LanConnectionStatus, transport: LanTransport = this.transport) {
    this.status = status;
    this.transport = transport;
    this.statusListeners.forEach(l => l(status, transport));
  }

  private registerDeviceOnServer() {
    fetch('/api/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.device)
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.devices) {
        this.updateDeviceList(data.devices);
      }
    })
    .catch(() => {});
  }

  private startHttpEventLoop() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    // Poll every 1800ms for events, state updates, and active devices
    this.pollInterval = setInterval(() => {
      this.pollServerEvents();
    }, 1800);

    // Initial immediate poll
    this.pollServerEvents();
  }

  private async pollServerEvents() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const url = `/api/events?since=${this.lastEventTimestamp}&deviceId=${encodeURIComponent(this.device.id)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        // Update server time & timestamp
        if (data.serverTime) {
          this.lastEventTimestamp = data.serverTime;
        }

        // Process any received events
        if (Array.isArray(data.events)) {
          for (const evt of data.events) {
            this.handleIncomingMessage(evt);
          }
        }

        // Update connected devices list
        if (Array.isArray(data.devices)) {
          this.updateDeviceList(data.devices);
        }

        // If we were disconnected, restore connected status
        if (this.status !== 'connected') {
          this.setStatus('connected', this.transport);
        }
      }
    } catch {
      // Offline fallback: keep broadcast channel active
    } finally {
      this.isPolling = false;
    }
  }

  private tryWebSocketConnection() {
    if (this.wsRetryCount >= 3) {
      // After 3 failed WS attempts, stick to HTTP sync to avoid flapping
      this.transport = 'http';
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        this.ws = socket;
        this.wsRetryCount = 0;
        this.setStatus('connected', 'ws');
        
        // Register device on WebSocket
        socket.send(JSON.stringify({
          type: 'REGISTER_DEVICE',
          device: this.device
        }));
      };

      socket.onmessage = (event) => {
        try {
          const msg: LanMessage = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch {}
      };

      socket.onclose = () => {
        this.ws = null;
        this.wsRetryCount++;
        // CRITICAL: DO NOT set status to 'disconnected' because HTTP sync is already active!
        this.transport = 'http';
        this.statusListeners.forEach(l => l('connected', 'http'));

        // Retry WebSocket after a quiet 15-second delay without flapping
        if (this.wsRetryTimer) clearTimeout(this.wsRetryTimer);
        this.wsRetryTimer = setTimeout(() => {
          this.tryWebSocketConnection();
        }, 15000);
      };

      socket.onerror = () => {
        // Silently handled by onclose fallback
      };
    } catch {
      this.transport = 'http';
    }
  }

  private updateDeviceList(devices: ConnectedDevice[]) {
    // Ensure this device is always present and marked
    const hasSelf = devices.some(d => d.id === this.device.id);
    let list = hasSelf ? devices : [...devices, { ...this.device, status: 'online' as const }];

    this.connectedDevices = list.map(d => ({
      ...d,
      isHost: d.id === this.device.id
    }));
    this.deviceListListeners.forEach(l => l(this.connectedDevices));
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

    this.dispatchMessage(pingMsg);
  }

  public async confirmConnectionWithDevice(targetDevice?: ConnectedDevice): Promise<ConnectionTestLog> {
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const toId = targetDevice ? targetDevice.id : 'ALL';
    const toName = targetDevice ? targetDevice.name : 'جميع الأجهزة المتصلة بالشبكة';

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingConfirmations.has(requestId)) {
          this.pendingConfirmations.delete(requestId);
          const failureLog: ConnectionTestLog = {
            id: requestId,
            fromId: this.device.id,
            fromName: this.device.name,
            toId,
            toName,
            latencyMs: 1500,
            status: 'timeout',
            timestamp: Date.now(),
            message: 'تم إرسال الإشارة عبر الشبكة وبانتظار رد الجهاز'
          };
          this.testLogs.unshift(failureLog);
          resolve(failureLog);
        }
      }, 3500);

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

      this.dispatchMessage(confirmMsg);
    });
  }

  private dispatchMessage(msg: LanMessage) {
    // 1. Send via WebSocket if available
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch {}
    }

    // 2. Send via HTTP event bus for guaranteed delivery
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    }).catch(() => {});

    // 3. Send via BroadcastChannel for instant local tabs sync
    if (this.bc) {
      try {
        this.bc.postMessage(msg);
      } catch {}
    }
  }

  private handleIncomingMessage(msg: LanMessage) {
    switch (msg.type) {
      case 'DEVICE_LIST': {
        this.updateDeviceList(msg.devices);
        break;
      }

      case 'PING': {
        if (msg.fromId !== this.device.id && (msg.toId === this.device.id || !msg.toId)) {
          const pongMsg: LanMessage = {
            type: 'PONG',
            pingId: msg.pingId,
            fromId: this.device.id,
            toId: msg.fromId,
            originalTimestamp: msg.timestamp,
            serverTimestamp: Date.now()
          };
          this.dispatchMessage(pongMsg);
        }
        break;
      }

      case 'PONG': {
        const pending = this.pendingPings.get(msg.pingId);
        if (pending) {
          const latency = Math.max(1, Date.now() - pending.timestamp);
          this.device.latencyMs = latency;
          this.pendingPings.delete(msg.pingId);

          this.connectedDevices = this.connectedDevices.map(d => 
            d.id === msg.fromId ? { ...d, latencyMs: latency, lastSeen: Date.now() } : d
          );
          this.deviceListListeners.forEach(l => l(this.connectedDevices));
        }
        break;
      }

      case 'CONFIRM_REQUEST': {
        if (msg.fromDevice.id !== this.device.id) {
          sounds.playConfirmChime();

          const alert: ConfirmationAlert = {
            id: msg.requestId,
            fromName: msg.fromDevice.name,
            fromRole: msg.fromDevice.role,
            timestamp: msg.timestamp,
            note: msg.note
          };
          this.confirmAlertListeners.forEach(l => l(alert));

          const responseMsg: LanMessage = {
            type: 'CONFIRM_RESPONSE',
            requestId: msg.requestId,
            fromDevice: this.device,
            toDeviceId: msg.fromDevice.id,
            roundtripMs: Date.now() - msg.timestamp,
            timestamp: Date.now()
          };
          this.dispatchMessage(responseMsg);
        }
        break;
      }

      case 'CONFIRM_RESPONSE': {
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
        sounds.playCallChime();
        break;
      }
    }

    this.messageListeners.forEach(l => l(msg));
  }

  public broadcastState(state: QueueSystemState) {
    const msg: LanMessage = {
      type: 'STATE_UPDATE',
      state,
      sourceDeviceId: this.device.id
    };
    this.dispatchMessage(msg);
  }

  public notifyCustomerCalled(ticketNumber: string, windowName: string, windowId: number) {
    const msg: LanMessage = {
      type: 'CALL_NOTIFICATION',
      ticketNumber,
      windowName,
      windowId
    };
    this.dispatchMessage(msg);
  }

  public onMessage(listener: MessageListener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status, this.transport);
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
