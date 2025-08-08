import React from 'react';
import styles from '../../../CSS/StatusBadge.module.css';

interface StatusBadgeProps {
  status: string;
  /** true if the Suspend/Resume button label is "Resume" */
  resumeShowing: boolean;
  /** true if that "Resume" button is enabled (not disabled) */
  resumeEnabled: boolean;
  /** true if the Start button is disabled */
  startDisabled: boolean;
  /** IP address string; pass the literal "N/A" if none */
  ipAddress: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  resumeShowing,
  resumeEnabled,
  startDisabled,
  ipAddress,
}) => {
  const normalizedStatus = (status || '').trim().toLowerCase();
  const ipIsNA = (ipAddress || '').trim().toUpperCase() === 'N/A';

  // Your exact rules:
  // 1) Suspended if resumeShowing && resumeEnabled && ipIsNA && startDisabled
  const showSuspended =
    resumeShowing && resumeEnabled && ipIsNA && startDisabled;

  // 2) Running if startDisabled && ipIsNA && resumeShowing && !resumeEnabled
  const showRunningFromUi =
    startDisabled && ipIsNA && resumeShowing && !resumeEnabled;

  let label = '';
  let className = styles.badge;

  if (showSuspended) {
    label = 'Suspended';
    className += ` ${styles.suspendedOverride}`;
  } else if (showRunningFromUi) {
    label = 'Running';
    className += ` ${styles.running}`;
  } else {
    // Fallback to backend-reported status
    switch (normalizedStatus) {
      case 'running':
        label = 'Running';
        className += ` ${styles.running}`;
        break;
      case 'stopped':
        label = 'Stopped';
        className += ` ${styles.stopped}`;
        break;
      case 'paused':
      case 'hibernate':
      case 'suspended':
        label = 'Suspended';
        className += ` ${styles.suspended}`;
        break;
      default:
        label = normalizedStatus
          ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
          : 'Unknown';
        className += ` ${styles.unknown}`;
    }
  }

  return <span className={className}>{label}</span>;
};

export default StatusBadge;
