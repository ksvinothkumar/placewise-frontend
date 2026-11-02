import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { notebookApi, type TeamAccess, type UserNote } from '@/api/endpoints/notebook';
import { teamApi } from '@/api/endpoints/notes';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Avatar, Field, Modal } from '@/components/ui';
import { FormFoot } from '@/components/forms/FormFoot';
import { toast } from '@/stores/ui.store';

/** Owner-only: pick people (view or edit) and/or open the note to the whole team. */
export function ShareDialog({ note, onClose }: { note: UserNote; onClose: () => void }) {
  const { data: members } = useQuery({ queryKey: ['notebook', 'members'], queryFn: teamApi.users, staleTime: 5 * 60_000 });
  const [team, setTeam] = useState<TeamAccess>(note.team);
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(note.shares.map((s) => [s.id, s.canEdit])));
  const people = (members ?? []).filter((m) => m.id !== note.owner.id);

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = { ...p };
      if (id in n) delete n[id];
      else n[id] = false;
      return n;
    });
  const save = useApiMutation(() => notebookApi.share(note.id, { team, users: Object.entries(picked).map(([id, canEdit]) => ({ id, canEdit })) }), {
    invalidate: [queryKeys.notebook.all],
    onSuccess: () => { toast('Sharing updated'); onClose(); },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  return (
    <Modal title="Share note" sub={note.title || 'Untitled'} onClose={onClose} footer={<FormFoot onClose={onClose} busy={save.isPending} label="Save sharing" onSave={() => save.mutate()} />}>
      <Field label="Everyone on the team">
        <select className="select" value={team} onChange={(e) => setTeam(e.target.value as TeamAccess)}>
          <option value="none">Not shared with everyone</option>
          <option value="view">Everyone can view</option>
          <option value="edit">Everyone can edit</option>
        </select>
      </Field>
      <div style={{ margin: '14px 0 6px', fontWeight: 600, fontSize: 13.5 }}>Or choose people</div>
      <div className="share-list">
        {people.map((m) => {
          const on = m.id in picked;
          return (
            <div key={m.id} className="share-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}>
                <input type="checkbox" checked={on} onChange={() => toggle(m.id)} aria-label={m.name} />
                <Avatar name={m.name} size={30} />
                <span><b>{m.name}</b>{m.title && <small style={{ color: 'var(--muted)', marginLeft: 6 }}>{m.title}</small>}</span>
              </label>
              {on && (
                <select className="select" style={{ width: 120 }} aria-label={`${m.name} can`} value={picked[m.id] ? 'edit' : 'view'} onChange={(e) => setPicked((p) => ({ ...p, [m.id]: e.target.value === 'edit' }))}>
                  <option value="view">Can view</option>
                  <option value="edit">Can edit</option>
                </select>
              )}
            </div>
          );
        })}
        {!people.length && <div style={{ color: 'var(--muted)' }}>No other team members yet.</div>}
      </div>
    </Modal>
  );
}
