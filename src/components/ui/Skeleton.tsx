export const Skeleton = ({ rows = 5 }: { rows?: number }) => (
  <div style={{ padding: 20, display: 'grid', gap: 14 }}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skel" style={{ width: `${90 - i * 7}%` }} />
    ))}
  </div>
);
