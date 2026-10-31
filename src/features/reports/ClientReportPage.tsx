import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Printer, Send } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { reportsApi } from '@/api/endpoints/reports';
import { errorMessage, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { LogoMark } from '@/components/Logo';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { fmtDate } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';

const Sec = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ marginTop: 22 }}>
    <h3 style={{ fontSize: 14.5, marginBottom: 8 }}>{title}</h3>
    {children}
  </div>
);
const None = () => <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>None in this period.</div>;

export function ClientReportPage() {
  const { id = '' } = useParams();
  const canSend = useCan('clients:write');
  const mail = useSessionStore((s) => s.mail);
  const [days, setDays] = useState(7);
  const { data: r, isLoading, isError } = useQuery({ queryKey: [...queryKeys.reports.all, 'client', id, days], queryFn: () => reportsApi.clientReport(id, days) });
  const send = useMutation<Awaited<ReturnType<typeof reportsApi.sendClientReport>>, ApiError>({
    mutationFn: () => reportsApi.sendClientReport(id, days),
    onSuccess: (x) => toast(x.status === 'sent' ? `Report emailed to ${x.to}` : x.status === 'simulated' ? 'Prepared (email not configured)' : 'Email failed: ' + x.error, x.status === 'failed' ? 'error' : 'ok'),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  if (isLoading) return <div className="card"><Skeleton rows={9} /></div>;
  if (isError || !r) return <EmptyState title="Report not available" />;
  return (
    <>
      <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/clients" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--text2)' }}>
          <ArrowLeft size={15} />
          Clients
        </Link>
        <span style={{ flex: 1 }} />
        <select className="select" aria-label="Period" style={{ width: 150 }} value={days} onChange={(e) => setDays(+e.target.value)}>
          {[
            [7, 'Last 7 days'],
            [14, 'Last 14 days'],
            [30, 'Last 30 days'],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {canSend && (
          <button
            className="btn"
            disabled={send.isPending}
            onClick={() => {
              if (confirm(`Email this report to ${r.client.email || 'the client'}${mail ? '' : ' (email is not configured, so it will only be recorded)'}?`)) send.mutate();
            }}
          >
            {send.isPending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
            Email to client
          </button>
        )}
        <button className="btn primary" onClick={() => window.print()}>
          <Printer size={15} />
          Print / PDF
        </button>
      </div>
      <div className="card invoice-doc">
        <div className="card-b" style={{ padding: 34 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <LogoMark size={42} shadow={false} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Recruitment update</div>
              <div style={{ color: 'var(--text2)' }}>
                {r.client.name} · last {r.days} days · generated {fmtDate(r.generated)}
              </div>
            </div>
          </div>
          <Sec title="Open roles">
            {r.jobs.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Open</th>
                    <th>In pipeline</th>
                    <th>Submitted</th>
                    <th>Interviewing</th>
                    <th>Offers</th>
                    <th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {r.jobs.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <b>{j.title}</b>
                      </td>
                      <td>{j.daysOpen}d</td>
                      <td>{j.inPipeline}</td>
                      <td>{j.submitted}</td>
                      <td>{j.interviewing}</td>
                      <td>{j.offers}</td>
                      <td>
                        {j.placed}/{j.openings}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <None />
            )}
          </Sec>
          <Sec title="Candidates submitted">
            {r.newSubmissions.length ? (
              <ul className="list">
                {r.newSubmissions.map((c, i) => (
                  <li key={i}>
                    <b>{c.candidate}</b>
                    <span style={{ color: 'var(--muted)' }}>
                      {c.title}
                      {c.exp ? ` · ${c.exp} yrs` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <None />
            )}
          </Sec>
          <Sec title="Upcoming interviews (next 14 days)">
            {r.upcomingInterviews.length ? (
              <ul className="list">
                {r.upcomingInterviews.map((i, n) => (
                  <li key={n}>
                    <b>{i.candidate}</b>
                    <span style={{ color: 'var(--muted)' }}>
                      {i.round} · {i.mode}
                    </span>
                    <span style={{ marginLeft: 'auto' }}>{new Date(i.when).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <None />
            )}
          </Sec>
          <Sec title="Placements">
            {r.placements.length ? (
              <ul className="list">
                {r.placements.map((p, i) => (
                  <li key={i}>
                    <b>{p.candidate}</b>
                    <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{fmtDate(p.on)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <None />
            )}
          </Sec>
        </div>
      </div>
    </>
  );
}
