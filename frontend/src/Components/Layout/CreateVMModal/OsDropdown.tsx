import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown, Info } from 'lucide-react';

interface OsOption {
  id: string;
  name: string;
  distro: 'ubuntu' | 'debian' | 'rocky' | 'windows' | 'other';
  version: string;
  isLTS?: boolean;
}

const OS_IMAGES: OsOption[] = [
  { id: 'ubuntu-22.04', name: 'Ubuntu 22.04', distro: 'ubuntu', version: 'Jammy Jellyfish', isLTS: true },
  { id: 'ubuntu-24.04', name: 'Ubuntu 24.04', distro: 'ubuntu', version: 'Noble Numbat', isLTS: true },
  { id: 'debian-12', name: 'Debian 12', distro: 'debian', version: 'Bookworm' },
  { id: 'rocky-9', name: 'Rocky Linux 9', distro: 'rocky', version: 'Blue Onyx' },
  { id: 'win-2022', name: 'Windows Server 2022', distro: 'windows', version: 'Standard' },
];

interface OsDropdownProps {
  value: string;
  onSelect: (id: string) => void;
  addAlert: (msg: string, type: string) => void;
}

const OsDropdown = ({ value, onSelect }: OsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // 1. Create a reference to the dropdown container
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. Add the "Click Outside" logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If the dropdown is open and the click target is NOT inside our ref, close it
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Attach listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up listener on unmount
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredImages = useMemo(() => {
    return OS_IMAGES.filter((os) =>
      os.name.toLowerCase().includes(search.toLowerCase()) ||
      os.distro.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const selectedOs = OS_IMAGES.find((os) => os.id === value);

  const DistroIcon = ({ distro }: { distro: string }) => {
    const colors: Record<string, string> = {
      ubuntu: 'bg-orange-500',
      debian: 'bg-pink-600',
      rocky: 'bg-emerald-600',
      windows: 'bg-blue-500',
      other: 'bg-slate-500',
    };
    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm ${colors[distro] || colors.other}`}>
        {distro.substring(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    // 3. Attach the ref to the outer div
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
        Select Image
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-xl transition-all duration-200 ${
          isOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-200 hover:border-gray-300 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          {selectedOs ? (
            <>
              <DistroIcon distro={selectedOs.distro} />
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 leading-tight">{selectedOs.name}</p>
                <p className="text-[10px] text-gray-400 font-medium">{selectedOs.version}</p>
              </div>
            </>
          ) : (
            <span className="text-sm text-gray-400 font-medium">Choose an OS image...</span>
          )}
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[60] mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
          <div className="p-3 border-b border-gray-50 bg-gray-50/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                autoFocus
                type="text"
                placeholder="Filter by name..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {filteredImages.map((os) => (
              <button
                key={os.id}
                type="button"
                onClick={() => {
                  onSelect(os.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                  value === os.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <DistroIcon distro={os.distro} />
                <div className="text-left flex-1">
                  <p className={`text-sm font-bold ${value === os.id ? 'text-blue-900' : 'text-gray-800'}`}>{os.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{os.version}</p>
                </div>
                {value === os.id && <Check size={14} className="text-blue-600 mr-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OsDropdown;
