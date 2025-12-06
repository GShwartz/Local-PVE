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
  queryClient,
  isApplying,
  onResumeHintsChange,
  onRebootingHintChange,
  onStoppingHintChange,
}: ActionButtonsProps) => {
  // Simplified state management
  const [activeOperations, setActiveOperations] = useState<Set<string>>(new Set());

  // UI-specific states
  const [isCloning, setIsCloning] = useState(false);
  const [cloneName, setCloneName] = useState(vm.name);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [initialVmCount, setInitialVmCount] = useState<number | null>(null);

  // Inject animation keyframes for the futuristic loader
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.type = 'text/css';
    styleTag.textContent = `
      @keyframes abtn_bar_sweep {
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
      
      @keyframes abtn_particle_float {
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

  // Clone operation tracking
  useEffect(() => {
    if (activeOperations.has('clone') && initialVmCount === null) {
      const currentVms = queryClient.getQueryData(['vms']) as VM[] | undefined;
      setInitialVmCount(currentVms?.length || 0);
    }

    if (activeOperations.has('clone') && initialVmCount !== null) {
      const currentVms = queryClient.getQueryData(['vms']) as VM[] | undefined;
      const currentCount = currentVms?.length || 0;

      if (currentCount > initialVmCount) {
        setActiveOperations(prev => {
          const next = new Set(prev);
          next.delete('clone');
          return next;
        });
        setInitialVmCount(null);
      }
    }
  }, [activeOperations, initialVmCount, queryClient.getQueryData(['vms'])]);

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
    setIsCloning(false);
    setActiveOperations(prev => new Set([...prev, 'clone']));
    addAlert(`Cloning VM "${vm.name}" to "${cloneName}"...`, 'info');

    vmMutation.mutate(
      { vmid: vm.vmid, action: 'clone', name: cloneName },
      {
        onSuccess: () => {
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
              setCloneName(vm.name);
            }}
          />

          <RemoveButton
            disabled={!buttonStates.canRemove}
            onConfirm={handleRemove}
            showConfirm={showRemoveConfirm}
            setShowConfirm={setShowRemoveConfirm}
          />

        </div>

        {/* Clean futuristic loader effect */}
        {(activeOperations.size > 0 || isSuspending || actionsForVm.includes('reboot')) && (
          <div
            aria-live="polite"
            style={{
              width: '100%',
              height: '8px',
              marginTop: 0,
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
                animation: 'abtn_bar_sweep 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
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
                animation: 'abtn_bar_sweep 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite 300ms',
                filter: 'blur(0.5px)',
                opacity: 0.8,
              }}
            />

            {/* Particle effects */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${15 + i * 20}%`,
                  top: '50%',
                  width: '2px',
                  height: '2px',
                  background: 'rgba(0, 247, 255, 0.8)',
                  borderRadius: '50%',
                  transform: 'translateY(-50%)',
                  animation: `abtn_particle_float 1.5s ease-in-out infinite ${i * 0.3}s`,
                  boxShadow: '0 0 4px rgba(0, 247, 255, 0.8)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </td>
  );
};

export default ActionButtons;