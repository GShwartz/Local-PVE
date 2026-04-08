import { useState } from 'react';
import { Plug, Github, Webhook, Database, Cloud, ArrowLeft } from 'lucide-react';
import CloudInitView from './CloudInitView';

interface IntegrationsViewProps {
  addAlert: (message: string, type: string) => void;
}

const IntegrationCard = ({
  icon: Icon,
  name,
  description,
  badge,
  color,
  onClick,
}: {
  icon: React.ElementType;
  name: string;
  description: string;
  badge: string;
  color: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4
                ${onClick ? 'hover:shadow-md hover:border-blue-200 cursor-pointer' : ''} transition-all`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border
          ${badge === 'active'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
          {badge}
        </span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    {onClick && (
      <div className="flex-shrink-0 text-blue-500 text-xs font-medium">Open →</div>
    )}
  </div>
);

type SubView = 'list' | 'cloud-init';

const IntegrationsView = ({ addAlert }: IntegrationsViewProps) => {
  const [subView, setSubView] = useState<SubView>('list');

  if (subView === 'cloud-init') {
    return (
      <div className="animate-fade-in-up flex flex-col h-full">
        <button
          onClick={() => setSubView('list')}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 mb-5 self-start transition-colors"
        >
          <ArrowLeft size={13} /> Back to Integrations
        </button>
        <CloudInitView addAlert={addAlert} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500 mt-0.5">Connect Local-PVE with external services and tools</p>
      </div>

      <div className="space-y-3">
        <IntegrationCard
          icon={Cloud}
          name="Cloud-Init Template Builder"
          description="Create and manage cloud-init templates for VMs. Supports Linux and Windows multi-phase deployments, variable substitution, and Proxmox-native or HTTP NoCloud delivery."
          badge="active"
          color="bg-sky-500"
          onClick={() => setSubView('cloud-init')}
        />
        <IntegrationCard
          icon={Webhook}
          name="Webhooks"
          description="Send event notifications to external HTTP endpoints when VMs change state."
          badge="coming soon"
          color="bg-violet-500"
        />
        <IntegrationCard
          icon={Github}
          name="GitHub Actions"
          description="Trigger VM workflows directly from CI/CD pipelines via GitHub Actions."
          badge="coming soon"
          color="bg-gray-800"
        />
        <IntegrationCard
          icon={Database}
          name="Prometheus Metrics"
          description="Expose VM metrics via a /metrics endpoint compatible with Prometheus scraping."
          badge="coming soon"
          color="bg-orange-500"
        />
      </div>

      <div className="mt-6 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
        <Plug size={16} className="text-blue-500 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          More integrations are being actively developed. Cloud-Init templates can be applied when deploying apps.
        </p>
      </div>
    </div>
  );
};

export default IntegrationsView;
