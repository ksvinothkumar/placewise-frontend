import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { candidateToolsApi } from '@/api/endpoints/candidate-tools';
import { errorMessage } from '@/api/errors';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';

/** Runs an AI endpoint with a busy flag; tells the user when the built-in template fallback answered instead of Claude. */
export function useAi() {
  const ai = useSessionStore((s) => s.ai);
  const [busy, setBusy] = useState(false);
  const run = async <T,>(path: string, body: unknown): Promise<(T & { engine?: string }) | null> => {
    setBusy(true);
    try {
      const r = await candidateToolsApi.ai<T>(path, body);
      if (r.engine === 'template' && !ai) toast('Drafted from a template. Add ANTHROPIC_API_KEY to enable Claude.');
      return r;
    } catch (e) {
      toast(errorMessage(e), 'error');
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, ai };
}

export const AiButton = ({ busy, onClick, label = 'Write with AI', disabled }: { busy?: boolean; onClick: () => void; label?: string; disabled?: boolean }) => (
  <button type="button" className="btn sm" onClick={onClick} disabled={busy || disabled} style={{ color: 'var(--brand-text)', borderColor: 'var(--brand-soft)', background: 'var(--brand-soft)' }}>
    {busy ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
    {label}
  </button>
);
