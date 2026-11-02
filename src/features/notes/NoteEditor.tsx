import { Pin, PinOff, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { NOTE_COLORS, notebookApi, type NoteColor, type UserNote } from '@/api/endpoints/notebook';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { FormFoot } from '@/components/forms/FormFoot';
import { Field, Modal } from '@/components/ui';
import { toast } from '@/stores/ui.store';
import { ShareDialog } from './ShareDialog';

/** Create, edit or just read a note. People with view-only access see it read-only. */
export function NoteEditor({ note, onClose }: { note: UserNote | null; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [color, setColor] = useState<NoteColor>(note?.color ?? 'yellow');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [sharing, setSharing] = useState(false);
  const readOnly = !!note && !note.canEdit;
  const invalidate = [queryKeys.notebook.all];

  const save = useApiMutation(
    () => (note ? notebookApi.update(note.id, { title, body, color, ...(note.mine ? { pinned } : {}) }) : notebookApi.create({ title, body, color })),
    { invalidate, onSuccess: () => { toast(note ? 'Note saved' : 'Note added'); onClose(); }, onError: (e) => toast(errorMessage(e), 'error') },
  );
  const del = useApiMutation(() => notebookApi.remove(note!.id), {
    invalidate,
    onSuccess: () => { toast('Note deleted'); onClose(); },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  if (sharing && note) return <ShareDialog note={note} onClose={() => setSharing(false)} />;
  return (
    <Modal
      wide
      title={!note ? 'New note' : readOnly ? 'Note' : 'Edit note'}
      sub={note && !note.mine ? `Shared by ${note.owner.name} · ${note.canEdit ? 'you can edit' : 'view only'}` : note ? 'Only you can share or delete this note.' : undefined}
      onClose={onClose}
      footer={
        readOnly ? (
          <button className="btn" onClick={onClose}>Close</button>
        ) : (
          <>
            {note?.mine && (
              <>
                <button className="btn danger" onClick={() => confirm('Delete this note for everyone?') && del.mutate()} disabled={del.isPending}>
                  <Trash2 size={15} />Delete
                </button>
                <button className="btn" onClick={() => setSharing(true)}>
                  <Share2 size={15} />Share{note.sharedCount ? ` (${note.sharedCount})` : ''}
                </button>
                <button className="btn" aria-pressed={pinned} onClick={() => setPinned(!pinned)}>
                  {pinned ? <PinOff size={15} /> : <Pin size={15} />}{pinned ? 'Unpin' : 'Pin'}
                </button>
              </>
            )}
            <span style={{ flex: 1 }} />
            <FormFoot onClose={onClose} busy={save.isPending} label={note ? 'Save' : 'Add note'} onSave={() => save.mutate()} disabled={!title.trim() && !body.trim()} />
          </>
        )
      }
    >
      <Field label="Title">
        <input className="input" autoFocus={!note} maxLength={120} value={title} readOnly={readOnly} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Note">
        <textarea className="input" rows={10} maxLength={10000} value={body} readOnly={readOnly} onChange={(e) => setBody(e.target.value)} />
      </Field>
      {!readOnly && (
        <div className="note-colors" role="radiogroup" aria-label="Colour">
          {NOTE_COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className={'note-swatch note-' + c + (color === c ? ' on' : '')} onClick={() => setColor(c)} />
          ))}
        </div>
      )}
    </Modal>
  );
}
