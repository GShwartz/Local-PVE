import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { VM, Auth } from '../../../types';
import { UseMutationResult, QueryClient } from '@tanstack/react-query';

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
  queryClient: QueryClient;
  isApplying: boolean;
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
  queryClient: _queryClient,
  isApplying,
  onResumeHintsChange,
  onRebootingHintChange,
  onStoppingHintChange,
}: ActionButtonsProps) => {
  // Simplified state management
  const [activeOperations, setActiveOperations] = useState<Set<string>>(new Set());

  // UI-specific states
  const [isCloning, setIsCloning] = useState(false);
  const [cloneName, setCloneName] = useState(`${vm.name}-clone`);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);

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

  // Get pending actions for this VM (from vmMutations task polling)
  const actionsForVm = pendingActions[vm.vmid] || [];

  // Fallback timers to prevent stuck operations
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

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

  // hasPendingAction and isOperationActive derived from actionsForVm (defined earlier)
  const hasPendingAction = actionsForVm.length > 0;
  const isOperationActive = activeOperations.size > 0 || isSuspending;
  
  // Check if VM is locked (being cloned, migrated, etc.)
  const hasLock = !!(vm as any).lock;
  const [lockCooldown, setLockCooldown] = useState(false);
  
  useEffect(() => {
    if (hasLock) {
      setLockCooldown(true);
    } else if (lockCooldown) {
      // Lock was just released - keep disabled for 10 more seconds
      const timer = setTimeout(() => setLockCooldown(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [hasLock, lockCooldown]);
  
  const isLocked = hasLock || lockCooldown;

  // Simplified button state calculations
  const buttonStates = useMemo(() => {
    const hasRebootPending = actionsForVm.includes('reboot');
    const hasClonePending = actionsForVm.includes('clone');

    return {
      canStart: isStopped && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending && !isLocked,
      canStop: (isRunning || isPaused) && !hasPendingAction && !isApplying && !isSuspending && !isLocked,
      canShutdown: isRunning && !isSuspended && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending && !isLocked,
      canReboot: isRunning && !isSuspended && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending && !isLocked,
      canConsole: !isLocked && !hasClonePending,
      canClone: (!hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending && !isLocked),
      canRemove: isStopped && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending && !isLocked,
      canSuspendResume: (isRunning || isPaused) && !hasPendingAction && !isApplying && !isOperationActive && !hasRebootPending && !isLocked
    };
  }, [isRunning, isStopped, isPaused, isSuspended, hasPendingAction, isApplying, isOperationActive, isSuspending, actionsForVm, isLocked]);

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
    setIsCloning(false);
    addAlert(`Cloning VM "${vm.name}" to "${cloneName}"...`, 'info');

    vmMutation.mutate(
      { vmid: vm.vmid, action: 'clone', name: cloneName },
      {
        onSuccess: () => {
          addAlert(`VM "${vm.name}" clone initiated.`, 'success');
        },
        onError: () => {
          addAlert(`Failed to clone VM "${vm.name}".`, 'error');
        },
      }
    );
  }, [vm.vmid, vm.name, cloneName, vmMutation, addAlert]);

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
      className="px-2 py-1 text-center action-buttons-cell"
      style={{
        height: '34px',
        verticalAlign: 'middle',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={onToggleRow}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
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
            isCloning={isCloning}
            cloneName={cloneName}
            onToggle={() => setIsCloning(!isCloning)}
            onChange={setCloneName}
            onConfirm={handleCloneConfirm}
            onCancel={() => {
              setIsCloning(false);
              setCloneName(`${vm.name}-clone`);
            }}
          />

          <RemoveButton
            disabled={!buttonStates.canRemove}
            onConfirm={handleRemove}
            showConfirm={showRemoveConfirm}
            setShowConfirm={setShowRemoveConfirm}
            vmName={vm.name}
            vmId={vm.vmid}
          />

        </div>

        {/* Professional loader */}
        {(activeOperations.size > 0 || isSuspending || actionsForVm.includes('reboot') || actionsForVm.includes('clone') || isLocked) && (
          <div
            aria-live="polite"
            style={{
              width: '100%',
              height: '3px',
              marginTop: '8px',
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
