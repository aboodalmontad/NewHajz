
export enum EmployeeStatus {
  Available = 'متاح',
  Busy = 'مشغول',
}

export enum CustomerStatus {
  Waiting = 'بالانتظار',
  Serving = 'قيد الخدمة',
  Served = 'تمت خدمته',
}

export interface PrinterConfig {
  paperWidth: '58mm' | '80mm' | 'A4';
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
  customers: Customer[];
  queue: number[];
  employees: Employee[];
  windows: Window[];
  ticketCounter: number;
  syncId?: string;
  printerConfig: PrinterConfig;
}

export type MeshMessage = 
  | { type: 'STATE_UPDATE', state: QueueSystemState }
  | { type: 'ACTION_ADD_CUSTOMER', serviceName?: string }
  | { type: 'ACTION_CALL_NEXT', employeeId: number }
  | { type: 'ACTION_FINISH', employeeId: number };
