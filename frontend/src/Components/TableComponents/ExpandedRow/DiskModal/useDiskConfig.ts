import { useEffect, useState } from 'react';
import api from '../../../../api';
import { VM } from '../../../../types';

interface VMConfigResponse {
  config: VM['config'];
}

const useDiskConfig = (vmid: number, node: string, auth: { csrf_token: string; ticket: string }) => {
  const [config, setConfig] = useState<VM['config'] | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await api.get<VMConfigResponse>(`/vm/${node}/qemu/${vmid}/config`);
      setConfig(res.data.config);
    } catch (err) {
      console.error('❌ Failed to fetch VM config:', err);
      setConfig({});
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [vmid, node, auth]);

  return { config, refreshConfig: fetchConfig };
};

export default useDiskConfig;
