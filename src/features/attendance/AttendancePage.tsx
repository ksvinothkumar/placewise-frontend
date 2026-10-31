import { useState } from 'react';
import { PageHead } from '@/components/ui/Layout';
import { useCan } from '@/lib/permissions';
import { ApprovalsTab } from './ApprovalsTab';
import { useLeaveRequests } from './hooks';
import { MyAttendance } from './MyAttendance';
import { ReportTab } from './ReportTab';
import { TeamTab } from './TeamTab';

type Tab = 'me' | 'team' | 'approvals' | 'report';

export function AttendancePage() {
  const mgr = useCan('attendance:manage');
  const [tab, setTab] = useState<Tab>('me');
  const pending = useLeaveRequests('pending', mgr);
  const n = pending.data?.length;
  const tabs: [Tab, string][] = [['me', 'My attendance'], ...(mgr ? ([['team', 'Team today'], ['approvals', `Leave approvals${n ? ` (${n})` : ''}`], ['report', 'Monthly report']] as [Tab, string][]) : [])];
  const current: Tab = tabs.some(([k]) => k === tab) ? tab : 'me';
  return (
    <>
      <PageHead title="Attendance & leave" sub="Check in, track your month, and request time off" />
      <div className="tabs" role="tablist" aria-label="Attendance sections">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={current === k} className={current === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {current === 'me' ? <MyAttendance /> : current === 'team' ? <TeamTab /> : current === 'approvals' ? <ApprovalsTab /> : <ReportTab />}
    </>
  );
}
