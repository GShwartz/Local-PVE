import { useState, useEffect, useRef } from 'react';

interface Position { x: number; y: number; }

export function useDraggable() {
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      setPos({
        x: drag.current.originX + (e.clientX - drag.current.startX),
        y: drag.current.originY + (e.clientY - drag.current.startY),
      });
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    drag.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y };
    e.preventDefault();
  };

  return {
    /** Apply transform to the modal's outer container */
    modalStyle: { transform: `translate(${pos.x}px, ${pos.y}px)` } as React.CSSProperties,
    /** Spread onto the drag-handle element (modal header bar) */
    dragHandleProps: { onMouseDown, style: { cursor: 'grab' } as React.CSSProperties },
    /** Call when modal closes to snap back to center next time it opens */
    resetPosition: () => setPos({ x: 0, y: 0 }),
  };
}
