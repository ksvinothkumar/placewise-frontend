import { ArrowLeft, Check, CheckCheck, Loader2, MessageSquare, RotateCw, Send, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ChatConversation } from '@/api/endpoints/chat';
import { flatten, type ThreadMessage } from './messageCache';
import { sendTyping } from './chatSocket';
import { useMarkRead, useSend, useStickyScroll, useThread } from './hooks';
import { Channel, Face, RoleTag } from './parts';

const time = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dayKey = (d: string) => new Date(d).toDateString();
const dayLabel = (d: string) => {
  const t = new Date();
  const x = new Date(d);
  const y = new Date(t);
  y.setDate(t.getDate() - 1);
  return x.toDateString() === t.toDateString() ? 'Today' : x.toDateString() === y.toDateString() ? 'Yesterday' : x.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

interface Props {
  conv: ChatConversation;
  online: ReadonlySet<string>;
  typing?: { name: string };
  meId: string;
  onBack: () => void;
}

export function Thread({ conv, online, typing, meId, onBack }: Props) {
  const thread = useThread(conv.id);
  const { send, retry, discard } = useSend(conv.id);
  const markRead = useMarkRead();
  const [text, setText] = useState('');
  const { box, stick, onScroll } = useStickyScroll();
  const area = useRef<HTMLTextAreaElement>(null);
  const direct = conv.type === 'direct';
  const peer = conv.peer;
  const msgs = useMemo(() => flatten(thread.data), [thread.data]);
  const loaded = thread.isSuccess;

  // opening a thread (or its first successful load) marks it read
  useEffect(() => {
    if (loaded) markRead(conv.id);
  }, [loaded, conv.id, markRead]);

  useLayoutEffect(() => {
    if (stick.current && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [msgs, typing, box, stick]);

  const older = async () => {
    const b = box.current;
    const h = b?.scrollHeight ?? 0;
    stick.current = false;
    await thread.fetchNextPage();
    requestAnimationFrame(() => {
      if (box.current) box.current.scrollTop = box.current.scrollHeight - h;
    });
  };

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    stick.current = true;
    if (area.current) area.current.style.height = '';
    void send(t);
    area.current?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const rows = useMemo(() => {
    let last = '';
    return msgs.map((m) => {
      const k = dayKey(m.createdAt);
      const sep = k !== last;
      last = k;
      return { m, sep };
    });
  }, [msgs]);
  const first = (direct ? conv.name : 'the team')?.split(' ')[0];

  const bubble = (m: ThreadMessage, mine: boolean) => {
    const read = direct && !!peer && m.readBy.includes(peer.id);
    return (
      <div className={'bub-row ' + (mine ? 'me' : '')}>
        <div className="bub" style={m.pending ? { opacity: m.pending === 'failed' ? 0.8 : 0.65 } : undefined} data-pending={m.pending}>
          {!direct && !mine && <div className="who-n">{m.sender.name}</div>}
          {m.text}
          <div className="meta">
            {m.pending === 'sending' ? (
              <span>Sending…</span>
            ) : m.pending === 'failed' ? (
              <>
                <span style={{ color: 'var(--bad)' }}>Not sent</span>
                <button type="button" className="iconbtn" style={{ width: 20, height: 20 }} aria-label="Retry sending" onClick={() => void retry(m)}><RotateCw size={12} /></button>
                <button type="button" className="iconbtn" style={{ width: 20, height: 20 }} aria-label="Discard message" onClick={() => discard(m)}><X size={12} /></button>
              </>
            ) : (
              <>
                {time(m.createdAt)}
                {mine && direct && (read ? <CheckCheck size={13} aria-label="Read" /> : <Check size={13} aria-label="Sent" />)}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="thread">
      <div className="thread-h">
        <button type="button" className="iconbtn no-desktop" style={{ display: 'none' }} onClick={onBack} aria-label="Back to conversations"><ArrowLeft size={16} /></button>
        {direct && peer ? <Face p={peer} size={42} online={online.has(peer.id)} /> : <Channel size={42} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <b style={{ fontSize: 15.5 }}>{direct ? conv.name : 'Everyone'}</b>
            {direct && peer && <RoleTag role={peer.role} />}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {direct && peer ? (
              <>
                {online.has(peer.id) ? <span style={{ color: 'var(--good)' }}>● Online</span> : 'Offline'}
                {peer.title ? ' · ' + peer.title : ''}
              </>
            ) : (
              'Team channel · everyone at Placewise'
            )}
          </div>
        </div>
      </div>
      <div className="msgs" ref={box} onScroll={onScroll} role="log" aria-live="polite" aria-label="Messages">
        {thread.isLoading ? (
          <div style={{ margin: 'auto' }}><Loader2 className="spin" color="var(--brand)" /></div>
        ) : (
          <>
            {thread.hasNextPage && (
              <button type="button" className="btn sm" style={{ alignSelf: 'center', marginBottom: 8 }} disabled={thread.isFetchingNextPage} onClick={() => void older()}>
                Load earlier messages
              </button>
            )}
            {!msgs.length && (
              <div className="empty" style={{ margin: 'auto' }}>
                <MessageSquare size={34} strokeWidth={1.4} />
                <b>No messages yet</b>Send the first message to {first}.
              </div>
            )}
            {rows.map(({ m, sep }) => (
              <div key={m.id} style={{ display: 'contents' }}>
                {sep && <div className="day-sep">{dayLabel(m.createdAt)}</div>}
                {bubble(m, m.sender.id === meId)}
              </div>
            ))}
          </>
        )}
      </div>
      <div className="typing" aria-live="polite">
        {typing && <span className="dots"><span /><span /><span /> {typing.name.split(' ')[0]} is typing…</span>}
      </div>
      <div className="composer">
        <textarea
          ref={area}
          className="input"
          rows={1}
          aria-label={`Message ${direct ? first : 'everyone'}`}
          placeholder={`Message ${direct ? first : 'everyone'}…  (Enter to send, Shift+Enter for a new line)`}
          value={text}
          maxLength={2000}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
            if (e.target.value) sendTyping(conv.id);
          }}
          onKeyDown={onKey}
        />
        <button type="button" className="btn primary" onClick={submit} disabled={!text.trim()} style={{ height: 42 }}>
          <Send size={16} />Send
        </button>
      </div>
    </div>
  );
}
