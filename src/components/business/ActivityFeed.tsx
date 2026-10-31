import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Mail, MessageCircle, MessageSquare, Phone, Send, Settings2, Trash2, Users, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { notesApi, teamApi, type Note, type NoteKind } from '@/api/endpoints/notes';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { Skeleton } from '@/components/ui/Skeleton';
import { rel } from '@/lib/format';
import { toast } from '@/stores/ui.store';

const KINDS: Record<NoteKind, [LucideIcon, string, string]> = {
  comment: [MessageSquare, 'Comment', 'var(--brand)'],
  call: [Phone, 'Call', 'var(--good)'],
  meeting: [Users, 'Meeting', 'var(--warn)'],
  email: [Mail, 'Email', 'var(--info)'],
  whatsapp: [MessageCircle, 'WhatsApp', '#128c7e'],
  system: [Settings2, 'Update', 'var(--muted)'],
};
const OUTCOMES = ['Connected', 'No answer', 'Left message', 'Call back later', 'Not interested'];
const PLACEHOLDER: Record<string, string> = {
  comment: 'Write a comment. Type @ to mention a teammate…',
  call: 'What was discussed on the call?',
  meeting: 'Meeting notes…',
  email: 'Summary of the email…',
  whatsapp: 'Summary of the chat…',
};
type PostKind = Exclude<NoteKind, 'system'>;

// render "@Name" tokens (for people who were actually mentioned) in the brand colour
function Mentioned({ text, names }: { text: string; names?: string[] }) {
  if (!names?.length) return <>{text}</>;
  const rx = new RegExp('(@(?:' + names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + '))', 'g');
  return (
    <>
      {text.split(rx).map((p, i) =>
        i % 2 ? (
          <b key={i} style={{ color: 'var(--brand-text)', background: 'var(--brand-soft)', borderRadius: 4, padding: '0 3px' }}>
            {p}
          </b>
        ) : (
          p
        ),
      )}
    </>
  );
}

export const notesKey = (entityType: string, entityId: string) => ['api', '/notes', { entityType, entityId }] as const;

export function ActivityFeed({ entityType, entityId, title = 'Activity', canLog = true, onChange }: { entityType: 'candidate' | 'company' | 'contact'; entityId: string; title?: string; canLog?: boolean; onChange?: () => void }) {
  const qc = useQueryClient();
  const { data: feed, isLoading } = useQuery({ queryKey: notesKey(entityType, entityId), queryFn: () => notesApi.list(entityType, entityId) });
  const { data: team } = useQuery({ queryKey: ['api', '/chat/users', null], queryFn: teamApi.users });
  const [kind, setKind] = useState<PostKind>('comment');
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState('');
  const [mins, setMins] = useState('');
  const [at, setAt] = useState<number | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const q = at != null ? text.slice(at + 1, ta.current?.selectionStart ?? text.length) : null;
  const matches = q != null ? (team ?? []).filter((u) => u.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const onType = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    const pos = e.target.selectionStart;
    const m = /(?:^|\s)@([\w.' -]{0,24})$/.exec(v.slice(0, pos));
    setAt(m ? pos - (m[1]?.length ?? 0) - 1 : null);
  };
  const choose = (u: { id: string; name: string }) => {
    const el = ta.current;
    if (!el || at == null) return;
    const pos = el.selectionStart;
    setText(text.slice(0, at) + '@' + u.name + ' ' + text.slice(pos));
    setPicked((p) => ({ ...p, [u.name]: u.id }));
    const c = at + u.name.length + 2;
    setAt(null);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(c, c);
    }, 0);
  };
  const kinds: PostKind[] = ['comment', ...(canLog ? (['call', 'meeting', 'email', 'whatsapp'] as const) : [])];
  const post = useApiMutation(
    () =>
      notesApi.create({
        entityType,
        entityId,
        kind,
        text,
        outcome: kind === 'call' && outcome ? outcome : undefined,
        durationMin: kind === 'call' || kind === 'meeting' ? +mins || undefined : undefined,
        mentions: Object.entries(picked)
          .filter(([n]) => text.includes('@' + n))
          .map(([, id]) => id),
      }),
    {
      onSuccess: () => {
        setText('');
        setPicked({});
        setOutcome('');
        setMins('');
        void qc.invalidateQueries({ queryKey: notesKey(entityType, entityId) });
        onChange?.();
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    },
  );
  const del = useApiMutation((n: Note) => notesApi.remove(n.id), {
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKey(entityType, entityId) }),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const items = feed ?? [];
  const label = KINDS[kind][1];
  return (
    <div className="card">
      <div className="card-h">
        <MessageSquare size={17} color="var(--brand)" />
        <h3>{title}</h3>
        <small>{items.length} entries</small>
      </div>
      <div className="card-b">
        <div className="seg" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          {kinds.map((k) => {
            const [I, l] = KINDS[k];
            return (
              <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                <I size={13} />
                {l}
              </button>
            );
          })}
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={ta}
            className="textarea"
            style={{ minHeight: 78 }}
            aria-label={`${label} text`}
            value={text}
            onChange={onType}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAt(null);
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) post.mutate();
            }}
            placeholder={PLACEHOLDER[kind]}
          />
          {matches.length > 0 && (
            <div className="menu" role="listbox" style={{ left: 8, right: 'auto', top: 'auto', bottom: -4, transform: 'translateY(100%)', minWidth: 220 }}>
              {matches.map((u) => (
                <button
                  key={u.id}
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(u);
                  }}
                >
                  <b>{u.name}</b>
                  <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontSize: 12 }}>{u.title || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {kind === 'call' && (
            <select className="select" aria-label="Call outcome" style={{ width: 160 }} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="">Outcome…</option>
              {OUTCOMES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          )}
          {(kind === 'call' || kind === 'meeting') && (
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
              <Clock size={14} />
              <input className="input" type="number" min="0" aria-label="Duration in minutes" style={{ width: 70, padding: '5px 8px' }} value={mins} onChange={(e) => setMins(e.target.value)} />
              min
            </label>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>⌘/Ctrl + Enter to post</span>
          <button className="btn primary sm" disabled={post.isPending || !text.trim()} onClick={() => post.mutate()}>
            {post.isPending ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
            {kind === 'comment' ? 'Comment' : 'Log ' + label.toLowerCase()}
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          {isLoading ? (
            <Skeleton rows={3} />
          ) : !items.length ? (
            <div style={{ color: 'var(--muted)', fontSize: 13.5, padding: '10px 0' }}>Nothing here yet. Add the first comment or log a call.</div>
          ) : (
            items.map((n) => {
              const [I, l, c] = KINDS[n.kind] ?? KINDS.comment;
              return (
                <div key={n.id} style={{ display: 'flex', gap: 12, padding: '11px 0', borderTop: '1px solid var(--line2)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface2)', color: c, display: 'grid', placeItems: 'center', flex: 'none' }}>
                    <I size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <b style={{ color: 'var(--text)' }}>{n.byName || 'System'}</b>
                      <span>{n.kind === 'system' ? 'updated' : n.kind === 'comment' ? 'commented' : 'logged a ' + l.toLowerCase()}</span>
                      {n.outcome && <span className="badge good">{n.outcome}</span>}
                      {n.durationMin && <span className="badge">{n.durationMin} min</span>}
                      <span title={new Date(n.createdAt).toLocaleString('en-IN')}>· {rel(n.createdAt)}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: 3, color: n.kind === 'system' ? 'var(--text2)' : 'var(--text)', fontSize: 14 }}>
                      <Mentioned text={n.text} names={n.mentions?.map((m) => m.name)} />
                    </div>
                  </div>
                  {n.canDelete && n.kind !== 'system' && (
                    <button
                      className="iconbtn"
                      style={{ width: 28, height: 28 }}
                      onClick={() => {
                        if (confirm('Delete this entry?')) del.mutate(n);
                      }}
                      aria-label="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
