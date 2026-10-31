import { Loader2 } from 'lucide-react';

/** Cancel / primary-action footer used by the small modals. */
export function Foot({ onClose, busy, label, onSave, disabled }: { onClose: () => void; busy?: boolean; label: string; onSave: () => void; disabled?: boolean }) {
  return (
    <>
      <button className="btn" onClick={onClose}>
        Cancel
      </button>
      <button className="btn primary" onClick={onSave} disabled={busy || disabled}>
        {busy && <Loader2 size={15} className="spin" />}
        {label}
      </button>
    </>
  );
}
