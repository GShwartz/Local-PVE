import axios from 'axios';
import { VM, Auth, VMStatus } from '../../types';

export const getUsedBusNumbers = (vm: VM, controller: string): number[] => {
  const config = vm.config;
  if (!config) return [];
  const used: number[] = [];

  for (const key of Object.keys(config)) {
    if (key.startsWith(controller)) {
      const match = key.match(/\d+$/);
      if (match) used.push(Number(match[0]));
    }
  }

  return used;
};

export const findNextFreeBus = (vm: VM, controller: string): number => {
  const used = getUsedBusNumbers(vm, controller);
  let i = 0;
  while (used.includes(i)) i++;
  return i;
};

export const getVMStatus = async (
  vmid: string | number,
  node: string,
  auth: Auth
): Promise<VMStatus> => {
  const response = await axios.get<{ status: VMStatus }>(
    `http://localhost:8000/vm/${node}/qemu/${vmid}/status`,
    {
      params: {
        csrf_token: auth.csrf_token,
        ticket: auth.ticket,
      },
    }
  );
  return response.data.status;
};

export const controlVM = async (
  action: 'start' | 'shutdown',
  vmid: string | number,
  node: string,
  auth: Auth
) => {
  await axios.post(
    `http://localhost:8000/vm/${node}/qemu/${vmid}/${action}`,
    {},
    {
      params: {
        csrf_token: auth.csrf_token,
        ticket: auth.ticket,
      },
    }
  );
};

export const waitForVMStatus = async (
  vmid: string | number,
  node: string,
  auth: Auth,
  targetStatus: VMStatus,
  timeout = 30000
): Promise<boolean> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const status = await getVMStatus(vmid, node, auth);
    if (status === targetStatus) {
      return true;
    }
    await new Promise(res => setTimeout(res, 2000));
  }
  return false;
};

export const findMatchingUnusedDisk = async (
  vmid: string | number,
  node: string,
  auth: Auth
): Promise<string | undefined> => {
  const maxRetries = 10;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const configResp = await axios.get<{ config: VM['config'] }>(
      `http://localhost:8000/vm/${node}/qemu/${vmid}/config`,
      {
        params: {
          csrf_token: auth.csrf_token,
          ticket: auth.ticket,
        },
      }
    );

    const config = configResp.data.config || {};
    console.log(`Attempt ${attempt}: VM config`, config);

    const unusedDisks = Object.entries(config)
      .filter(
        ([k, v]) =>
          k.startsWith('unused') &&
          typeof v === 'string' &&
          v.includes(`vm-${vmid}-disk-`)
      )
      .sort((a, b) => {
        const aNum = parseInt((a[1] as string).match(/disk-(\d+)/)?.[1] || '0');
        const bNum = parseInt((b[1] as string).match(/disk-(\d+)/)?.[1] || '0');
        return bNum - aNum;
      });

    if (unusedDisks.length > 0) {
      return unusedDisks[0][0];
    }

    await new Promise(res => setTimeout(res, 1000));
  }

  return undefined;
};
