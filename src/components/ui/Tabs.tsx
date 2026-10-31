export interface TabsProps<K extends string> {
  tabs: readonly (readonly [K, string])[];
  value: K;
  onChange: (key: K) => void;
  style?: React.CSSProperties;
}

/** Segmented control (`.seg`) used for tab-like switching. */
export function Tabs<K extends string>({ tabs, value, onChange, style }: TabsProps<K>) {
  return (
    <div className="seg" style={style}>
      {tabs.map(([k, label]) => (
        <button key={k} type="button" className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}
