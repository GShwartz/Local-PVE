import { useState, useEffect } from 'react';
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
}: ActionButtonsProps) => {
  // Only essential UI states
  const [isCloning, setIsCloning] = useState(false);
  const [cloneName, setCloneName] = useState(vm.name);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);

  // Inject animation keyframes for the loader
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.type = 'text/css';
    styleTag.textContent = `
      @keyframes abtn_bar_sweep {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(300%); }
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      if (document.head.contains(styleTag)) {
        document.head.removeChild(styleTag);
      }
    };
  }, []);

  // Hide loader when VM status changes appropriately
  useEffect(() => {
    if (!activeOperation) return;
    
    // Clear operation state when status reaches expected state
    if (
      (activeOperation === 'start' && vm.status === 'running') ||
      (activeOperation === 'stop' && vm.status === 'stopped') ||
      (activeOperation === 'shutdown' && vm.status === 'stopped') ||
      (activeOperation === 'reboot' && vm.status === 'running')
    ) {
      setActiveOperation(null);
    }
  }, [activeOperation, vm.status]);

  // Fallback timer for each operation to prevent getting stuck
  useEffect(() => {
    if (!activeOperation) return;
    
    const timer = setTimeout(() => {
      setActiveOperation(null);
      refreshVMs();
    }, 15000); // 15 seconds fallback
    
    return () => clearTimeout(timer);
  }, [activeOperation, refreshVMs]);

  // Get pending actions for this VM
  const actionsForVm = pendingActions[vm.vmid] || [];
  const hasPendingAction = actionsForVm.length > 0;
  const isOperationActive = activeOperation !== null || isSuspending;

  // Simple status-based logic (mirror Proxmox behavior)
  const status = vm.status?.toLowerCase() || '';
  const isRunning = status === 'running';
  const isStopped = status === 'stopped';
  const isPaused = status === 'paused' || status === 'suspended';

  // Enhanced suspended detection
  const isSuspended = 
    status === 'paused' || 
    status === 'suspended' ||
    isPaused ||
    (isRunning && vm.ip_address === 'N/A');

  // Button states - account for reboot masking and suspended state
  const isRebooting = activeOperation === 'reboot';
  const effectivelyRunning = isRunning || isRebooting; // treat rebooting as running
  const effectivelyStopped = isStopped && !isRebooting; // don't treat as stopped during reboot
  
  const canStart = effectivelyStopped && !hasPendingAction && !isApplying && !isOperationActive;
  const canStop = (effectivelyRunning || isPaused) && !hasPendingAction && !isApplying && !isOperationActive;
  // Disable shutdown/reboot if suspended - user must resume first
  const canShutdown = effectivelyRunning && !isSuspended && !hasPendingAction && !isApplying && !isOperationActive;
  const canReboot = effectivelyRunning && !isSuspended && !hasPendingAction && !isApplying && !isOperationActive;
  const canConsole = effectivelyRunning && !isSuspended && !hasPendingAction && !isApplying && !isOperationActive;
  const canClone = !hasPendingAction && !isApplying && !isOperationActive;
  const canRemove = effectivelyStopped && !hasPendingAction && !isApplying && !isOperationActive;
  const canSuspendResume = (effectivelyRunning || isPaused) && !hasPendingAction && !isApplying && !isOperationActive;

  // Generic operation handler with loader until status changes
  const handleOperation = (action: string, alertMessage: string, alertType: 'info' | 'warning' = 'info') => {
    setActiveOperation(action);
    addAlert(alertMessage, alertType);
    
    vmMutation.mutate(
      { vmid: vm.vmid, action, name: vm.name },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" ${action} initiated.`, 'success'),
        onError: () => {
          setActiveOperation(null);
          addAlert(`Failed to ${action} VM "${vm.name}".`, 'error');
        },
      }
    );
  };

  // Simple action handlers
  const handleStop = () => {
    handleOperation('stop', `Force stopping VM "${vm.name}"...`, 'warning');
  };

  const handleShutdown = () => {
    handleOperation('shutdown', `Shutting down VM "${vm.name}"...`);
  };

  const handleReboot = () => {
    handleOperation('reboot', `Rebooting VM "${vm.name}"...`);
  };

  const handleCloneConfirm = () => {
    setIsCloning(false);
    addAlert(`Cloning VM "${vm.name}" to "${cloneName}"...`, 'info');
    
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'clone', name: cloneName },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" clone initiated.`, 'success'),
        onError: () => addAlert(`Failed to clone VM "${vm.name}".`, 'error'),
      }
    );
  };

  const handleRemove = async () => {
    setShowRemoveConfirm(false);
    addAlert(`Removing VM "${vm.name}"...`, 'warning');

    // Optimistic update
    const previousVms = queryClient.getQueryData(['vms']);
    queryClient.setQueryData(['vms'], (oldVms: VM[]) => 
      oldVms?.filter((v) => v.vmid !== vm.vmid) || []
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/vm/${PROXMOX_NODE}/qemu/${vm.vmid}?csrf_token=${encodeURIComponent(
          auth.csrf_token
        )}&ticket=${encodeURIComponent(auth.ticket)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete VM');

      addAlert(`VM "${vm.name}" removed successfully.`, 'success');
      refreshVMs();
    } catch (error: any) {
      // Revert optimistic update
      queryClient.setQueryData(['vms'], previousVms);
      addAlert(`Failed to remove VM "${vm.name}": ${error.message}`, 'error');
    }
  };

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
        <div className={styles.buttonGroup} style={{ height: '40px', marginBottom: '4px' }}>
        
        <StartButton
          vm={vm}
          disabled={!canStart}
          isStarting={activeOperation === 'start'}
          setIsStarting={() => {}} // StartButton handles its own state
          vmMutation={vmMutation}
          addAlert={addAlert}
          onSent={() => {
            // StartButton already sent the request, just handle UI state
            setActiveOperation('start');
            // Fallback: clear after 30 seconds if status never changes
            setTimeout(() => {
              if (activeOperation === 'start') {
                setActiveOperation(null);
                refreshVMs();
              }
            }, 30000);
          }}
        />

        <StopButton
          disabled={!canStop}
          onClick={handleStop}
        />

        <ShutdownButton
          disabled={!canShutdown}
          onClick={handleShutdown}
        />

        <RebootButton
          disabled={!canReboot}
          onClick={handleReboot}
        />

        <SuspendResumeButton
          vm={vm}
          node={PROXMOX_NODE}
          auth={auth}
          vmMutation={vmMutation}
          addAlert={addAlert}
          refreshVMs={refreshVMs}
          disabled={!canSuspendResume}
          isPending={actionsForVm.includes('suspend') || actionsForVm.includes('resume')}
          setSuspending={setIsSuspending}
          onHintsChange={() => {}} // Not used in ActionButtons, but required by SuspendResumeButton
        />

        <ConsoleButton
          onClick={(e) => {
            e.stopPropagation();
            openProxmoxConsole(PROXMOX_NODE, vm.vmid, auth.csrf_token, auth.ticket);
          }}
          disabled={!canConsole}
        />

        <CloneButton
          disabled={!canClone}
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
          disabled={!canRemove}
          onConfirm={handleRemove}
          showConfirm={showRemoveConfirm}
          setShowConfirm={setShowRemoveConfirm}
        />

        </div>

        {/* Operation loader effect */}
        {(activeOperation || isSuspending) && (
          <div
            aria-live="polite"
            style={{
              width: '100%',
              height: '8px',
              marginTop: 0,
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
              animation: 'abtn_glow_pulse 3s ease-in-out infinite',
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