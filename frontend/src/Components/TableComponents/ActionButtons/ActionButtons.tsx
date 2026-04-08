import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { VM, Auth } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

import StartButton from './StartButton';
import StopButton from './StopButton';
import ShutdownButton from './ShutdownButton';
import RebootButton from './RebootButton';
import ConsoleButton from './ConsoleButton';
import CloneButton from './CloneButton';
import RemoveButton from './RemoveButton';
import SuspendResumeButton from './SuspendResumeButton';
import { openProxmoxConsole } from './openProxmoxConsole';
import styles from '../../../CSS/ActionButtons.module.css';

interface ActionButtonsProps {
  vm: VM;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<
    string,
    any,
    { vmid: number; action: string; name?: string; cpus?: number },
    unknown
  >;
  onToggleRow: () => void;
  auth: Auth;
  addAlert: (message: string, type: string) => void;
  refreshVMs: () => void;
  isApplying: boolean;
  existingVmNames?: string[];
  onResumeHintsChange?: (hints: { resumeShowing: boolean; resumeEnabled: boolean }) => void;
  onRebootingHintChange?: (isRebooting: boolean) => void;
  onStoppingHintChange?: (isStopping: boolean) => void;
}

const PROXMOX_NODE = 'pve';
const API_BASE_URL = 'http://localhost:8000';

const ActionButtons = ({
  vm,
  pendingActions,
  vmMutation,
  onToggleRow,
  auth,
  addAlert,
  refreshVMs,
  isApplying,
  existingVmNames = [],
  onResumeHintsChange,
  onRebootingHintChange,
  onStoppingHintChange,
}: ActionButtonsProps) => {
  // Simplified state management
  const [activeOperations, setActiveOperations] = useState<Set<string>>(new Set());

  // UI-specific states
  const [isVMCloning,        setIsVMCloning]        = useState(false);
  const [isDiskCloning,      setIsDiskCloning]      = useState(false);
  const [isDiskCloneLoading, setIsDiskCloneLoading] = useState(false);
  const [cloneName,          setCloneName]          = useState(vm.name);
  const [showRemoveConfirm,  setShowRemoveConfirm]  = useState(false);
  const [isSuspending,       setIsSuspending]       = useState(false);

  // Keep clone name in sync with VM name (e.g. after config loads)
  useEffect(() => {
    if (!isVMCloning) setCloneName(vm.name);
  }, [vm.name, isVMCloning]);

  // Inject animation keyframes for the professional loader
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.type = 'text/css';
    styleTag.textContent = `
      @keyframes abtn_progress_sweep {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(400%);
        }
      }
      
      @keyframes abtn_shimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
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

  // Simplified operation completion detection
  useLayoutEffect(() => {
    const completedOperations = new Set<string>();

    activeOperations.forEach(operation => {
      const currentStatus = vm.status?.toLowerCase() || '';

      if (
        (operation === 'start' && currentStatus === 'running') ||
        (operation === 'stop' && currentStatus === 'stopped') ||
        (operation === 'shutdown' && currentStatus === 'stopped')
      ) {
        completedOperations.add(operation);
      }
    });

    if (completedOperations.size > 0) {
      setActiveOperations(prev => {
        const next = new Set(prev);
        completedOperations.forEach(op => next.delete(op));
        return next;
      });
    }
  }, [vm.status, activeOperations]);

  // Clone completion is tracked via pendingActions (task poller in vmMutations).
  // activeOperations.clone is cleared in handleCloneConfirm's onSuccess below.

  // Fallback timers to prevent stuck operations
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    activeOperations.forEach(operation => {
      if (operation !== 'remove') {
        const timer = setTimeout(() => {
          setActiveOperations(prev => {
            const next = new Set(prev);
            next.delete(operation);
            return next;
          });
          refreshVMs();
        }, 30000); // 30 seconds fallback

        timers.push(timer);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [activeOperations, refreshVMs]);

  // Derive connected disk keys from VM config (excludes CDROMs)
  const vmDisks = useMemo(() => {
    const config = vm.config;
    const diskPattern = /^(scsi|virtio|sata|ide)\d+$/;
    // If config hasn't loaded yet (empty/undefined), return a minimal safe default
    if (!config || Object.keys(config).length === 0) {
      return ['scsi0'];
    }
    return Object.keys(config)
      .filter(k => diskPattern.test(k) && !String(config[k]).includes('media=cdrom'))
      .sort();
  }, [vm.config]);

  // Simple status logic
  const status = vm.status?.toLowerCase() || '';
  const isRunning = status === 'running';
  const isStopped = status === 'stopped';
  const isPaused = status === 'paused' || status === 'suspended';

  // Suspend hints tracking
  const [suspendHints, setSuspendHints] = useState<{ resumeShowing: boolean; resumeEnabled: boolean }>({
    resumeShowing: false,
    resumeEnabled: false,
  });

  // Enhanced suspended detection
  const isSuspended =
    isPaused ||
    suspendHints.resumeShowing;

  // Get pending actions for this VM
  const actionsForVm = pendingActions[vm.vmid] || [];
  const hasPendingAction = actionsForVm.length > 0;
  const isOperationActive = activeOperations.size > 0 || isSuspending;

  // Simplified button state calculations
  const buttonStates = useMemo(() => {
    const hasRebootPending = actionsForVm.includes('reboot');

    return {
      canStart: isStopped && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending,
      canStop: (isRunning || isPaused) && !hasPendingAction && !isApplying && !isSuspending,
      canShutdown: isRunning && !isSuspended && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending,
      canReboot: isRunning && !isSuspended && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending,
      canConsole: true, // Console should always be available
      canClone: (!hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending),
      canRemove: isStopped && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending,
      canSuspendResume: (isRunning || isPaused) && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending
    };
  }, [isRunning, isStopped, isPaused, isSuspended, hasPendingAction, isApplying, isOperationActive, isSuspending, actionsForVm]);

  // Send hint updates synchronously to prevent timing issues
  useLayoutEffect(() => {
    const hasRebootPending = actionsForVm.includes('reboot');

    console.log('🔧 ActionButtons VM', vm.vmid, 'sending hints:', {
      vmStatus: vm.status,
      pendingActions: actionsForVm,
      hasRebootPending,
      rebootingHint: hasRebootPending,
      stoppingHint: activeOperations.has('stop') || activeOperations.has('shutdown'),
      activeOperations: Array.from(activeOperations),
      DETAILED_PENDING_ACTIONS: pendingActions // Show the entire pendingActions object
    });

    onRebootingHintChange?.(hasRebootPending);
    onStoppingHintChange?.(activeOperations.has('stop') || activeOperations.has('shutdown'));
  }, [actionsForVm, activeOperations, onRebootingHintChange, onStoppingHintChange, vm.vmid, vm.status, pendingActions]);

  // Optimized operation handler with atomic state updates
  const handleOperation = useCallback((action: string, alertMessage: string, alertType: 'info' | 'warning' = 'info') => {
    // Atomic state update to prevent timing issues
    setActiveOperations(prev => new Set([...prev, action]));
    addAlert(alertMessage, alertType);

    vmMutation.mutate(
      { vmid: vm.vmid, action, name: vm.name },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" ${action} initiated.`, 'success'),
        onError: () => {
          // Remove operation on error
          setActiveOperations(prev => {
            const next = new Set(prev);
            next.delete(action);
            return next;
          });
          addAlert(`Failed to ${action} VM "${vm.name}".`, 'error');
        },
      }
    );
  }, [vm.vmid, vm.name, vmMutation, addAlert]);

  // Simple action handlers
  const handleStop = useCallback(() => {
    handleOperation('stop', `Force stopping VM "${vm.name}"...`, 'warning');
  }, [handleOperation, vm.name]);

  const handleShutdown = useCallback(() => {
    handleOperation('shutdown', `Shutting down VM "${vm.name}"...`);
  }, [handleOperation, vm.name]);

  // Simple reboot handler using existing pendingActions system
  const handleReboot = useCallback(() => {
    console.log('🚀 REBOOT CLICKED for VM', vm.vmid, {
      currentStatus: vm.status,
      currentPendingActions: actionsForVm,
      aboutToMutate: 'reboot'
    });

    addAlert(`Rebooting VM "${vm.name}"...`, 'info');

    vmMutation.mutate(
      { vmid: vm.vmid, action: 'reboot', name: vm.name },
      {
        onSuccess: () => {
          console.log('✅ REBOOT SUCCESS for VM', vm.vmid, {
            pendingActionsAfterSuccess: pendingActions[vm.vmid] || []
          });
          addAlert(`VM "${vm.name}" reboot initiated.`, 'success');
        },
        onError: (error) => {
          console.log('❌ REBOOT ERROR for VM', vm.vmid, error);
          addAlert(`Failed to reboot VM "${vm.name}".`, 'error');
        },
      }
    );
  }, [vm.vmid, vm.name, vmMutation, addAlert, vm.status, actionsForVm, pendingActions]);

  const handleCloneConfirm = useCallback(() => {
    setIsVMCloning(false);
    setActiveOperations(prev => new Set([...prev, 'clone']));
    addAlert(`Cloning VM "${vm.name}" to "${cloneName}"...`, 'info');

    vmMutation.mutate(
      { vmid: vm.vmid, action: 'clone', name: cloneName },
      {
        onSuccess: () => {
          // UPID received — hand off tracking to pendingActions (task poller)
          setActiveOperations(prev => {
            const next = new Set(prev);
            next.delete('clone');
            return next;
          });
          addAlert(`VM "${vm.name}" clone initiated.`, 'success');
        },
        onError: () => {
          setActiveOperations(prev => {
            const next = new Set(prev);
            next.delete('clone');
            return next;
          });
          addAlert(`Failed to clone VM "${vm.name}".`, 'error');
        },
      }
    );
  }, [vm.vmid, vm.name, cloneName, vmMutation, addAlert]);

  const handleDiskCloneConfirm = useCallback(async (diskKey: string, targetStorage: string, savePath: string) => {
    setIsDiskCloning(false);
    setIsDiskCloneLoading(true);
    addAlert(`Cloning disk "${diskKey}" of VM "${vm.name}"...`, 'info');
    try {
      const resp = await fetch(
        `${API_BASE_URL}/vm/${PROXMOX_NODE}/qemu/${vm.vmid}/clone-disk` +
        `?csrf_token=${encodeURIComponent(auth.csrf_token)}&ticket=${encodeURIComponent(auth.ticket)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disk_key: diskKey, target_storage: targetStorage, save_path: savePath }),
        }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.detail ?? resp.statusText);
      }
      addAlert(`Disk "${diskKey}" clone initiated.`, 'success');
    } catch (e: any) {
      addAlert(`Disk clone failed: ${e.message}`, 'error');
    } finally {
      setIsDiskCloneLoading(false);
    }
  }, [vm.vmid, vm.name, auth.csrf_token, auth.ticket, addAlert]);

  const handleRemove = useCallback(async () => {
    setShowRemoveConfirm(false);
    addAlert(`Removing VM "${vm.name}"...`, 'warning');

    try {
      const response = await fetch(
        `${API_BASE_URL}/vm/${PROXMOX_NODE}/qemu/${vm.vmid}?csrf_token=${encodeURIComponent(
          auth.csrf_token
        )}&ticket=${encodeURIComponent(auth.ticket)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete VM');

      addAlert(`VM "${vm.name}" removed successfully.`, 'success');
      await refreshVMs();
    } catch (error: any) {
      addAlert(`Failed to remove VM "${vm.name}": ${error.message}`, 'error');
    }
  }, [vm.vmid, vm.name, auth.csrf_token, auth.ticket, addAlert, refreshVMs]);

  return (
    <td
      className="px-2 py-2 text-center"
      style={{ verticalAlign: 'middle', overflow: 'visible', position: 'relative' }}
      onClick={onToggleRow}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', gap: '5px' }}>
        <div className={styles.buttonGroup}>

          <StartButton
            vm={vm}
            disabled={!buttonStates.canStart}
            isStarting={activeOperations.has('start')}
            setIsStarting={() => { }} // StartButton handles its own state
            vmMutation={vmMutation}
            addAlert={addAlert}
            onSent={() => {
              setActiveOperations(prev => new Set([...prev, 'start']));
            }}
            onError={() => {
              // Reset after notification auto-dismiss duration (5 s)
              setTimeout(() => {
                setActiveOperations(prev => {
                  const next = new Set(prev);
                  next.delete('start');
                  return next;
                });
              }, 5000);
            }}
          />

          <StopButton
            disabled={!buttonStates.canStop || activeOperations.has('stop')}
            onClick={handleStop}
            vmStatus={vm.status}
          />

          <ShutdownButton
            disabled={!buttonStates.canShutdown}
            onClick={handleShutdown}
          />

          <RebootButton
            disabled={!buttonStates.canReboot}
            onClick={handleReboot}
          />

          <SuspendResumeButton
            vm={vm}
            node={PROXMOX_NODE}
            auth={auth}
            vmMutation={vmMutation}
            addAlert={addAlert}
            refreshVMs={refreshVMs}
            disabled={!buttonStates.canSuspendResume}
            isPending={actionsForVm.includes('suspend') || actionsForVm.includes('resume')}
            setSuspending={setIsSuspending}
            onHintsChange={(hints) => {
              setSuspendHints(hints);
              onResumeHintsChange?.(hints);
            }}
          />

          <ConsoleButton
            onClick={(e) => {
              e.stopPropagation();
              openProxmoxConsole(PROXMOX_NODE, vm.vmid, auth.csrf_token, auth.ticket);
            }}
            disabled={!buttonStates.canConsole}
          />

          <CloneButton
            disabled={!buttonStates.canClone}
            showCloningLabel={actionsForVm.includes('clone')}
            vmName={vm.name}
            vmDisks={vmDisks}
            // VM clone
            isVMCloning={isVMCloning}
            cloneName={cloneName}
            existingNames={existingVmNames}
            onVMCloneToggle={() => setIsVMCloning(v => !v)}
            onChange={setCloneName}
            onVMCloneConfirm={handleCloneConfirm}
            onVMCloneCancel={() => { setIsVMCloning(false); setCloneName(vm.name); }}
            // Disk clone
            isDiskCloning={isDiskCloning}
            isDiskCloneLoading={isDiskCloneLoading}
            onDiskCloneToggle={() => setIsDiskCloning(v => !v)}
            onDiskCloneConfirm={handleDiskCloneConfirm}
            onDiskCloneCancel={() => setIsDiskCloning(false)}
          />

          <RemoveButton
            disabled={!buttonStates.canRemove}
            vmName={vm.name}
            onConfirm={handleRemove}
            showConfirm={showRemoveConfirm}
            setShowConfirm={setShowRemoveConfirm}
          />

        </div>

        {/* Professional loader — shows for ANY pending or active operation */}
        {(activeOperations.size > 0 || isSuspending || actionsForVm.length > 0) && (
          <div
            aria-live="polite"
            style={{
              width: '100%',
              height: '3px',
              borderRadius: '2px',
              overflow: 'hidden',
              position: 'relative',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Animated progress bar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: '30%',
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.6), rgba(59, 130, 246, 1), rgba(59, 130, 246, 0.6))',
                backgroundSize: '200% 100%',
                borderRadius: '2px',
                animation: 'abtn_progress_sweep 1.5s ease-in-out infinite, abtn_shimmer 2s linear infinite',
              }}
            />
          </div>
        )}
      </div>
    </td>
  );
};

export default ActionButtons;