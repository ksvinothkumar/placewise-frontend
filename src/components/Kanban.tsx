import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface KanbanLane<T> {
  id: string;
  header: ReactNode;
  /** small line under the header (e.g. lane value) */
  sub?: ReactNode;
  items: T[];
}

export interface KanbanProps<T> {
  lanes: KanbanLane<T>[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  /** called once per completed drop or keyboard move into a different lane */
  onMove: (id: string, from: string, to: string) => void;
  onOpen?: (item: T) => void;
  disabled?: boolean;
}

/**
 * Dependency-free kanban (HTML5 drag and drop) that keeps the legacy `.board/.lane/.kcard` markup.
 * Keyboard: Enter/Space opens a card; Alt+ArrowLeft/Right moves it to the neighbouring lane.
 */
export function Kanban<T>({ lanes, getId, getLabel, renderCard, onMove, onOpen, disabled }: KanbanProps<T>) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const from = useRef<string>('');

  const drop = (to: string, e: React.DragEvent) => {
    e.preventDefault();
    const id = dragging ?? e.dataTransfer?.getData('text/plain');
    setOver(null);
    setDragging(null);
    if (id && from.current && from.current !== to) onMove(id, from.current, to);
  };

  const key = (e: KeyboardEvent, item: T, laneIdx: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      onOpen?.(item);
    } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !disabled) {
      e.preventDefault();
      const target = lanes[laneIdx + (e.key === 'ArrowRight' ? 1 : -1)];
      if (target) onMove(getId(item), lanes[laneIdx]!.id, target.id);
    }
  };

  return (
    <div className="board">
      {lanes.map((lane, li) => (
        <div
          key={lane.id}
          role="group"
          aria-label={lane.id}
          className={'lane ' + (over === lane.id ? 'over' : '')}
          onDragOver={(e) => {
            if (disabled || !dragging) return;
            e.preventDefault();
            setOver(lane.id);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === lane.id ? null : o));
          }}
          onDrop={(e) => !disabled && drop(lane.id, e)}
        >
          <div className="lane-h">{lane.header}</div>
          {lane.sub}
          {lane.items.map((item) => {
            const id = getId(item);
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                aria-label={getLabel(item)}
                aria-roledescription="draggable card"
                draggable={!disabled}
                className={'kcard ' + (dragging === id ? 'drag' : '')}
                onDragStart={(e) => {
                  from.current = lane.id;
                  setDragging(id);
                  e.dataTransfer?.setData('text/plain', id);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                onClick={() => onOpen?.(item)}
                onKeyDown={(e) => key(e, item, li)}
                style={{ cursor: disabled ? 'pointer' : 'grab' }}
              >
                {renderCard(item)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
