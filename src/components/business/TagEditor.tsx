import { useQueryClient } from '@tanstack/react-query';
import { X as XIcon } from 'lucide-react';
import { useState } from 'react';
import { candidateToolsApi } from '@/api/endpoints/candidate-tools';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { toast } from '@/stores/ui.store';

export function TagEditor({ candidate }: { candidate: { id: string; tags?: string[] } }) {
  const qc = useQueryClient();
  const [v, setV] = useState('');
  const tags = candidate.tags ?? [];
  const save = async (next: string[]) => {
    try {
      await candidateToolsApi.setTags(candidate.id, next);
      await qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {tags.map((t) => (
        <span key={t} className="badge brand" style={{ gap: 4 }}>
          #{t}
          <button onClick={() => void save(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}>
            <XIcon size={12} />
          </button>
        </span>
      ))}
      <input
        className="input"
        style={{ width: 130, padding: '3px 10px', fontSize: 12.5 }}
        placeholder="+ add tag"
        aria-label="Add tag"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && v.trim()) {
            void save([...tags, v.trim()]);
            setV('');
          }
        }}
      />
    </div>
  );
}
