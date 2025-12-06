import { useState, useEffect } from 'react';
import { NetworkInterface } from './NetworkingView';
import { Wifi, Shield, Tag, Settings, Shuffle } from 'lucide-react';

interface NetworkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NetworkingFormData) => void;
  editNIC?: NetworkInterface | null;
}

export interface NetworkingFormData {
  macaddr: string;
  firewall: boolean;
  tag?: number;
  model: string;
  link_down: boolean;
}

const NetworkingModal = ({ isOpen, onClose, onSubmit, editNIC }: NetworkingModalProps) => {
  const [macaddr, setMacaddr] = useState('');
  const [firewall, setFirewall] = useState(false);
  const [tag, setTag] = useState<number | undefined>(undefined);
  const [model, setModel] = useState('virtio');
  const [linkDown, setLinkDown] = useState(false);

  const generateRandomMac = () => {
    const hexDigits = '0123456789ABCDEF';
    let mac = 'DE:AD:BE';
    for (let i = 0; i < 3; i++) {
      mac += ':' + hexDigits.charAt(Math.floor(Math.random() * 16)) +
             hexDigits.charAt(Math.floor(Math.random() * 16));
    }
    return mac;
  };

  useEffect(() => {
    if (isOpen) {
      if (editNIC) {
        // Pre-fill form for editing
        setMacaddr(editNIC.macaddr || '');
        setFirewall(!!editNIC.firewall);
        setTag(editNIC.tag);
        setModel(editNIC.model);
        setLinkDown(!!editNIC.link_down);
      } else {
        // New NIC — reset form
        setMacaddr(generateRandomMac());
        setFirewall(false);
        setTag(undefined);
        setModel('virtio');
        setLinkDown(false);
      }
    }
  }, [isOpen, editNIC]);

  const handleSubmit = () => {
    onSubmit({
      macaddr,
      firewall,
      tag,
      model,
      link_down: linkDown
    });
    onClose();
  };

  const nicModels = [
    'virtio',
    'e1000',
    'rtl8139',
    'vmxnet3',
    'ne2k_pci',
    'ne2k_isa'
  ];

  if (!isOpen) return null;

  return (
    <div className="mt-2 pt-2 max-h-96 overflow-y-auto">
      {/* Form content */}
      <div className="space-y-4">
        {/* MAC Address */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Shuffle className="w-4 h-4 text-blue-500" />
            MAC Address
          </label>
          <div className="relative group">
            <input
              type="text"
              value={macaddr}
              onChange={(e) => setMacaddr(e.target.value)}
              placeholder="DE:AD:BE:EF:00:01"
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-500"
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Settings className="w-4 h-4 text-purple-500" />
            Network Model
          </label>
          <div className="relative group">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-500 appearance-none"
            >
              {nicModels.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-gray-800">
                  {m}
                </option>
              ))}
            </select>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* VLAN Tag */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Tag className="w-4 h-4 text-green-500" />
            VLAN Tag <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
          </label>
          <div className="relative group">
            <input
              type="number"
              value={tag ?? ''}
              onChange={(e) => setTag(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g., 100"
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-500"
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          {/* Firewall */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <label htmlFor="firewall" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Enable Firewall
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Protect this interface</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="firewall"
                type="checkbox"
                checked={firewall}
                onChange={(e) => setFirewall(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Link Down */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 rounded-lg border border-orange-100 dark:border-orange-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-md">
                <Wifi className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <label htmlFor="linkDown" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Disconnect Interface
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Set link status to down</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="linkDown"
                type="checkbox"
                checked={linkDown}
                onChange={(e) => setLinkDown(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-start pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200"
          >
            {editNIC ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkingModal;
