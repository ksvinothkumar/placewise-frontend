import { MessageSquare, Search } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { asList } from '@/api/hooks';
import { errorMessage } from '@/api/errors';
import { PageHead } from '@/components/ui/Layout';
import { roleLabel } from '@/lib/format';
import { usePresence } from '@/realtime/chatPresence';
import { useSessionStore } from '@/stores/session.store';
import { toast } from '@/stores/ui.store';
import { useChatRealtime, useConversations, useOpenDirect, useTeammates, useTyping } from './hooks';
import { Channel, Face } from './parts';
import { Thread } from './Thread';

const short = (d: string) => {
  const x = new Date(d);
  return x.toDateString() === new Date().toDateString() ? x.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const activate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

export function ChatPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const me = useSessionStore((s) => s.user);
  const { online, connected } = usePresence();
  const convs = asList(useConversations().data);
  const people = useTeammates();
  const openDirect = useOpenDirect();
  const { typing, clear } = useTyping();
  const [q, setQ] = useState('');
  useChatRealtime(id, clear);

  const open = convs.find((c) => c.id === id);
  const needle = q.trim().toLowerCase();
  const list = convs.filter((c) => !needle || (c.name ?? '').toLowerCase().includes(needle));
  const talked = new Set(convs.filter((c) => c.peer).map((c) => c.peer!.id));
  const others = (people.data ?? []).filter((p) => !talked.has(p.id) && (!needle || p.name.toLowerCase().includes(needle)));
  const begin = (uid: string) =>
    openDirect.mutate(uid, {
      onSuccess: (r) => {
        nav('/chat/' + r.id);
        setQ('');
      },
      onError: (e) => toast(errorMessage(e), 'error'),
    });

  return (
    <>
      <PageHead title="Chat" sub="Message teammates in real time">
        <span className="badge" style={{ color: connected ? 'var(--good)' : 'var(--warn)' }} role="status">
          <i className="dot" />
          {connected ? 'Connected' : 'Reconnecting…'}
        </span>
      </PageHead>
      <div className={'card chat ' + (id ? 'has-open' : '')}>
        <div className="chat-list">
          <div className="toolbar" style={{ padding: 12 }}>
            <div className="search" style={{ maxWidth: 'none' }}>
              <Search size={16} />
              <input className="input" placeholder="Search people and chats…" aria-label="Search people and chats" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="scroll">
            <div className="chat-sec">Conversations</div>
            {list.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                aria-current={c.id === id ? 'true' : undefined}
                className={'chat-item ' + (c.id === id ? 'on' : '')}
                onClick={() => nav('/chat/' + c.id)}
                onKeyDown={activate(() => nav('/chat/' + c.id))}
              >
                {c.type === 'channel' || !c.peer ? <Channel /> : <Face p={c.peer} online={online.has(c.peer.id)} />}
                <div className="mid">
                  <div className="row1">
                    <b>{c.type === 'channel' ? 'Everyone' : c.name}</b>
                    {c.lastMessage?.at && <small>{short(c.lastMessage.at)}</small>}
                  </div>
                  <div className="prev">
                    <span className={c.unread ? 'unread' : ''} style={c.unread ? { color: 'var(--text)', fontWeight: 600 } : undefined}>
                      {c.lastMessage ? (c.lastMessage.mine ? 'You: ' : '') + c.lastMessage.text : c.type === 'channel' ? 'Message the whole team' : 'Say hello 👋'}
                    </span>
                  </div>
                </div>
                {c.unread > 0 && <span className="pill" aria-label={`${c.unread} unread`}>{c.unread}</span>}
              </div>
            ))}
            {others.length > 0 && <div className="chat-sec">Start a new chat</div>}
            {others.map((p) => (
              <div key={p.id} role="button" tabIndex={0} className="chat-item" onClick={() => begin(p.id)} onKeyDown={activate(() => begin(p.id))}>
                <Face p={p} online={online.has(p.id)} />
                <div className="mid">
                  <div className="row1"><b>{p.name}</b></div>
                  <div className="prev">{roleLabel(p.role)}{p.title ? ' · ' + p.title : ''}</div>
                </div>
              </div>
            ))}
            {!list.length && !others.length && <div className="empty">No one matches “{q}”</div>}
          </div>
        </div>
        {id && open && me ? (
          <Thread key={id} conv={open} online={online} typing={typing[id]} meId={me.id} onBack={() => nav('/chat')} />
        ) : (
          <div className="empty" style={{ display: 'grid', placeContent: 'center', background: 'var(--surface2)' }}>
            <MessageSquare size={40} strokeWidth={1.4} style={{ margin: '0 auto' }} />
            <b>{id ? 'Conversation not found' : 'Select a conversation'}</b>
            Pick a teammate on the left, or message everyone in the team channel.
          </div>
        )}
      </div>
    </>
  );
}
