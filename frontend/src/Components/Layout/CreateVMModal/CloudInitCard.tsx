import React, { useMemo } from 'react';
import { FileCode, Plus } from 'lucide-react';

interface CloudInitCardProps {
  value: string;
  onChange: (id: string) => void;
  onNavigateToCloudInit: () => void;
}

const CloudInitCard: React.FC<CloudInitCardProps> = ({ 
  value, 
  onChange, 
  onNavigateToCloudInit 
}) => {
  // Memoize templates to avoid redundant parsing on parent re-renders
  const ciTemplates = useMemo(() => {
    try {
      const stored = localStorage.getItem('local-pve-ci-templates');
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error("Failed to parse Cloud-Init templates:", err);
      return [];
    }
  }, []);

  const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300';
  const cardTitle = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2';
  const fieldBase = 'w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all border-gray-200 shadow-sm';

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-1">
        <p className={cardTitle}>
          <FileCode size={12} /> Cloud-Init
        </p>
        <button
          type="button"
          onClick={onNavigateToCloudInit}
          className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
        >
          <Plus size={12} strokeWidth={3} /> NEW TEMPLATE
        </button>
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldBase}
      >
        <option value="">Standard OS provisioning</option>
        {ciTemplates.map((t: any) => (
          <option key={t.id} value={t.id}>
            {t.name} {t.targetOS && `(${t.targetOS})`}
          </option>
        ))}
      </select>
      
      {value && (
        <p className="text-[10px] text-gray-400 font-medium px-1">
          Custom configuration will be applied via user-data.
        </p>
      )}
    </div>
  );
};

export default CloudInitCard;
