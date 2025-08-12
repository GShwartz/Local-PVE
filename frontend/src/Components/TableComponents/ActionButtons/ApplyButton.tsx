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

  // Inject animation keyframes for the futuristic loader (same as ActionButtons)
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.type = 'text/css';
    styleTag.textContent = `
      @keyframes apply_bar_sweep {
        0% { 
          transform: translateX(-120%) skewX(-15deg);
          opacity: 0;
          filter: blur(2px);
        }
        10% {
          opacity: 0.3;
          filter: blur(1px);
        }
        20% {
          opacity: 1;
          filter: blur(0px);
        }
        80% {
          opacity: 1;
          filter: blur(0px);
        }
        90% {
          opacity: 0.3;
          filter: blur(1px);
        }
        100% { 
          transform: translateX(320%) skewX(-15deg);
          opacity: 0;
          filter: blur(2px);
        }
      }
      
      @keyframes apply_particle_float {
        0%, 100% { 
          transform: translateY(0px) scale(1);
          opacity: 0.6;
        }
        50% { 
          transform: translateY(-2px) scale(1.1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      if (document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, []);

  const getButtonClassName = () => {
    if (isDisabled) {
      return 'bg-gray-600 cursor-not-allowed opacity-60';
    }
    return 'bg-orange-600 hover:bg-orange-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200';
  };

  const getTooltipText = () => {
    if (requiresVMStopped) return "VM must be stopped to apply CPU/RAM changes";
    if (!hasChanges) return "No changes to apply";
    if (isApplying) return "Applying changes...";
    return "Apply changes";
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      width: '100%',
      justifyContent: 'center'
    }}>
      <ActionButton
        onClick={onClick}
        disabled={isDisabled}
        title={getTooltipText()}
        className={getButtonClassName()}
      >
        {isApplying ? 'Applying...' : 'Apply'}
      </ActionButton>

      {/* Clean futuristic loader effect - same as ActionButtons but constrained to button width */}
      {isApplying && (
        <div
          aria-live="polite"
          style={{
            width: '4rem', // Match the typical ActionButton width for "Apply" text
            height: '8px',
            marginTop: '4px',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(90deg, rgba(15,23,42,0.8), rgba(30,41,59,0.9), rgba(15,23,42,0.8))',
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* Primary energy beam */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: '50%',
              background: `
                linear-gradient(90deg, 
                  transparent 0%,
                  rgba(0, 247, 255, 0.2) 10%,
                  rgba(0, 247, 255, 0.8) 30%,
                  rgba(59, 130, 246, 1) 50%,
                  rgba(147, 51, 234, 1) 70%,
                  rgba(236, 72, 153, 0.8) 90%,
                  transparent 100%
                )
              `,
              borderRadius: '12px',
              animation: 'apply_bar_sweep 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
              boxShadow: `
                0 0 20px rgba(0, 247, 255, 0.6),
                0 0 40px rgba(147, 51, 234, 0.4),
                0 0 60px rgba(236, 72, 153, 0.2)
              `,
            }}
          />
          
          {/* Secondary plasma trail */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: '25%',
              background: `
                linear-gradient(90deg, 
                  transparent 0%,
                  rgba(255, 255, 255, 0.4) 20%,
                  rgba(255, 255, 255, 0.9) 50%,
                  rgba(255, 255, 255, 0.4) 80%,
                  transparent 100%
                )
              `,
              borderRadius: '12px',
              animation: 'apply_bar_sweep 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite 300ms',
              filter: 'blur(0.5px)',
              opacity: 0.8,
            }}
          />
          
          {/* Particle effects */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${20 + i * 30}%`,
                top: '50%',
                width: '2px',
                height: '2px',
                background: 'rgba(0, 247, 255, 0.8)',
                borderRadius: '50%',
                transform: 'translateY(-50%)',
                animation: `apply_particle_float 1.5s ease-in-out infinite ${i * 0.3}s`,
                boxShadow: '0 0 4px rgba(0, 247, 255, 0.8)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplyButton;