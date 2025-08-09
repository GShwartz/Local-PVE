import React, { useEffect, useRef, useState } from 'react';

/**
 * Inject the gradient/sweep keyframes once (same names your Suspend/Resume uses).
 */
let _keyframesInjected = false;
function ensureKeyframesInjected() {
  if (_keyframesInjected) return;
  const styleTag = document.createElement('style');
  styleTag.type = 'text/css';
  styleTag.textContent = `
    @keyframes abtn_bar_sweep {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
    }
    @keyframes abtn_bar_gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;
  document.head.appendChild(styleTag);
  _keyframesInjected = true;
}

/**
 * Hook to manage a fixed-duration visual delay/loader.
 * - active: whether loader should animate
 * - start: begin the delay (no-op if already active)
 * - stop: cancel early (will also call onDone)
 */
export function useActionDelay(durationMs: number, onDone?: () => void) {
  const [active, setActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    ensureKeyframesInjected();
  }, []);

  const clear = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = () => {
    if (!active) return;
    clear();
    setActive(false);
    onDone?.();
  };

  const start = () => {
    if (active) return;
    setActive(true);
    clear();
    timerRef.current = window.setTimeout(() => {
      stop();
    }, durationMs);
  };

  useEffect(() => {
    return () => clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { active, start, stop };
}

/**
 * Inline loader that ALWAYS reserves space to avoid layout shift.
 * - When active=true: shows animated bar
 * - When active=false: keeps the same 6px slot but transparent (no movement)
 *
 * NOTE: marginTop defaults to 8px to match SuspendResumeButton spacing.
 */
export const InlineLoader: React.FC<{ active: boolean; marginTop?: number }> = ({
  active,
  marginTop = 8,
}) => {
  return (
    <div
      aria-live="polite"
      style={{
        width: '100%',
        height: '6px',
        marginTop: `${marginTop}px`,
        borderRadius: '9999px',
        background: active ? 'rgba(255,255,255,0.25)' : 'transparent',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {active && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: '30%',
            background:
              'linear-gradient(270deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #b15cff, #ff6b6b)',
            backgroundSize: '600% 600%',
            borderRadius: '9999px',
            animation:
              'abtn_bar_sweep 1200ms ease-in-out infinite, abtn_bar_gradient 6s ease infinite',
          }}
        />
      )}
    </div>
  );
};
