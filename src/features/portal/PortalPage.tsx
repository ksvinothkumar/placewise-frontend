import { useQuery } from '@tanstack/react-query';
import { Briefcase, CalendarClock, Check, Inbox, MapPin, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { portalApi } from '@/api/endpoints/portal';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kpi, PageHead } from '@/components/ui/Layout';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSessionStore } from '@/stores/session.store';

export function PortalPage() {
  const nav = useNavigate();
  const user = useSessionStore((s) => s.user);
  const { data: jobs, isLoading } = useQuery({ queryKey: [...queryKeys.portal.all, 'jobs'], queryFn: portalApi.jobs });
  const sum = (k: 'awaitingFeedback' | 'interviewing' | 'offers' | 'placed') => (jobs ?? []).reduce((t, j) => t + j[k], 0);
  return (
    <>
      <PageHead title={`Welcome, ${user?.name.split(' ')[0] ?? ''}`} sub="Your open roles, shortlisted candidates and interviews" />
      {jobs && (
        <div className="grid kpis" style={{ marginBottom: 18 }}>
          <Kpi icon={Inbox} label="Awaiting your feedback" value={sum('awaitingFeedback')} sub="candidates submitted to you" tone="warn" />
          <Kpi icon={CalendarClock} label="In interviews" value={sum('interviewing')} sub="across your roles" tone="info" />
          <Kpi icon={Check} label="Offers made" value={sum('offers')} sub="pending a decision" />
          <Kpi icon={ThumbsUp} label="Placed" value={sum('placed')} sub="successful hires" tone="good" />
        </div>
      )}
      {isLoading ? (
        <div className="card">
          <Skeleton rows={5} />
        </div>
      ) : !jobs?.length ? (
        <div className="card">
          <EmptyState title="No roles yet" sub="Your recruiter will add your open roles here." />
        </div>
      ) : (
        <div className="grid cols-2">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="card"
              style={{ cursor: 'pointer' }}
              role="link"
              tabIndex={0}
              aria-label={`Open ${j.title}`}
              onClick={() => nav('/portal/jobs/' + j.id)}
              onKeyDown={(e) => e.key === 'Enter' && nav('/portal/jobs/' + j.id)}
            >
              <div className="card-b">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 16 }}>{j.title}</b>
                    <div className="meta" style={{ marginTop: 4 }}>
                      <span>
                        <MapPin size={14} />
                        {j.city}
                      </span>
                      <span>
                        <Briefcase size={14} />
                        {j.openings} opening{j.openings > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <span className={'badge ' + (j.status === 'open' ? 'good' : '')}>{j.status}</span>
                </div>
                <div className="kv" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line2)' }}>
                  <div>
                    <span>Shortlisted</span>
                    <b>{j.shortlisted}</b>
                  </div>
                  <div>
                    <span>Need feedback</span>
                    <b style={{ color: j.awaitingFeedback ? 'var(--warn)' : undefined }}>{j.awaitingFeedback}</b>
                  </div>
                  <div>
                    <span>Interviewing</span>
                    <b>{j.interviewing}</b>
                  </div>
                  <div>
                    <span>Placed</span>
                    <b>{j.placed}</b>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
