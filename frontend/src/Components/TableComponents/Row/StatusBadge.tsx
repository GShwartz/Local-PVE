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
  // Operation state awareness
  isStarting?: boolean;      // Is VM currently starting?
  activeOperation?: string;  // Current active operation
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
  isStarting = false,
  activeOperation,
}) => {
  const normalizedStatus = (status || '').trim().toLowerCase();
  const normalizedQmpStatus = (qmpstatus || '').trim().toLowerCase();
  const ipIsNA = (ipAddress || '').trim().toUpperCase() === 'N/A';

  // Enhanced suspended detection using multiple indicators
  // BUT exclude cases where we're actively starting/rebooting the VM
  const isSuspended = 
    // Don't show suspended during startup operations
    !isStarting && 
    activeOperation !== 'start' && 
    activeOperation !== 'reboot' && 
    (
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
      // Running with no IP (but not during startup/reboot)
      (normalizedStatus === 'running' && ipIsNA && startDisabled)
    );

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
