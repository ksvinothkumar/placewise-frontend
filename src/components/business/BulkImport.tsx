import { useQueryClient } from '@tanstack/react-query';
import { Loader2, X as XIcon } from 'lucide-react';
import { useState } from 'react';
import { candidateToolsApi, type BulkResult } from '@/api/endpoints/candidate-tools';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/stores/ui.store';

const kb = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

export function BulkImport({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<BulkResult | null>(null);
  const [over, setOver] = useState(false);
  const add = (list: FileList | File[]) => setFiles((f) => [...f, ...[...list].filter((x) => !f.some((y) => y.name === x.name && y.size === x.size))].slice(0, 30));
  const run = async () => {
    setBusy(true);
    try {
      const r = await candidateToolsApi.bulkImport(files);
      setRes(r);
      void qc.invalidateQueries({ queryKey: queryKeys.candidates.all });
      toast(`${r.created} candidate${r.created === 1 ? '' : 's'} imported`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      wide
      title="Bulk resume import"
      sub="Drop up to 30 resumes. Each one becomes a candidate with the original file attached."
      onClose={onClose}
      footer={
        res ? (
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" disabled={!files.length || busy} onClick={() => void run()}>
              {busy && <Loader2 size={15} className="spin" />}Import {files.length || ''} resume{files.length === 1 ? '' : 's'}
            </button>
          </>
        )
      }
    >
      {!res && (
        <>
          <label
            className={'dropzone ' + (over ? 'over' : '')}
            style={{ display: 'block' }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              add(e.dataTransfer.files);
            }}
          >
            <input
              type="file"
              multiple
              hidden
              accept=".pdf,.docx,.txt,.rtf,.md"
              aria-label="Choose resumes"
              onChange={(e) => {
                if (e.target.files) add(e.target.files);
                e.target.value = '';
              }}
            />
            <b>Drop resumes here, or click to choose</b>
            <span>PDF · Word (.docx) · TXT · RTF · up to 8 MB each</span>
          </label>
          {files.length > 0 && (
            <div style={{ marginTop: 14, maxHeight: 230, overflow: 'auto' }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 2px', borderBottom: '1px solid var(--line2)', fontSize: 13.5 }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ color: 'var(--muted)' }}>{kb(f.size)}</span>
                  <button className="iconbtn" style={{ width: 26, height: 26 }} disabled={busy} onClick={() => setFiles((l) => l.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                    <XIcon size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {busy && (
            <div className="banner">
              <Loader2 size={16} className="spin" />
              Reading {files.length} resume{files.length === 1 ? '' : 's'}. This can take a little while with AI parsing on…
            </div>
          )}
        </>
      )}
      {res && (
        <>
          <div style={{ display: 'flex', gap: 10, margin: '14px 0', flexWrap: 'wrap' }}>
            <span className="badge good">{res.created} imported</span>
            {res.duplicates > 0 && <span className="badge warn">{res.duplicates} already in the pool</span>}
            {res.failed > 0 && <span className="badge bad">{res.failed} could not be read</span>}
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {res.results.map((r, i) => (
                <tr key={i}>
                  <td>{r.file}</td>
                  <td>
                    {r.status === 'created' && r.candidate ? (
                      <span>
                        <span className="badge good">Added</span> <a href={'/candidates/' + r.candidate.id}>{r.candidate.name}</a>{' '}
                        <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{r.candidate.skills} skills</span>
                      </span>
                    ) : r.status === 'duplicate' && r.candidate ? (
                      <span>
                        <span className="badge warn">Duplicate</span> matches <a href={'/candidates/' + r.candidate.id}>{r.candidate.name}</a>
                      </span>
                    ) : (
                      <span>
                        <span className="badge bad">Skipped</span> <span style={{ color: 'var(--text2)', fontSize: 13 }}>{r.error}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Modal>
  );
}
