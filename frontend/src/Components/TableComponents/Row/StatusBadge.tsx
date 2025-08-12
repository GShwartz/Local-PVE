import React from 'react';
import { FaPlay, FaStop, FaPause, FaQuestion } from 'react-icons/fa';

interface StatusBadgeProps {
  status: string;
  resumeShowing?: boolean;   // optional
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
  forcePlay = false,
  forceStop = false,
  qmpstatus,
  lock,
  suspended,
}) => {
  const normalizedStatus = (status || '').trim().toLowerCase();
  const normalizedQmpStatus = (qmpstatus || '').trim().toLowerCase();

  // Simplified and more accurate suspended detection
  const isSuspended = 
    // Direct explicit indicators only - don't guess based on IP
    suspended === true ||
    normalizedStatus === 'paused' || 
    normalizedStatus === 'suspended' ||
    normalizedStatus === 'hibernate' ||
    normalizedQmpStatus === 'paused' ||
    normalizedQmpStatus === 'suspended' ||
    lock === 'suspended' ||
    resumeShowing; // Trust the SuspendResumeButton hints

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
