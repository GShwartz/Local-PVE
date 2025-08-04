import VMNameCell from './VMNameCell';
import CPUCell from './CPUCell';
import RAMCell from './RAMCell';
import ActionButtons from './ActionButtons';
import ApplyButton from './ApplyButton';
import HDDCell from './HDDCell';
import StatusBadge from './StatusBadge';

const parseRAMToNumber = (ram: string): number => {
  if (ram.endsWith('GB')) return parseInt(ram.replace('GB', '')) * 1024;
  return parseInt(ram.replace('MB', ''));
};

const MainVMRow = ({
  vm,
  editingVmid,
  openEditModal,
  cancelEdit,
  changesToApply,
  setChangesToApply,
  isApplying,
  setIsApplying,
  hasChanges,
  requiresVMStopped,
  vmMutation,
  pendingActions,
  showSnapshots,
  toggleRow,
  auth,
  addAlert,
  refreshVMs,
  queryClient,
  expandedRows,
  setTableApplying,
}: any) => {
  const handleApplyChanges = async (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsApplying(true);
    e.stopPropagation();
    setTableApplying(true);

    const { vmid } = vm;

    const updates: { name?: string; cpus?: number; ram?: number } = {};
    if (changesToApply.vmname) updates.name = changesToApply.vmname;
    if (changesToApply.cpu !== null) updates.cpus = changesToApply.cpu;
    if (changesToApply.ram !== null) updates.ram = parseRAMToNumber(changesToApply.ram);

    if (Object.keys(updates).length === 0) return;

    try {
      const res = await fetch(`http://localhost:8000/vm/${auth.node}/qemu/${vmid}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const { status: currentStatus } = await res.json();

      if ((updates.cpus || updates.ram) && currentStatus === 'running') {
        addAlert(`Cannot apply CPU or RAM changes for running VM ${vmid}`, 'error');
        return;
      }

      vmMutation.mutate(
        { vmid, action: 'update_config', ...updates },
        {
          onSuccess: () => {
            queryClient.invalidateQueries(['vms']);
            setChangesToApply({ vmname: null, cpu: null, ram: null });
            cancelEdit();
            addAlert(`VM ${vmid} updated`, 'success');
          },
          onError: (err: any) => {
            addAlert(`Update failed: ${err.message}`, 'error');
          },
          onSettled: () => {
            setIsApplying(false);
            setTableApplying(false);
          },
        }
      );
    } catch (err) {
      addAlert(`Error updating VM ${vmid}`, 'error');
      setIsApplying(false);
      setTableApplying(false);
    }
  };

  return (
    <tr className="bg-gray-900 border-b border-gray-700 hover:bg-gray-700 text-xs sm:text-sm">
      <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">{vm.vmid}</td>
      <VMNameCell {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }} />
      <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">{vm.ip_address}</td>
      <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">{vm.os}</td>
      <CPUCell {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }} />
      <RAMCell {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }} />
      <HDDCell hdd_sizes={vm.hdd_sizes} />
      <td className="px-2 py-2 text-center border-gray-700">
        <ApplyButton onClick={handleApplyChanges} hasChanges={hasChanges} requiresVMStopped={requiresVMStopped} isApplying={isApplying} />
      </td>
      <td className="px-2 sm:px-6 py-2 sm:py-4 text-center narrow-col border-gray-700">
        <StatusBadge status={vm.status} />
      </td>
      <td className="px-2 py-2 text-center">
        <ActionButtons
          vm={vm}
          pendingActions={pendingActions}
          vmMutation={vmMutation}
          showSnapshots={showSnapshots}
          onToggleRow={() => toggleRow(vm.vmid)}
          auth={auth}
          addAlert={addAlert}
          refreshVMs={refreshVMs}
          queryClient={queryClient}
          isApplying={isApplying}
        />
      </td>
      <td className="px-2 py-4 text-center cursor-pointer" onClick={() => toggleRow(vm.vmid)}>
        {expandedRows.has(vm.vmid) && !expandedRows.has(vm.vmid) ? '▲' : '▼'}
      </td>
    </tr>
  );
};

export default MainVMRow;
