import { Paginated } from '@/components/ui/Paginated';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { attendanceApi } from '@/api/endpoints/attendance';
import { Skeleton } from '@/components/ui/Skeleton';
import { downloadCsv } from '@/lib/downloadCsv';
import { attKeys, useLeaveInfo } from './hooks';

export function ReportTab() {
  const info = useLeaveInfo();
  const [mo, setMo] = useState<string | null>(null);
  const m = mo ?? info.data?.today.slice(0, 7);
  const { data } = useQuery({ queryKey: attKeys.report(m ?? ''), queryFn: () => attendanceApi.report(m!), enabled: !!m });
  const csv = () => {
    if (!data) return;
    downloadCsv(`attendance-${m}.csv`, [
      ['Name', 'Days present', 'Hours', 'Leave days', 'Absent days', 'Missed check-outs'],
      ...data.rows.map((r) => [r.name, r.present, r.hours, r.leaveDays, r.absent, r.missedCheckouts]),
    ]);
  };
  return (
    <div className="card">
      <div className="toolbar">
        <input className="input" type="month" style={{ width: 170 }} aria-label="Month" value={m ?? ''} onChange={(e) => setMo(e.target.value)} />
        {data && <span style={{ color: 'var(--muted)' }}>{data.workingDaysSoFar} working days so far</span>}
        <button type="button" className="btn sm" style={{ marginLeft: 'auto' }} disabled={!data} onClick={csv}><Download size={13} />Export CSV</button>
      </div>
      {!data ? (
        <Skeleton />
      ) : (
        <Paginated items={data.rows} render={(pageRows) => (
        <table className="table">
          <thead><tr><th>Person</th><th>Present</th><th>Hours</th><th>Leave</th><th>Absent</th><th>Missed check-outs</th></tr></thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td>{r.present}</td>
                <td>{r.hours}</td>
                <td>{r.leaveDays}</td>
                <td>{r.absent > 0 ? <span className="badge bad">{r.absent}</span> : 0}</td>
                <td>{r.missedCheckouts > 0 ? <span className="badge warn">{r.missedCheckouts}</span> : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )} />
      )}
    </div>
  );
}
