import React from 'react';
import { FaPlay, FaStop, FaPause, FaQuestion } from 'react-icons/fa';

interface StatusBadgeProps {
  status: string;
  resumeShowing?: boolean;   // optional
  startDisabled?: boolean;   // optional
  ipAddress?: string;        // optional
  /** NEW: presentational hints. No logic inside. */
  forcePlay?: boolean;
  forceStop?: boolean;
  // Additional Proxmox-specific fields for better detection
  qmpstatus?: string;        // QEMU Monitor Protocol status
  lock?: string;             // VM lock state
  suspended?: boolean;       // Direct suspended flag from API
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  resumeShowing = false,
  startDisabled = false,
  ipAddress = 'N/A',
  forcePlay = false,
  forceStop = false,
  qmpstatus,
  lock,
  suspended,
}) => {
  const normalizedStatus = (status || '').trim().toLowerCase();
  const normalizedQmpStatus = (qmpstatus || '').trim().toLowerCase();
  const ipIsNA = (ipAddress || '').trim().toUpperCase() === 'N/A';

  // Enhanced suspended detection using multiple indicators
  const isSuspended = 
    // Direct suspended flag from API
    suspended === true ||
    // Explicit status indicators
    normalizedStatus === 'paused' || 
    normalizedStatus === 'suspended' ||
    normalizedStatus === 'hibernate' ||
    // QEMU Monitor Protocol status
    normalizedQmpStatus === 'paused' ||
    normalizedQmpStatus === 'suspended' ||
    // Lock state indicates suspension
    lock === 'suspended' ||
    // SuspendResumeButton hints
    resumeShowing ||
    // Running with no IP (common suspended state pattern)
    (normalizedStatus === 'running' && ipIsNA && startDisabled);

  let Icon: React.ReactNode = <FaQuestion color="gray" />;

  if (forcePlay) {
    Icon = <FaPlay color="green" />;
  } else if (forceStop) {
    Icon = <FaStop color="red" />;
  } else if (isSuspended) {
    Icon = <FaPause color="orange" />;
  } else {
    switch (normalizedStatus) {
      case 'running':
        Icon = <FaPlay color="green" />;
        break;
      case 'stopped':
        Icon = <FaStop color="red" />;
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
      title={`Status: ${status}${qmpstatus ? ` (QMP: ${qmpstatus})` : ''}${lock ? ` [${lock}]` : ''}${suspended ? ' [suspended]' : ''}`}
    >
      {Icon}
    </span>
  );
};

export default StatusBadge;
