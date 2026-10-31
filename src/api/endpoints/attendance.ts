import { http } from '../http';

export type DayStatus = 'present' | 'leave' | 'holiday' | 'off' | 'absent' | 'future';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface AttendanceRecord {
  checkIn: string;
  checkOut?: string | null;
  workMinutes?: number | null;
}
export interface TodayView {
  date: string;
  record: AttendanceRecord | null;
  leave: { typeName: string } | null;
  day?: { kind: string; name?: string };
}
export interface LeaveBalance {
  key: string;
  name: string;
  total: number;
  used: number;
  pending: number;
  remaining: number;
}
export interface LeaveInfo {
  leaveTypes: { key: string; name: string; days: number }[];
  holidays: { date: string; name: string }[];
  weeklyOff: number[];
  balances: LeaveBalance[];
  /** server "today" as YYYY-MM-DD */
  today: string;
}
export interface CalendarDay {
  date: string;
  status: DayStatus;
  checkIn?: string;
  checkOut?: string;
  minutes?: number | null;
  missedCheckout?: boolean;
  holiday?: string;
  leaveType?: string;
}
export interface MonthView {
  days: CalendarDay[];
  summary: { present: number; hours: number; avgHours: number; leaveDays: number; absent: number };
}
export interface LeaveRequest {
  id: string;
  typeName: string;
  status: LeaveStatus;
  from: string;
  to: string;
  days: number;
  reason?: string;
  decisionNote?: string;
  decidedByName?: string;
  user?: { id: string; name: string } | string;
}
export interface LeaveRequestInput {
  type: string;
  from: string;
  to: string;
  halfDay: boolean;
  reason: string;
}
export type TeamStatus = 'in' | 'out' | 'leave' | 'absent' | 'holiday' | 'off' | 'future';
export interface TeamRow {
  id: string;
  name: string;
  role: string;
  branch?: string;
  status: TeamStatus;
  leaveType?: string;
  holiday?: string;
  checkIn?: string;
  checkOut?: string;
  minutes?: number | null;
}
export interface TeamDay {
  rows: TeamRow[];
  counts: Record<'in' | 'out' | 'leave' | 'absent', number>;
}
export interface MonthReport {
  workingDaysSoFar: number;
  rows: { id: string; name: string; present: number; hours: number; leaveDays: number; absent: number; missedCheckouts: number }[];
}

export const attendanceApi = {
  base: '/attendance',
  today: () => http.get<TodayView>('/attendance/today'),
  checkIn: () => http.post<AttendanceRecord>('/attendance/check-in', {}),
  checkOut: (note?: string) => http.post<AttendanceRecord>('/attendance/check-out', note ? { note } : {}),
  month: (month: string) => http.get<MonthView>('/attendance/me', { month }),
  team: (date: string) => http.get<TeamDay>('/attendance/team', { date }),
  report: (month: string) => http.get<MonthReport>('/attendance/report', { month }),
  correct: (userId: string, date: string, body: { checkIn: string; checkOut?: string }) =>
    http.put<unknown>(`/attendance/${userId}/${date}`, body),
};

export const leaveApi = {
  info: () => http.get<LeaveInfo>('/leave/info'),
  requests: (scope?: 'team' | 'pending') => http.get<LeaveRequest[]>('/leave/requests', { scope }),
  request: (body: LeaveRequestInput) => http.post<LeaveRequest>('/leave/requests', body),
  cancel: (id: string) => http.post<unknown>(`/leave/requests/${id}/cancel`, {}),
  decide: (id: string, decision: 'approved' | 'rejected', note: string) =>
    http.post<unknown>(`/leave/requests/${id}/decision`, { decision, note }),
};
