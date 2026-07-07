// localStorage persistence. Faithful rule: saving is only OFFERED after
// clearing a stage in which all four A-P-E-X letters were collected.

const KEY = 'gorilla-land-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function writeSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
  catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
