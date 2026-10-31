import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  }, [onClose]);
}

export interface ModalProps {
  title: ReactNode;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({ title, sub, onClose, children, footer, wide }: ModalProps) {
  useEscape(onClose);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal ' + (wide ? 'wide' : '')} role="dialog" aria-modal="true">
        <div className="modal-h">
          <div style={{ flex: 1 }}>
            <h2>{title}</h2>
            {sub && <p>{sub}</p>}
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  onClose,
  header,
  children,
  width,
}: {
  onClose: () => void;
  header: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  useEscape(onClose);
  return (
    <>
      <div className="overlay" style={{ zIndex: 60, padding: 0 }} onMouseDown={onClose} />
      <aside className="drawer" style={width ? { width: `min(${width}px,100%)` } : undefined}>
        <div className="drawer-h">
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
            <button className="iconbtn" onClick={onClose} aria-label="Close">
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="drawer-b">{children}</div>
      </aside>
    </>
  );
}
