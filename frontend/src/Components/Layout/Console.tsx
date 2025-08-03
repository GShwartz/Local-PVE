import React, { useEffect, useRef } from 'react';
import RFB from '@novnc/novnc/lib/rfb';
import { Auth } from '../../types';

interface ConsoleProps {
  node: string;
  vmid: number;
  backendUrl: string;
  auth: Auth;
}

const Console: React.FC<ConsoleProps> = ({ node, vmid, backendUrl, auth }) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const { ticket, csrf_token } = auth;
      const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
      const backendHost = backendUrl.split('://')[1];
      const url = `${wsProtocol}://${backendHost}/ws/console/${node}/${vmid}?csrf_token=${encodeURIComponent(csrf_token)}&ticket=${encodeURIComponent(ticket)}`;
      const rfb = new RFB(canvasRef.current, url);
      rfb.addEventListener('connect', () => console.log('Connected to VNC'));
      rfb.addEventListener('disconnect', () => console.log('Disconnected from VNC'));

      return () => {
        rfb.disconnect();
      };
    }
  }, [node, vmid, backendUrl, auth]);

  return (
    <div className="w-full h-full">
      <div ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default Console;