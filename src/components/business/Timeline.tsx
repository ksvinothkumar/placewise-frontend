import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, CalendarClock, KanbanSquare, ListChecks, Mail, Star as StarIcon, UserPlus, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { candidateToolsApi } from '@/api/endpoints/candidate-tools';
import { queryKeys } from '@/api/queryKeys';
import { Skeleton } from '@/components/ui/Skeleton';
import { shortDT } from '@/lib/dates';

const TL: Record<string, [LucideIcon, string]> = {
  created: [UserPlus, 'var(--info)'],
  stage: [KanbanSquare, 'var(--brand)'],
  interview: [CalendarClock, 'var(--brand)'],
  email: [Mail, 'var(--warn)'],
  offer: [BadgeCheck, 'var(--good)'],
  feedback: [StarIcon, '#f59e0b'],
  task: [ListChecks, 'var(--muted)'],
};

export function Timeline({ id }: { id: string }) {
  const { data } = useQuery({ queryKey: [...queryKeys.candidates.all, 'timeline', id], queryFn: () => candidateToolsApi.timeline(id) });
  const [all, setAll] = useState(false);
  const list = all ? data : data?.slice(0, 8);
  return (
    <div className="card">
      <div className="card-h">
        <h3>Activity timeline</h3>
        <small>{data?.length ?? ''}</small>
      </div>
      <div className="card-b">
        {!data ? (
          <Skeleton rows={3} />
        ) : (
          <ul className="list">
            {list?.map((e, i) => {
              const [I, c] = TL[e.type] ?? TL.created!;
              return (
                <li key={i}>
                  <div className="ic" style={{ background: 'var(--surface2)', color: c }}>
                    <I size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{e.title}</div>
                    {e.detail && <div style={{ color: 'var(--text2)', fontSize: 12.5 }}>{e.detail}</div>}
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{shortDT(e.at)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {data && data.length > 8 && (
          <button className="btn sm ghost" onClick={() => setAll((a) => !a)}>
            {all ? 'Show less' : `Show all ${data.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
