import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Pin, Plus, Search, StickyNote, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { notebookApi, type NoteScope, type UserNote } from '@/api/endpoints/notebook';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState, PageHead, Skeleton, Tabs } from '@/components/ui';
import { rel } from '@/lib/format';
import { NoteEditor } from './NoteEditor';

const TABS = [['all', 'All'], ['mine', 'My notes'], ['shared', 'Shared with me']] as const;

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Everyone on the team has a notebook. Notes are private until their owner shares them with people or the whole team. */
export function NotesPage() {
  const [scope, setScope] = useState<NoteScope>('all');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [open, setOpen] = useState<UserNote | 'new' | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: [...queryKeys.notebook.all, scope, q],
    queryFn: ({ signal }) => notebookApi.list(scope, q, signal),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHead title="Notes" sub="Write things down and share them with the people who need them.">
        <button className="btn primary" onClick={() => setOpen('new')}>
          <Plus size={16} />
          New note
        </button>
      </PageHead>
      <div className="toolbar" style={{ marginBottom: 14, gap: 12 }}>
        <Tabs tabs={TABS} value={scope} onChange={setScope} />
        <div className="search" style={{ marginLeft: 'auto' }}>
          <Search size={16} />
          <input className="input" placeholder="Search notes…" aria-label="Search notes" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      {isLoading && !data ? (
        <div className="card"><Skeleton rows={4} /></div>
      ) : data?.length ? (
        <div className="notes-grid">
          {data.map((n) => (
            <button key={n.id} type="button" className={'note-card note-' + n.color} onClick={() => setOpen(n)}>
              <div className="note-top">
                {n.title ? <b>{n.title}</b> : <b style={{ opacity: 0.55 }}>Untitled</b>}
                {n.pinned && <Pin size={14} aria-label="Pinned" />}
              </div>
              <p>{n.body}</p>
              <div className="note-foot">
                <span>{n.mine ? 'You' : n.owner.name} · {n.updatedAt ? rel(n.updatedAt) : ''}</span>
                {n.sharedCount > 0 && (
                  <span className="note-shared" title={n.mine ? 'Shared by you' : `Shared by ${n.owner.name}`}>
                    <Users size={13} />
                    {n.mine ? n.sharedCount : n.canEdit ? 'Can edit' : 'View only'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={StickyNote} title={isError ? 'Could not load your notes' : q ? 'No notes match that search' : scope === 'shared' ? 'Nothing has been shared with you yet' : 'No notes yet'} sub={!q && scope !== 'shared' ? 'Click New note to write your first one.' : undefined} />
        </div>
      )}
      {open && <NoteEditor note={open === 'new' ? null : open} onClose={() => setOpen(null)} />}
    </>
  );
}
