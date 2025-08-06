import { useState, useEffect } from 'react';
import ModalWrapper from '../DiskModal/ModalWrapper';
import { NetworkInterface } from './NetworkingView';

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
    <ModalWrapper onClose={onClose} title={editNIC ? 'Edit Network Interface' : 'Add Network Interface'}>
      <div className="flex flex-col gap-4">
        {/* MAC Address */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            MAC Address
          </label>
          <input
            type="text"
            value={macaddr}
            onChange={(e) => setMacaddr(e.target.value)}
            placeholder="DE:AD:BE:EF:00:01"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                       focus:ring-blue-500 focus:border-blue-500 block w-full p-2 
                       dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          />
        </div>

        {/* Firewall */}
        <div className="flex items-center">
          <input
            id="firewall"
            type="checkbox"
            checked={firewall}
            onChange={(e) => setFirewall(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="firewall" className="ml-2 text-sm text-gray-900 dark:text-gray-300">
            Enable Firewall
          </label>
        </div>

        {/* VLAN Tag */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            VLAN Tag
          </label>
          <input
            type="number"
            value={tag ?? ''}
            onChange={(e) => setTag(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Optional"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                       focus:ring-blue-500 focus:border-blue-500 block w-full p-2 
                       dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          />
        </div>

        {/* Model */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                       focus:ring-blue-500 focus:border-blue-500 block w-full p-2 
                       dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          >
            {nicModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Disconnect */}
        <div className="flex items-center">
          <input
            id="linkDown"
            type="checkbox"
            checked={linkDown}
            onChange={(e) => setLinkDown(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="linkDown" className="ml-2 text-sm text-gray-900 dark:text-gray-300">
            Disconnect (Link Down)
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg"
        >
          {editNIC ? 'Save Changes' : 'Add NIC'}
        </button>
      </div>
    </ModalWrapper>
  );
};

export default NetworkingModal;
