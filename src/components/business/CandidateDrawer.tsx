import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Copy, Mail, Phone, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationsApi } from '@/api/endpoints/applications';
import { candidateToolsApi } from '@/api/endpoints/candidate-tools';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { CandidatePhoto } from '@/components/ui/Avatar';
import { Chips, ScoreRing, StageBadge } from '@/components/ui/Badges';
import { Drawer } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { money, waLink } from '@/lib/format';
import { useCan } from '@/lib/permissions';
import { toast } from '@/stores/ui.store';

/**
 * Quick-view drawer for a candidate (pipeline cards, calendar). Port of the legacy forms.jsx CandidateDrawer.
 * NOTE: the candidates feature may ship its own; they share the GET /candidates/:id cache entry.
 */
export function CandidateDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const canDelete = useCan('candidates:delete');
  const { data: c, isLoading, isError } = useQuery({ queryKey: queryKeys.candidates.detail(id), queryFn: () => candidateToolsApi.detail(id) });
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const add = async (job: string) => {
    try {
      await applicationsApi.add(id, job);
      toast('Added to pipeline');
      void qc.invalidateQueries({ queryKey: queryKeys.applications.all });
      void qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const email = async (appId: string, kind: string) => {
    if (!kind) return;
    try {
      setDraft(await applicationsApi.emailDraft(appId, kind));
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const del = async () => {
    if (!confirm('Delete this candidate and their applications?')) return;
    try {
      await candidateToolsApi.remove(id);
      toast('Candidate deleted');
      void qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
      void qc.invalidateQueries({ queryKey: queryKeys.applications.all });
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const wa = c ? waLink(c.phone, `Hi ${c.name.split(' ')[0]}, `) : null;
  return (
    <Drawer
      onClose={onClose}
      header={
        c && (
          <div className="who">
            <CandidatePhoto c={c} size={52} />
            <div>
              <b style={{ fontSize: 17 }}>{c.name}</b>
              <span>
                {c.title}
                {c.company && ` · ${c.company}`}
              </span>
            </div>
          </div>
        )
      }
    >
      {isError ? (
        <div className="banner bad">Candidate not found.</div>
      ) : isLoading || !c ? (
        <Skeleton rows={9} />
      ) : (
        <>
          <div style={{ display: 'grid', gap: 7, color: 'var(--text2)', fontSize: 13.5 }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Mail size={15} />
              {c.email || '—'}
            </span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Phone size={15} />
              {c.phone || '—'}
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" style={{ color: '#128c7e', marginLeft: 6, fontWeight: 500 }}>
                  WhatsApp
                </a>
              )}
            </span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Building2 size={15} />
              {c.city || '—'} · via {c.source}
            </span>
          </div>
          <div className="kv sec">
            <div>
              <span>Experience</span>
              <b>{c.exp} yrs</b>
            </div>
            <div>
              <span>Expected CTC</span>
              <b>{money(c.expected)}</b>
            </div>
            <div>
              <span>Notice period</span>
              <b>{c.notice} days</b>
            </div>
            <div>
              <span>Applications</span>
              <b>{c.applications.length}</b>
            </div>
          </div>
          <div className="sec">
            <h4>Skills</h4>
            <Chips items={c.skills} />
          </div>
          <div className="sec">
            <h4>Best-fit open jobs</h4>
            {c.bestJobs.map((b) => (
              <div key={b.job.id} className="who" style={{ padding: '9px 0', borderBottom: '1px solid var(--line2)' }}>
                <ScoreRing score={b.score} size={40} />
                <div style={{ flex: 1 }}>
                  <b>{b.job.title}</b>
                  <span>
                    {b.job.client?.name}
                    {b.notes.length ? ' · ' + b.notes[0] : ' · Strong fit'}
                  </span>
                </div>
                {b.inPipeline ? (
                  <span className="badge">In pipeline</span>
                ) : (
                  <button className="btn sm primary" onClick={() => void add(b.job.id)}>
                    <Plus size={14} />
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
          {c.applications.length > 0 && (
            <div className="sec">
              <h4>Applications</h4>
              {c.applications.map((a) => (
                <div key={a.id} className="who" style={{ padding: '8px 0' }}>
                  <StageBadge stage={a.stage} />
                  <span style={{ flex: 1, color: 'var(--text)' }}>{a.job.title}</span>
                  <select className="select" aria-label={`Draft email for ${a.job.title}`} style={{ width: 130, padding: '4px 8px', fontSize: 12.5 }} value="" onChange={(e) => void email(a.id, e.target.value)}>
                    <option value="">✉ Draft email</option>
                    <option value="outreach">Outreach</option>
                    <option value="submission">Client submission</option>
                    <option value="offer">Offer</option>
                    <option value="reject">Rejection</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          {draft && (
            <div className="sec">
              <h4>Email draft</h4>
              <div className="code">
                <b>Subject: {draft.subject}</b>
                {'\n\n'}
                {draft.body}
              </div>
              <button
                className="btn sm"
                style={{ marginTop: 10 }}
                onClick={() => {
                  void navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
                  toast('Copied to clipboard');
                }}
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
          )}
          <div className="sec" style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn primary"
              onClick={() => {
                onClose();
                nav('/candidates/' + id);
              }}
            >
              View full profile
            </button>
            {canDelete && (
              <button className="btn danger" onClick={() => void del()}>
                <Trash2 size={15} />
                Delete candidate
              </button>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
