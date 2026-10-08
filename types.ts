export enum EmployeeStatus {
  Available = 'متاح',
  Busy = 'مشغول',
}

export enum CustomerStatus {
  Waiting = 'بالانتظار',
  Serving = 'قيد الخدمة',
  Served = 'تمت خدمته',
}

export type DeviceRole = 'kiosk' | 'display' | 'employee' | 'admin' | 'observer';
export type DevicePlatform = 'desktop' | 'mobile' | 'tablet';

export interface ConnectedDevice {
  id: string;
  name: string;
  role: DeviceRole;
  platform: DevicePlatform;
  ip?: string;
  status: 'online' | 'degraded' | 'offline';
  lastSeen: number;
  latencyMs?: number;
  windowId?: number;
  employeeName?: string;
  isHost?: boolean;
}

export interface LanNetworkInfo {
  localIps: string[];
  port: number;
  serverTime: number;
  primaryLanUrl: string;
}

export interface ConnectionTestLog {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  latencyMs: number;
  status: 'success' | 'timeout';
  timestamp: number;
  message?: string;
}

export interface PrinterConfig {
  paperWidth: '58mm' | '80mm' | 'A4';
  headerText: string;
  headerFontSize: number;
  numberFontSize: number;
  detailsFontSize: number;
  footerText: string;
  showDate: boolean;
  autoPrint: boolean;
}

export interface Customer {
  id: number;
  ticketNumber: string;
  requestTime: Date;
  callTime?: Date;
  finishTime?: Date;
  status: CustomerStatus;
  servedBy?: number;
  windowId?: number;
  serviceName?: string;
  rating?: number;
  feedback?: string;
}

export interface Employee {
  id: number;
  name: string;
  username: string;
  password: string;
  status: EmployeeStatus;
  windowId?: number;
  customersServed: number;
}

export interface Window {
  id: number;
  name: string;
  employeeId?: number;
  currentCustomerId?: number;
  customTask?: string;
}

export interface QueueSystemState {
  windows: Window[];
  employees: Employee[];
  customers: Customer[];
  queue: number[];
  ticketCounter: number;
  syncId?: string;
  roomPin?: string;
  printerConfig: PrinterConfig;
  lastUpdated?: number;
}

export type LanMessage =
  | { type: 'REGISTER_DEVICE'; device: ConnectedDevice }
  | { type: 'DEVICE_LIST'; devices: ConnectedDevice[] }
  | { type: 'DEVICE_JOINED'; device: ConnectedDevice }
  | { type: 'DEVICE_LEFT'; deviceId: string }
  | { type: 'PING'; pingId: string; fromId: string; toId?: string; timestamp: number }
  | { type: 'PONG'; pingId: string; fromId: string; toId: string; originalTimestamp: number; serverTimestamp: number }
  | { type: 'CONFIRM_REQUEST'; requestId: string; fromDevice: ConnectedDevice; toDeviceId?: string; note?: string; timestamp: number }
  | { type: 'CONFIRM_RESPONSE'; requestId: string; fromDevice: ConnectedDevice; toDeviceId: string; roundtripMs: number; timestamp: number }
  | { type: 'STATE_UPDATE'; state: QueueSystemState; sourceDeviceId?: string }
  | { type: 'CALL_NOTIFICATION'; ticketNumber: string; windowName: string; windowId: number }
  | { type: 'BROADCAST_CHAT'; fromName: string; message: string; timestamp: number };

export type MeshMessage =
  | { type: 'STATE_UPDATE'; state: QueueSystemState }
  | { type: 'ACTION_ADD_CUSTOMER'; serviceName?: string }
  | { type: 'ACTION_CALL_NEXT'; employeeId: number }
  | { type: 'ACTION_FINISH'; employeeId: number }
  | { type: 'LAN_PING'; id: string; time: number }
  | { type: 'LAN_PONG'; id: string; time: number };
