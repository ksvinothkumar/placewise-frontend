import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Copy, Globe, KeyRound, Share2, Loader2, Mail, MessageCircle, Plus, Send, Sparkles, Trash2, Webhook as WebhookIcon, X, XCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { integrationsApi, webhooksApi, type Webhook, type WebhookInput } from '@/api/endpoints/webhooks';
import { errorMessage } from '@/api/errors';
import { useApiMutation } from '@/api/hooks';
import { queryKeys } from '@/api/queryKeys';
import { Field, PageHead } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/stores/ui.store';

const statusKey = [...queryKeys.webhooks.all, 'status'] as const;
const listKey = [...queryKeys.webhooks.all, 'list'] as const;
const deliveriesKey = (id: string) => [...queryKeys.webhooks.all, 'deliveries', id] as const;

const Status = ({ on, yes = 'Connected', no = 'Not set up' }: { on?: boolean; yes?: string; no?: string }) => (
  <span className="badge" style={{ color: on ? 'var(--good)' : 'var(--muted)' }}>
    {on ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
    {on ? yes : no}
  </span>
);
const when = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

function DeliveriesModal({ hook, onClose }: { hook: Webhook; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: deliveriesKey(hook.id), queryFn: () => webhooksApi.deliveries(hook.id) });
  return (
    <Modal title={`Deliveries · ${hook.name}`} sub="The latest 30, kept for 14 days." onClose={onClose} wide>
      {isLoading ? (
        <Skeleton rows={3} />
      ) : !data?.length ? (
        <small>Nothing sent yet.</small>
      ) : (
        <div>
          {data.map((x) => (
            <div key={x.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
              {x.ok ? <CheckCircle2 size={15} color="var(--good)" aria-label="Delivered" /> : <X size={15} color="var(--bad)" aria-label="Failed" />}
              <code>{x.event}</code>
              <small style={{ flex: 1, color: 'var(--muted)' }}>
                {x.ok ? `HTTP ${x.statusCode}` : x.error}
                {(x.attempt ?? 0) > 1 ? ' · retry' : ''}
              </small>
              <small style={{ color: 'var(--muted)' }}>{x.durationMs}ms · {when(x.createdAt)}</small>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function IntegrationsPage() {
  const status = useQuery({ queryKey: statusKey, queryFn: () => integrationsApi.status() });
  const hooks = useQuery({ queryKey: listKey, queryFn: () => webhooksApi.list() });
  const [mk, setMk] = useState<WebhookInput | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [log, setLog] = useState<Webhook | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const events = hooks.data?.events ?? [];
  const invalidate = [queryKeys.webhooks.all];
  const fail = (e: unknown) => toast(errorMessage(e), 'error');

  const testMail = useApiMutation(() => integrationsApi.testEmail(), {
    onSuccess: (r) => toast(r.status === 'sent' ? `Test email sent to ${r.to}` : r.status === 'simulated' ? 'Dry-run mode: nothing was sent' : (r.error ?? 'Could not send'), r.status === 'failed' ? 'error' : 'ok'),
    onError: fail,
  });
  const create = useApiMutation((b: WebhookInput) => webhooksApi.create(b), {
    invalidate,
    onSuccess: (h) => {
      setMk(null);
      setSecret(h.secret ?? null);
    },
    onError: fail,
  });
  const test = useApiMutation((h: Webhook) => webhooksApi.test(h.id), {
    invalidate,
    onMutate: (h) => setTesting(h.id),
    onSuccess: (r) => toast(r.ok ? `Delivered (HTTP ${r.statusCode})` : `Failed: ${r.error}`, r.ok ? 'ok' : 'error'),
    onError: fail,
    onSettled: () => setTesting(null),
  });
  const toggle = useApiMutation((h: Webhook) => webhooksApi.update(h.id, { active: !h.active }), { invalidate, onError: fail });
  const rotate = useApiMutation((h: Webhook) => webhooksApi.rotateSecret(h.id), { onSuccess: (r) => setSecret(r.secret), onError: fail });
  const remove = useApiMutation((h: Webhook) => webhooksApi.remove(h.id), { invalidate, onError: fail });

  if (status.isLoading && !status.data) {
    return (
      <>
        <PageHead title="Integrations" />
        <div className="card"><Skeleton rows={6} /></div>
      </>
    );
  }
  const d = status.data ?? {};
  const cards: [typeof Mail, string, ReactNode, string, ReactNode][] = [
    [
      Mail, 'Email (SMTP)', <Status key="s" on={d.email?.configured} />,
      d.email?.configured ? `Sending from ${d.email.from} via ${d.email.host}.` : 'Add SMTP settings to the server environment to send invites and notifications.',
      d.email?.configured && (
        <button type="button" className="btn sm" onClick={() => testMail.mutate()} disabled={testMail.isPending}>
          {testMail.isPending ? <Loader2 size={13} className="spin" /> : <Send size={13} />}Send test email
        </button>
      ),
    ],
    [
      Sparkles, 'AI assistant (Claude)', <Status key="s" on={d.ai?.enabled} yes="On" no="Using templates" />,
      d.ai?.enabled ? `Resume parsing and writing help use ${d.ai.model}.` : 'Set ANTHROPIC_API_KEY on the server for AI parsing. Without it, rule-based parsing and templates are used.', null,
    ],
    [Globe, 'Careers site', <Status key="s" on={(d.careers?.published ?? 0) > 0} yes={`${d.careers?.published} live`} no="No public jobs" />, 'Open jobs marked public appear at /careers and applicants land in your talent pool.', null],
    [CalendarDays, 'Calendar feed (ICS)', <Status key="s" on yes="Available" />, 'Each user can subscribe to their interviews from Google Calendar, Outlook or Apple Calendar in their profile.', null],
    [MessageCircle, 'WhatsApp', <Status key="s" on yes="Click-to-chat" />, 'One-click WhatsApp message links on candidates. The WhatsApp Business API is not connected.', null],
    [Share2, 'LinkedIn, Google sign-in, IMAP, SMS', <Status key="s" on={false} no="Not included" />, 'These need partner approval or OAuth apps and are not built in. Use webhooks below to connect other tools.', null],
  ];
  const items = hooks.data?.items ?? [];

  return (
    <>
      <PageHead title="Integrations" sub="See what is connected and send events to your other tools.">
        <button type="button" className="btn primary" onClick={() => setMk({ name: '', url: '', events: [] })}><Plus size={16} />New webhook</button>
      </PageHead>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', marginBottom: 20 }}>
        {cards.map(([I, t, s, txt, act]) => (
          <div key={t} className="card">
            <div className="card-b" style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><I size={20} /><b style={{ flex: 1 }}>{t}</b>{s}</div>
              <small style={{ color: 'var(--muted)' }}>{txt}</small>
              {act}
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-h">
          <h3><WebhookIcon size={16} style={{ verticalAlign: -3 }} /> Outgoing webhooks</h3>
          <small>Placewise sends a signed JSON POST when something happens.</small>
        </div>
        {!items.length ? (
          <div className="card-b"><small style={{ color: 'var(--muted)' }}>No webhooks yet. Add one to push new candidates, stage changes and placements to Zapier, Make, Slack or your own system.</small></div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((h) => (
              <li key={h.id} style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <b>{h.name}</b>
                    {!h.active && <span className="badge">Paused</span>}
                    {h.last && <span className="badge" style={{ color: h.last.ok ? 'var(--good)' : 'var(--bad)' }}>{h.last.ok ? 'Last delivery OK' : 'Last delivery failed'}</span>}
                  </div>
                  <small style={{ color: 'var(--muted)', display: 'block', wordBreak: 'break-all' }}>{h.url}</small>
                  <small style={{ color: 'var(--muted)' }}>{h.events.join(', ')}</small>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className="btn sm" onClick={() => test.mutate(h)} disabled={testing === h.id} aria-label={`Send test to ${h.name}`}>
                    {testing === h.id ? <Loader2 size={13} className="spin" /> : <Send size={13} />}Test
                  </button>
                  <button type="button" className="btn sm" onClick={() => setLog(h)} aria-label={`Deliveries for ${h.name}`}>Deliveries</button>
                  <button type="button" className="btn sm" onClick={() => toggle.mutate(h)} aria-label={`${h.active ? 'Pause' : 'Resume'} ${h.name}`}>{h.active ? 'Pause' : 'Resume'}</button>
                  <button type="button" className="btn sm" onClick={() => confirm('Create a new signing secret? The old one stops working.') && rotate.mutate(h)} aria-label={`New secret for ${h.name}`}><KeyRound size={13} />New secret</button>
                  <button type="button" className="btn sm danger" onClick={() => confirm(`Delete "${h.name}"?`) && remove.mutate(h)} aria-label={`Delete ${h.name}`}><Trash2 size={13} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {mk && (
        <Modal
          title="New webhook"
          sub="We will POST JSON to this address."
          onClose={() => setMk(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setMk(null)}>Cancel</button>
              <button type="button" className="btn primary" onClick={() => create.mutate({ ...mk, name: mk.name.trim(), url: mk.url.trim() })} disabled={create.isPending || !mk.name.trim() || !mk.url.trim() || !mk.events.length}>
                {create.isPending && <Loader2 size={14} className="spin" />}Create
              </button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Name"><input className="input" value={mk.name} onChange={(e) => setMk({ ...mk, name: e.target.value })} placeholder="Zapier – new candidates" /></Field>
            <Field label="URL (https)"><input className="input" value={mk.url} onChange={(e) => setMk({ ...mk, url: e.target.value })} placeholder="https://hooks.example.com/…" /></Field>
            <div className="field" role="group" aria-labelledby="wh-events">
              <span id="wh-events">Events</span>
              <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                {events.map((ev) => (
                  <label key={ev} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={mk.events.includes(ev)} onChange={() => setMk({ ...mk, events: mk.events.includes(ev) ? mk.events.filter((x) => x !== ev) : [...mk.events, ev] })} />
                    <code>{ev}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {secret && (
        <Modal title="Signing secret" sub="Copy it now. It will not be shown again." onClose={() => setSecret(null)} footer={<button type="button" className="btn primary" onClick={() => setSecret(null)}>Done</button>}>
          <code data-testid="webhook-secret" style={{ display: 'block', padding: 12, background: 'var(--surface2)', borderRadius: 10, wordBreak: 'break-all' }}>{secret}</code>
          <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={() => void navigator.clipboard?.writeText(secret)}><Copy size={13} />Copy</button>
          <small style={{ display: 'block', marginTop: 12, color: 'var(--muted)' }}>
            Each request carries <code>X-Placewise-Signature: sha256=…</code>, an HMAC-SHA256 of the raw body using this secret. Verify it before trusting the payload.
          </small>
        </Modal>
      )}
      {log && <DeliveriesModal hook={log} onClose={() => setLog(null)} />}
    </>
  );
}
