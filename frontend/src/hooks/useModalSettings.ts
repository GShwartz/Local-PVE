/**
 * useModalSettings — persists per-modal user preferences to localStorage.
 *
 * Each modal gets its own namespaced key so settings never collide.
 * Call `load()` to hydrate state on mount, `save(patch)` whenever values change.
 *
 * Example:
 *   const ms = useModalSettings('createVm');
 *   // on mount:
 *   const saved = ms.load();          // { cpus: 2, ram: 4096, ... }
 *   setCpus(saved.cpus ?? 1);
 *   // when user changes a field:
 *   ms.save({ cpus: 4 });
 */

const PREFIX = 'local-pve-modal:';

export type ModalKey = 'createVm' | 'createK8s' | 'deployApp';

export function useModalSettings(key: ModalKey) {
  const storageKey = PREFIX + key;

  const load = (): Record<string, any> => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const save = (patch: Record<string, any>) => {
    try {
      const current = load();
      localStorage.setItem(storageKey, JSON.stringify({ ...current, ...patch }));
    } catch { /* quota or SSR — ignore */ }
  };

  const clear = () => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  return { load, save, clear };
}
