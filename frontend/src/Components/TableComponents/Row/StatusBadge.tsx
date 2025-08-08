import React from 'react';
import { FaPlay, FaStop, FaPause, FaQuestion } from 'react-icons/fa';

interface StatusBadgeProps {
  status: string;
  resumeShowing?: boolean;   // made optional
  resumeEnabled?: boolean;   // made optional
  startDisabled?: boolean;   // made optional
  ipAddress?: string;        // made optional
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  resumeShowing = false,
  resumeEnabled = false,
  startDisabled = false,
  ipAddress = 'N/A',
}) => {
  const normalizedStatus = (status || '').trim().toLowerCase();
  const ipIsNA = (ipAddress || '').trim().toUpperCase() === 'N/A';

  // ✅ If the row tells us "Resume" is showing, reflect a paused state immediately.
  // This removes the race between multiple fast suspends.
  if (resumeShowing) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '30px',
          height: '30px',
          fontSize: '1rem',
        }}
      >
        <FaPause color="orange" />
      </span>
    );
  }

  // Legacy UI-derived hints (kept, but resumeShowing now dominates)
  const showSuspended = resumeShowing && resumeEnabled && ipIsNA && startDisabled;
  const showRunningFromUi = startDisabled && ipIsNA && resumeShowing && !resumeEnabled;

  let Icon: React.ReactNode = <FaQuestion color="gray" />;

  if (showSuspended) {
    Icon = <FaPause color="orange" />;
  } else if (showRunningFromUi) {
    Icon = <FaPlay color="green" />;
  } else {
    switch (normalizedStatus) {
      case 'running':
        Icon = <FaPlay color="green" />;
        break;
      case 'stopped':
        Icon = <FaStop color="red" />;
        break;
      case 'paused':
      case 'hibernate':
      case 'suspended':
        Icon = <FaPause color="orange" />;
        break;
      default:
        Icon = <FaQuestion color="gray" />;
    }
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        fontSize: '1rem',
      }}
    >
      {Icon}
    </span>
  );
};

export default StatusBadge;
