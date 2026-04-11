import React from 'react';
import { Key } from 'lucide-react';

interface SSHKeyCardProps {
  sshKey: string;
  onSSHKeyChange: (key: string) => void;
}

const SSHKeyCard = ({ sshKey, onSSHKeyChange }: SSHKeyCardProps) => {
  return (
    <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Key size={14} className="text-blue-500" />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">Public SSH Key</span>
      </div>
      <textarea
        value={sshKey}
        onChange={(e) => onSSHKeyChange(e.target.value)}
        className="w-full h-24 border rounded-lg px-3 py-2 text-[11px] font-mono text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all border-gray-200 resize-none shadow-sm"
        placeholder="ssh-rsa AAAA... user@host"
      />
      <p className="text-[10px] text-gray-400 font-medium">
        Paste your public key for passwordless authentication.
      </p>
    </div>
  );
};

export default SSHKeyCard;
