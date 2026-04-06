import React, { useEffect } from 'react';
import ActionButton from './ActionButton';

interface ApplyButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasChanges: boolean;
  requiresVMStopped: boolean;
  isApplying: boolean;
}

const ApplyButton = ({
  onClick,
  hasChanges,
  requiresVMStopped,
  isApplying,
}: ApplyButtonProps) => {
  const isDisabled = !hasChanges || requiresVMStopped || isApplying;

  // Inject the same sweep keyframe used by the ActionButtons loader
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes abtn_progress_sweep {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      if (document.head.contains(styleTag)) document.head.removeChild(styleTag);
    };
  }, []);

  const getTooltipText = () => {
    if (requiresVMStopped) return 'VM must be stopped to apply CPU/RAM changes';
    if (!hasChanges) return 'No changes to apply';
    if (isApplying) return 'Applying changes…';
    return 'Apply changes';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', gap: '5px' }}>
      <ActionButton
        onClick={onClick}
        disabled={isDisabled}
        variant="orange"
        title={getTooltipText()}
      >
        {isApplying ? 'Applying…' : 'Apply'}
      </ActionButton>

      {/* Indeterminate progress bar — identical style to the ActionButtons loader */}
      {isApplying && (
        <div
          aria-live="polite"
          style={{
            width: '100%',
            height: '3px',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
            background: 'rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: '30%',
              background: 'linear-gradient(90deg, rgba(234,88,12,0.5), rgba(234,88,12,1), rgba(234,88,12,0.5))',
              borderRadius: '2px',
              animation: 'abtn_progress_sweep 1.5s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ApplyButton;
