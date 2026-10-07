const STORAGE_KEY = 'mirror-case:app:v1';

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeInitialState() {
  if (readState()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      activeCase: null,
      settings: {
        tone: null,
        autosave: true,
      },
    }));
  } catch {
    // Storage may be unavailable in restrictive/private environments.
  }
}

function updateResumeState() {
  const state = readState();
  const resumeNote = document.querySelector('#resume-note');
  if (!resumeNote) return;
  resumeNote.textContent = state?.activeCase ? '途中の事件あり' : 'セーブデータなし';
}

function bindPlaceholderActions() {
  const note = document.querySelector('#dev-note');
  document.querySelectorAll('[data-placeholder]').forEach((button) => {
    button.addEventListener('click', () => {
      if (note) note.textContent = 'ここはまだ空き部屋。内容が決まったらつなぐ。';
    });
  });
}

writeInitialState();
updateResumeState();
bindPlaceholderActions();
