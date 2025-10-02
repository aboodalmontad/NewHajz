
export enum EmployeeStatus {
  Available = 'متاح',
  Busy = 'مشغول',
}

export enum CustomerStatus {
  Waiting = 'بالانتظار',
  Serving = 'قيد الخدمة',
  Served = 'تمت خدمته',
}

export interface Customer {
  id: number;
  ticketNumber: string;
  requestTime: Date;
  callTime?: Date;
  finishTime?: Date;
  status: CustomerStatus;
  servedBy?: number; // employeeId
  windowId?: number;
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
