const INV_TONE: Record<string, string> = { draft: '', sent: 'brand', paid: 'good', overdue: 'bad', cancelled: '' };
export const InvBadge = ({ s }: { s: string }) => (
  <span className={'badge ' + (INV_TONE[s] ?? '')} style={{ textTransform: 'capitalize' }}>
    {s}
  </span>
);
