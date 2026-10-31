import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { interviewsApi } from '@/api/endpoints/interviews';
import { errorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

export function InvitePreview({ interviewId, onClose }: { interviewId: string; onClose: () => void }) {
  const { data, error, isLoading } = useQuery({
    queryKey: [...queryKeys.interviews.all, 'invite-preview', interviewId],
    queryFn: () => interviewsApi.invitePreview(interviewId),
  });
  return (
    <Modal wide title="Invite email" sub={data ? `To ${data.to} · ${data.subject}` : ''} onClose={onClose}>
      {isLoading ? (
        <Skeleton rows={6} />
      ) : error || !data ? (
        <div className="banner bad">{errorMessage(error)}</div>
      ) : (
        <>
          {!data.live && (
            <div className="banner warn">
              <AlertTriangle size={16} />
              Email delivery is not configured (set SMTP_* in the server environment). This is a preview; nothing was sent.
            </div>
          )}
          <iframe title="Invite email preview" sandbox="" srcDoc={data.html} style={{ width: '100%', height: '62vh', border: '1px solid var(--line)', borderRadius: 10, marginTop: 14, background: '#f4f5f9' }} />
        </>
      )}
    </Modal>
  );
}
