import { useState } from 'react';
import { Plus, Trash2, Save, Copy, FileCode, AlertCircle, X } from 'lucide-react';

interface CIPhase {
  phase: number;
  label: string;
  userData: string;
}

interface CITemplate {
  id: string;
  name: string;
  targetOS: string;
  phases: CIPhase[];
}

interface CloudInitViewProps {
  addAlert: (message: string, type: string) => void;
}

const STORAGE_KEY = 'local-pve-ci-templates';

const loadTemplates = (): CITemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CITemplate[];
  } catch { }
  return [];
};

const saveTemplates = (templates: CITemplate[]): void => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); } catch { }
};

const CloudInitView = ({ addAlert }: CloudInitViewProps) => {
  const [templates, setTemplates] = useState<CITemplate[]>(loadTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CITemplate | null>(null);
  const [activePhase, setActivePhase] = useState<number>(1);
  const [editingPhaseLabelNum, setEditingPhaseLabelNum] = useState<number | null>(null);
  const [phaseLabelInput, setPhaseLabelInput] = useState('');
  const [dirty, setDirty] = useState(false);

  const patch = (partial: Partial<CITemplate>) => {
    setEditing(prev => prev ? { ...prev, ...partial } : prev);
    setDirty(true);
  };

  const handleNew = () => {
    const id = `ci-${Date.now()}`;
    const tmpl: CITemplate = {
      id,
      name: 'New Template',
      targetOS: '',
      phases: [{ phase: 1, label: 'Phase 1', userData: '#cloud-config\n\n' }],
    };
    const updated = [...templates, tmpl];
    setTemplates(updated); saveTemplates(updated);
    setSelectedId(id);
    setEditing({ ...tmpl, phases: tmpl.phases.map(p => ({ ...p })) });
    setActivePhase(1); setDirty(false);
  };

  const handleSelect = (id: string) => {
    const t = templates.find(t => t.id === id);
    if (!t) return;
    setSelectedId(id);
    setEditing({ ...t, phases: t.phases.map(p => ({ ...p })) });
    setActivePhase(t.phases[0]?.phase ?? 1); setDirty(false);
  };

  const handleSave = () => {
    if (!editing) return;
    const updated = templates.map(t => t.id === editing.id ? { ...editing } : t);
    setTemplates(updated); saveTemplates(updated);
    setDirty(false);
    addAlert(`Template "${editing.name}" saved.`, 'success');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const t = templates.find(t => t.id === id);
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated); saveTemplates(updated);
    if (selectedId === id) { setSelectedId(null); setEditing(null); setDirty(false); }
    addAlert(`Template "${t?.name ?? ''}" deleted.`, 'info');
  };

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const t = templates.find(t => t.id === id);
    if (!t) return;
    const copy: CITemplate = {
      ...t, id: `ci-${Date.now()}`, name: `${t.name} (copy)`,
      phases: t.phases.map(p => ({ ...p })),
    };
    const updated = [...templates, copy];
    setTemplates(updated); saveTemplates(updated);
    addAlert(`Copied as "${copy.name}".`, 'success');
  };

  const addPhase = () => {
    if (!editing) return;
    const nextNum = editing.phases.length + 1;
    patch({ phases: [...editing.phases, { phase: nextNum, label: `Phase ${nextNum}`, userData: '#cloud-config\n\n' }] });
    setActivePhase(nextNum);
  };

  const removePhase = (phaseNum: number) => {
    if (!editing || editing.phases.length <= 1) return;
    const remaining = editing.phases
      .filter(p => p.phase !== phaseNum)
      .map((p, i) => ({ ...p, phase: i + 1 }));
    patch({ phases: remaining });
    setActivePhase(Math.min(activePhase, remaining.length));
  };

  const patchPhaseLabel = (phaseNum: number, label: string) => {
    if (!editing) return;
    patch({ phases: editing.phases.map(p => p.phase === phaseNum ? { ...p, label: label || p.label } : p) });
  };

  const patchPhaseUserData = (phaseNum: number, userData: string) => {
    if (!editing) return;
    patch({ phases: editing.phases.map(p => p.phase === phaseNum ? { ...p, userData } : p) });
  };

  const activePhaseData = editing?.phases.find(p => p.phase === activePhase);
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors';

  return (
    <div className="flex h-full animate-fade-in-up overflow-hidden">

      {/* Left panel */}
      <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">Templates</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-2 py-8 text-center flex-1">
              <FileCode size={28} className="text-gray-200" />
              <p className="text-xs font-medium text-gray-500">No templates yet</p>
              <button onClick={handleNew}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                <Plus size={13} /> New Template
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-0.5 flex-1">
                {templates.map(t => (
                  <div key={t.id} onClick={() => handleSelect(t.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs
                      ${selectedId === t.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <span className="truncate flex-1 mr-1">{t.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={e => handleCopy(t.id, e)} title="Copy"
                        className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors"><Copy size={12} /></button>
                      <button onClick={e => handleDelete(t.id, e)} title="Delete"
                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {!selectedId && (
                <div className="mx-1 my-2 px-3 py-3 border border-dashed border-gray-200 rounded-lg text-center">
                  <p className="text-xs text-gray-400">Select a template to edit</p>
                </div>
              )}
              <button onClick={handleNew}
                className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-blue-200 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                <Plus size={12} /> New Template
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {editing ? (
          <>
            <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <input value={editing.name} onChange={e => patch({ name: e.target.value })}
                  className={`${inputCls} font-semibold flex-1 min-w-0`} placeholder="Template name" />
                <input value={editing.targetOS} onChange={e => patch({ targetOS: e.target.value })}
                  className={`${inputCls} w-44 flex-shrink-0`} placeholder="Target OS (optional)" />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {dirty && <AlertCircle size={14} className="text-amber-500" title="Unsaved changes" />}
                <button onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                  <Save size={13} /> Save
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0 overflow-x-auto custom-scrollbar">
              {editing.phases.map(p => (
                <div key={p.phase} onClick={() => setActivePhase(p.phase)}
                  className={`group flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex-shrink-0 select-none
                    ${p.phase === activePhase ? 'bg-gray-100 border border-gray-200 shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  {editingPhaseLabelNum === p.phase ? (
                    <input autoFocus value={phaseLabelInput} onChange={e => setPhaseLabelInput(e.target.value)}
                      onBlur={() => { patchPhaseLabel(p.phase, phaseLabelInput); setEditingPhaseLabelNum(null); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { patchPhaseLabel(p.phase, phaseLabelInput); setEditingPhaseLabelNum(null); }
                        if (e.key === 'Escape') setEditingPhaseLabelNum(null);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="w-20 bg-transparent text-xs outline-none border-b border-blue-400 text-gray-900" />
                  ) : (
                    <span title="Double-click to rename"
                      onDoubleClick={e => { e.stopPropagation(); setEditingPhaseLabelNum(p.phase); setPhaseLabelInput(p.label); }}>
                      {p.label}
                    </span>
                  )}
                  {editing.phases.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); removePhase(p.phase); }} title="Remove phase"
                      className="opacity-0 group-hover:opacity-100 ml-0.5 text-gray-400 hover:text-red-500 transition-all">
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addPhase}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex-shrink-0">
                <Plus size={12} /> Add Phase
              </button>
            </div>

            <div className="flex-1 p-4 overflow-hidden">
              <textarea
                key={`${selectedId}-${activePhase}`}
                value={activePhaseData?.userData ?? ''}
                onChange={e => patchPhaseUserData(activePhase, e.target.value)}
                className="w-full h-full resize-none font-mono text-sm text-gray-800 bg-white border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors custom-scrollbar"
                spellCheck={false}
                placeholder="#cloud-config&#10;&#10;# Enter your cloud-init configuration here"
              />
            </div>
          </>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
};

export default CloudInitView;
