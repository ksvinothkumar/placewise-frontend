import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAi } from '@/components/business/ai';
import { Modal } from '@/components/ui';

/** "Why this score?" : AI (or template) explanation of a match. */
export function ExplainModal({ name, candidateId, jobId, onClose }: { name: string; candidateId: string; jobId: string; onClose: () => void }) {
  const { run } = useAi();
  const [r, setR] = useState<{ text: string; engine?: string } | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run<{ text: string }>('/match-explain', { candidateId, jobId }).then((x) => setR(x || { text: 'Could not generate an explanation.' }));
  });
  return (
    <Modal
      title="Why this score?"
      sub={name}
      onClose={onClose}
      footer={
        <button className="btn primary" onClick={onClose}>
          Close
        </button>
      }
    >
      {!r ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Loader2 className="spin" color="var(--brand)" />
        </div>
      ) : (
        <p style={{ lineHeight: 1.7, color: 'var(--text2)' }}>
          {r.text}
          <br />
          <span className="badge" style={{ marginTop: 10 }}>
            {r.engine === 'claude' ? 'Written by Claude' : 'Generated from the score breakdown'}
          </span>
        </p>
      )}
    </Modal>
  );
}
