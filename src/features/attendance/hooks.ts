import { useQuery } from '@tanstack/react-query';
import { attendanceApi, leaveApi } from '@/api/endpoints/attendance';
import { queryKeys } from '@/api/queryKeys';

const root = queryKeys.attendance.all;
export const attKeys = {
  all: root,
  today: [...root, 'today'] as const,
  leaveInfo: [...root, 'leave-info'] as const,
  month: (m: string) => [...root, 'month', m] as const,
  requests: (scope?: string) => [...root, 'requests', scope ?? 'mine'] as const,
  team: (d: string) => [...root, 'team', d] as const,
  report: (m: string) => [...root, 'report', m] as const,
};

export const useToday = () => useQuery({ queryKey: attKeys.today, queryFn: () => attendanceApi.today() });
export const useLeaveInfo = () => useQuery({ queryKey: attKeys.leaveInfo, queryFn: () => leaveApi.info() });
export const useMonth = (m: string | undefined) => useQuery({ queryKey: attKeys.month(m ?? ''), queryFn: () => attendanceApi.month(m!), enabled: !!m });
export const useLeaveRequests = (scope?: 'team' | 'pending', enabled = true) =>
  useQuery({ queryKey: attKeys.requests(scope), queryFn: () => leaveApi.requests(scope), enabled });
