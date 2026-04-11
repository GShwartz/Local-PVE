import { useState, useRef } from 'react';
import { Plus, Trash2, Save, Copy, FileCode, AlertCircle, Upload } from 'lucide-react';

interface CIPhase {
  phase: number;
  label: string;
  userData: string;
}

interface CITemplate {
  id: string;
  name: string;
  description: string;
  targetOS: string;
  deployMode?: 'user_data' | 'ci_drive';
  phases: CIPhase[];
}

interface CloudInitViewProps {
  addAlert: (message: string, type: string) => void;
}

const STORAGE_KEY = 'local-pve-ci-templates';

const DEFAULT_LINUX_TEMPLATE = `#cloud-config
hostname: vm-instance

package_update: true
package_upgrade: true

packages:
  - curl
  - wget
  - vim
  - htop
  - net-tools

users:
  - name: deploy
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-rsa AAAA...replace-with-your-key

timezone: UTC

runcmd:
  - echo "Provisioning complete" > /etc/motd
`;

const DEFAULT_EMPTY_PHASE = `# empty phase`;

const loadTemplates = (): CITemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CITemplate[];
  } catch {}
  return [];
};

const saveTemplates = (templates: CITemplate[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {}
};

const CloudInitView = ({ addAlert }: CloudInitViewProps) => {
  const [templates, setTemplates] = useState<CITemplate[]>(loadTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CITemplate | null>(null);
  const [activePhase, setActivePhase] = useState<number>(1);
  const [dirty, setDirty] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingPhase, setRenamingPhase] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = !!editing;

  const patch = (partial: Partial<CITemplate>) => {
    setEditing(prev => (prev ? { ...prev, ...partial } : prev));
    setDirty(true);
  };

  const handleNew = () => {
    const id = `ci-${Date.now()}`;
    const tmpl: CITemplate = {
      id,
      name: 'New Template',
      description: '',
      targetOS: 'Linux',
      deployMode: 'user_data',
      phases: [{ phase: 1, label: 'Phase 1', userData: DEFAULT_LINUX_TEMPLATE }],
    };

    const updated = [...templates, tmpl];
    setTemplates(updated);
    saveTemplates(updated);

    setSelectedId(id);
    setEditing({ ...tmpl, phases: tmpl.phases.map(p => ({ ...p })) });
    setActivePhase(1);
    setDirty(false);
  };

  const handleSelect = (id: string) => {
    const t = templates.find(t => t.id === id);
    if (!t) return;

    setSelectedId(id);
    setEditing({ ...t, phases: t.phases.map(p => ({ ...p })) });
    setActivePhase(1);
    setDirty(false);
    setConfirmDeleteId(null);
    setRenamingPhase(null);
  };

  const handleSave = () => {
    if (!editing) return;

    const updated = templates.map(t =>
      t.id === editing.id ? { ...editing } : t
    );

    setTemplates(updated);
    saveTemplates(updated);
    setDirty(false);
    addAlert(`Template "${editing.name}" saved.`, 'success');
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (confirmDeleteId === id) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      saveTemplates(updated);

      if (selectedId === id) {
        setSelectedId(null);
        setEditing(null);
      }

      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const t = templates.find(t => t.id === id);
    if (!t) return;

    const copy: CITemplate = {
      ...t,
      id: `ci-${Date.now()}`,
      name: `${t.name} (copy)`,
      phases: t.phases.map(p => ({ ...p })),
    };

    const updated = [...templates, copy];
    setTemplates(updated);
    saveTemplates(updated);
  };

  const patchPhaseUserData = (phaseNum: number, userData: string) => {
    if (!editing) return;

    setEditing(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        phases: prev.phases.map(p =>
          p.phase === phaseNum ? { ...p, userData } : p
        ),
      };
    });

    setDirty(true);
  };

  const patchPhaseLabel = (phaseNum: number, label: string) => {
    if (!editing) return;

    setEditing(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        phases: prev.phases.map(p =>
          p.phase === phaseNum ? { ...p, label } : p
        ),
      };
    });

    setDirty(true);
  };

  const addPhase = () => {
    if (!editing) return;

    const nextPhaseNumber =
      editing.phases.length > 0
        ? Math.max(...editing.phases.map(p => p.phase)) + 1
        : 1;

    const newPhase: CIPhase = {
      phase: nextPhaseNumber,
      label: `Phase ${nextPhaseNumber}`,
      userData: DEFAULT_EMPTY_PHASE,
    };

    setEditing({
      ...editing,
      phases: [...editing.phases, newPhase],
    });

    setActivePhase(nextPhaseNumber);
    setDirty(true);
  };

  const removePhase = (phaseNum: number) => {
    if (!editing) return;
    if (editing.phases.length <= 1) return;
    if (phaseNum === 1) return;

    const updatedPhases = editing.phases
      .filter(p => p.phase !== phaseNum)
      .map((p, idx) => ({
        ...p,
        phase: idx + 1,
        label: p.label.startsWith('Phase') ? `Phase ${idx + 1}` : p.label,
      }));

    const newActive =
      activePhase === phaseNum
        ? updatedPhases[0].phase
        : activePhase > phaseNum
          ? activePhase - 1
          : activePhase;

    setEditing({
      ...editing,
      phases: updatedPhases,
    });

    setActivePhase(newActive);
    setDirty(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (!Array.isArray(parsed)) {
          addAlert('Invalid format: expected array of templates', 'error');
          return;
        }

        const valid: CITemplate[] = parsed.filter(
          (t: any) => t && t.id && t.name && Array.isArray(t.phases)
        );

        const updated = [...templates, ...valid];

        setTemplates(updated);
        saveTemplates(updated);

        addAlert(`Imported ${valid.length} templates`, 'success');
      } catch {
        addAlert('Failed to parse JSON file', 'error');
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const activePhaseData = editing?.phases.find(p => p.phase === activePhase);

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">

      {/* LEFT PANEL */}
      <div
        className={`bg-white flex flex-col transition-all duration-300 ease-in-out flex-shrink-0
        ${isEditing ? 'w-72 border-r border-gray-200' : 'w-full'}`}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Templates</h3>

          <div className="flex gap-2">
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs rounded-md"
            >
              <Upload size={13} /> Import
            </button>

            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold"
            >
              <Plus size={13} /> New
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />

        <div
          className={`flex-1 overflow-y-auto p-4 gap-3
          ${isEditing ? 'flex flex-col' : 'grid sm:grid-cols-2 lg:grid-cols-3'}`}
        >
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-400 text-sm py-20">
              <FileCode size={28} className="mb-2 opacity-30" />
              No templates yet
            </div>
          ) : (
            templates.map(t => (
              <div
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`group border rounded-xl p-4 cursor-pointer transition-all w-full
                ${selectedId === t.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex gap-2 items-center">
                  <input
                    value={t.name}
                    readOnly
                    className="text-sm font-semibold text-gray-900 truncate w-28 bg-transparent"
                  />
                </div>

                <p className="text-xs text-gray-500 mt-1 truncate">
                  {t.description || 'No description'}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-gray-400">
                    {t.phases.length} phases
                  </span>

                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <button onClick={e => handleCopy(t.id, e)}>
                      <Copy size={13} />
                    </button>
                    <button onClick={e => handleDeleteClick(t.id, e)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300
        ${isEditing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {editing && (
          <>
            <div className="bg-white border-b px-5 py-3 flex items-center gap-3">
              <input
                value={editing.name}
                onChange={e => patch({ name: e.target.value })}
                className="border rounded-lg px-3 py-1.5 text-sm w-40"
              />

              <input
                value={editing.description}
                onChange={e => patch({ description: e.target.value })}
                className="border rounded-lg px-3 py-1.5 text-sm flex-1"
                placeholder="Description"
              />

              {dirty && <AlertCircle size={14} className="text-amber-500" />}
            </div>

            <div className="bg-white border-b px-5 py-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Target OS</span>
              <select
                value={editing.targetOS}
                onChange={e => patch({ targetOS: e.target.value })}
                className="border rounded-lg px-3 py-1.5 text-sm w-48 bg-white"
              >
                <option value="Linux">Linux</option>
                <option value="Windows">Windows</option>
              </select>
            </div>

            {/* PHASES */}
            <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto items-center">
              {editing.phases.map(p => (
                <div key={p.phase} className="flex items-center gap-2">
                  {renamingPhase === p.phase ? (
                    <input
                      autoFocus
                      value={p.label}
                      onChange={e => patchPhaseLabel(p.phase, e.target.value)}
                      onBlur={() => setRenamingPhase(null)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') setRenamingPhase(null);
                      }}
                      className="text-xs px-2 py-1 border rounded-md w-28"
                    />
                  ) : (
                    <div
                      onClick={() => setActivePhase(p.phase)}
                      onDoubleClick={() => setRenamingPhase(p.phase)}
                      className={`text-xs px-2 py-1 border rounded-md w-15 cursor-pointer select-none
                        ${activePhase === p.phase ? 'bg-blue-100' : ''}`}
                    >
                      {p.label}
                    </div>
                  )}

                  {editing.phases.length > 1 && p.phase !== 1 && (
                    <button
                      onClick={() => removePhase(p.phase)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={addPhase}
                className="ml-auto text-xs px-2 py-1 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                + Phase
              </button>
            </div>

            {/* EDITOR */}
            <div className="flex-1 p-4 overflow-hidden">
              <textarea
                value={activePhaseData?.userData ?? ''}
                onChange={e => patchPhaseUserData(activePhase, e.target.value)}
                className="w-full h-full min-h-[500px] font-mono text-sm border rounded-xl p-4"
                spellCheck={false}
              />
            </div>

            {/* SAVE BAR */}
            <div className="bg-white border-t px-5 py-3 flex justify-end">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs flex items-center gap-1"
              >
                <Save size={13} /> Save
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default CloudInitView;
