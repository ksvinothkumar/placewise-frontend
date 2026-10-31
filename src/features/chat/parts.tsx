import { ShieldCheck, UserRound, Users } from 'lucide-react';
import type { ChatPeer } from '@/api/endpoints/chat';
import { CandidatePhoto } from '@/components/ui/Avatar';
import { roleLabel } from '@/lib/format';

export const Face = ({ p, size = 40, online }: { p: Pick<ChatPeer, 'id' | 'name' | 'photoAt'>; size?: number; online?: boolean }) => (
  <div className="presence">
    <CandidatePhoto c={{ id: p.id, name: p.name, photoAt: p.photoAt }} size={size} path={`/chat/users/${p.id}/photo`} />
    {online !== undefined && <i className={online ? 'on' : ''} role="img" aria-label={online ? 'Online' : 'Offline'} />}
  </div>
);

export const Channel = ({ size = 40 }: { size?: number }) => (
  <div className="chan" style={{ width: size, height: size }}><Users size={size * 0.45} /></div>
);

export const RoleTag = ({ role }: { role: string }) => (
  <span className={'badge ' + (role === 'admin' ? 'brand' : 'info')} style={{ fontSize: 11, padding: '0 8px' }}>
    {role === 'admin' ? <ShieldCheck size={11} /> : <UserRound size={11} />}
    {roleLabel(role)}
  </span>
);
