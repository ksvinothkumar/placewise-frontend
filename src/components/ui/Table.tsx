import type { HTMLAttributes, ReactNode } from 'react';

/** The legacy styles target bare `table` elements inside a `.card`, so this only adds the scroll wrapper. */
export function Table({ children, ...rest }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div style={{ overflowX: 'auto' }} {...rest}>
      <table>{children}</table>
    </div>
  );
}
