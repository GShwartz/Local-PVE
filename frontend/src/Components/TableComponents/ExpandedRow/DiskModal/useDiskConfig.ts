import { useEffect, useState } from 'react';
import axios from 'axios';
import { VM } from '../../../../types';

interface VMConfigResponse {
  config: VM['config'];
}

const useDiskConfig = (vmid: number, node: string, auth: { csrf_token: string; ticket: string }) => {
  const [config, setConfig] = useState<VM['config'] | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await axios.get<VMConfigResponse>(
        `http://localhost:8000/vm/${node}/qemu/${vmid}/config`,
        {
          params: { csrf_token: auth.csrf_token, ticket: auth.ticket }
        }
      );
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
