import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  loading?: boolean;
}

/** Thin wrapper over the legacy `.btn` classes so the look is unchanged. */
export function Button({
  variant = 'default',
  size = 'md',
  loading,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const cls = ['btn', variant !== 'default' && variant, size === 'sm' && 'sm', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 size={15} className="spin" />}
      {children}
    </button>
  );
}
