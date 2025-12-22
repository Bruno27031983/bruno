
export type LogType = 'arrival' | 'departure';

export interface AttendanceLog {
  id: string;
  timestamp: number; // Date.now()
  type: LogType;
  manualNote?: string;
}

export interface DayRecord {
  date: string; // ISO String (YYYY-MM-DD)
  logs: AttendanceLog[];
  // Manual override fields
  manualArrival?: string;   // "HH:mm"
  manualDeparture?: string; // "HH:mm"
  manualBreak?: number;      // Minutes
}

export interface UserSettings {
  userName: string;
  hourlyWage: number;
  taxRate: number;
}

export interface AttendanceState {
  records: Record<string, DayRecord>;
  settings: UserSettings;
}

export interface MonthlyStats {
  totalHours: number;
  expectedHours: number;
  overtime: number;
  daysWorked: number;
  grossEarnings: number;
  netEarnings: number;
}
