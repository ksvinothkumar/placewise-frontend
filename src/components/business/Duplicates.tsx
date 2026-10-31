import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { candidateToolsApi, type DuplicateCandidate } from '@/api/endpoints/candidate-tools';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/stores/ui.store';

export function DuplicatesModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [...queryKeys.candidates.all, 'duplicates'], queryFn: candidateToolsApi.duplicates });
  const [pick, setPick] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const keep = (g: DuplicateCandidate[], gi: number) =>
    pick[gi] ?? [...g].sort((a, b) => b.applications - a.applications || Number(b.hasResume) - Number(a.hasResume) || b.skills.length - a.skills.length)[0]!.id;
  const merge = async (g: DuplicateCandidate[], gi: number) => {
    const k = keep(g, gi);
    if (!confirm(`Merge ${g.length - 1} record(s) into ${g.find((c) => c.id === k)?.name}? Applications, notes and skills are combined. This cannot be undone.`)) return;
    setBusy(gi);
    try {
      const r = await candidateToolsApi.merge(k, g.filter((c) => c.id !== k).map((c) => c.id));
      toast(`Merged. ${r.movedApplications} application(s) moved`);
      await qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
      await qc.invalidateQueries({ queryKey: queryKeys.applications.all });
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  return (
    <Modal wide title="Possible duplicates" sub="Matched by email, phone or name. Pick the record to keep and merge the rest into it." onClose={onClose}>
      {isLoading ? (
        <Skeleton rows={5} />
      ) : !data?.length ? (
        <div className="empty">
          <Check size={34} strokeWidth={1.5} color="var(--good)" />
          <b>No duplicates found</b>Your talent pool looks clean.
        </div>
      ) : (
        data.map((g, gi) => (
          <div key={gi} className="card" style={{ marginTop: 14, boxShadow: 'none' }}>
            <div className="card-b" style={{ padding: 14 }}>
              {g.map((c) => (
                <label key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', cursor: 'pointer' }}>
                  <input type="radio" name={'g' + gi} checked={keep(g, gi) === c.id} onChange={() => setPick((p) => ({ ...p, [gi]: c.id }))} />
                  <div style={{ flex: 1 }}>
                    <b>{c.name}</b> <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{c.title}</span>
                    <div style={{ fontSize: 12.5, color: 'var(--text2)' }}>{[c.email, c.phone, c.city].filter(Boolean).join(' · ') || 'no contact details'}</div>
                  </div>
                  <span className="badge">
                    {c.applications} application{c.applications === 1 ? '' : 's'}
                  </span>
                  {c.hasResume && <span className="badge info">resume</span>}
                  {keep(g, gi) === c.id && <span className="badge good">keep</span>}
                </label>
              ))}
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <button className="btn primary sm" disabled={busy === gi} onClick={() => void merge(g, gi)}>
                  {busy === gi && <Loader2 size={13} className="spin" />}Merge into selected
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </Modal>
  );
}
