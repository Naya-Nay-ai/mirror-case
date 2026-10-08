'use strict';

(() => {
  // Preserve the original save namespace; the entrance never creates or edits cases.
  const GAME_STORAGE_KEY = 'mirror-case:app:v1';
  const UI_STORAGE_KEY = 'mirror-case:ui:v1';
  const PAIR_STORAGE_KEY = 'mirror-case:pair:v1';
  const dialog = document.querySelector('#entry-dialog');
  const title = document.querySelector('#dialog-title');
  const description = document.querySelector('#dialog-description');
  const settings = document.querySelector('#text-settings');
  const settingsNote = document.querySelector('#settings-note');
  const pairForm = document.querySelector('#pair-form');
  const pairResult = document.querySelector('#pair-result');
  const pairSettings = document.querySelector('#pair-settings');
  const detectiveInput = document.querySelector('#detective-name');
  const assistantInput = document.querySelector('#assistant-name');
  const pairError = document.querySelector('#pair-error');
  let pair = null;
  let lastTrigger = null;

  function readStored(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function hasSavedCase() {
    return Boolean(readStored(GAME_STORAGE_KEY)?.activeCase);
  }

  function validName(name) {
    return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 40;
  }

  function readPair() {
    const saved = readStored(PAIR_STORAGE_KEY);
    if (saved?.version !== 1 || !validName(saved.detectiveName) || !validName(saved.assistantName)) return null;
    return { version: 1, detectiveName: saved.detectiveName.trim(), assistantName: saved.assistantName.trim() };
  }

  function updatePairDisplay() {
    document.querySelector('#pair-summary').hidden = !pair;
    for (const prefix of ['pair', 'result']) {
      document.querySelector(`#${prefix}-detective`).textContent = pair?.detectiveName || '';
      document.querySelector(`#${prefix}-assistant`).textContent = pair?.assistantName || '';
    }
    document.querySelector('#edit-pair').firstChild.textContent = pair ? '登録簿の名前を変更する' : '二人の名前を記帳する';
  }

  function updateResumeNote() {
    document.querySelector('#resume-note').textContent = hasSavedCase()
      ? '保存データあり・再開機能は準備中'
      : '保存された事件はありません';
  }

  function applyTextSize(size) {
    const value = size === 'large' ? 'large' : 'standard';
    document.documentElement.dataset.textSize = value;
    document.querySelectorAll('input[name="text-size"]').forEach(input => {
      input.checked = input.value === value;
    });
  }

  function openPanel(panelTitle, panelDescription, showSettings = false) {
    title.textContent = panelTitle;
    description.textContent = panelDescription;
    settings.hidden = !showSettings;
    pairSettings.hidden = !showSettings;
    pairForm.hidden = true;
    pairResult.hidden = true;
    dialog.classList.remove('registry-dialog', 'registry-complete');
    document.querySelector('.dialog-brand').textContent = 'MIRROR CASE';
    if (!dialog.open) dialog.showModal();
    title.focus();
  }

  function openRegistry() {
    openPanel(pair ? '登録簿を書き直す' : '調査登録簿', 'MIRROR ROOMでは、二人で一件を担当します。');
    dialog.classList.add('registry-dialog');
    document.querySelector('.dialog-brand').textContent = 'MIRROR ROOM';
    pairForm.hidden = false;
    detectiveInput.value = pair?.detectiveName || '';
    assistantInput.value = pair?.assistantName || '';
    pairError.textContent = '';
    for (const input of [detectiveInput, assistantInput]) input.removeAttribute('aria-invalid');
    document.querySelector('#pair-submit').firstChild.textContent = pair ? '記帳を更新する' : '二人の名前を記帳する';
    detectiveInput.focus();
  }

  function openPairReady(justSaved = false, edited = false) {
    openPanel(justSaved ? (edited ? '記帳を更新しました' : '二人の名前を、登録簿に。') : 'おかえりなさい、MIRROR ROOMへ。', '記録は探偵へ。現場は助手へ。');
    dialog.classList.add('registry-dialog');
    dialog.classList.toggle('registry-complete', justSaved);
    document.querySelector('.dialog-brand').textContent = 'MIRROR ROOM';
    pairResult.hidden = false;
    document.querySelector('#pair-seal').hidden = !justSaved;
    updatePairDisplay();
  }

  pairForm.addEventListener('submit', event => {
    event.preventDefault();
    pairError.textContent = '';
    for (const input of [detectiveInput, assistantInput]) input.removeAttribute('aria-invalid');
    const invalid = [detectiveInput, assistantInput].find(input => !validName(input.value));
    if (invalid) {
      pairError.textContent = '探偵名と助手名を、それぞれ1〜40文字で記入してください。空白だけでは記帳できません。';
      invalid.setAttribute('aria-invalid', 'true');
      invalid.focus();
      return;
    }
    const nextPair = { version: 1, detectiveName: detectiveInput.value.trim(), assistantName: assistantInput.value.trim() };
    try {
      localStorage.setItem(PAIR_STORAGE_KEY, JSON.stringify(nextPair));
    } catch {
      pairError.textContent = '記帳を保存できませんでした。ブラウザの保存設定や空き容量を確認して、もう一度お試しください。入力した名前はこの画面に残っています。';
      return;
    }
    const edited = Boolean(pair);
    pair = nextPair;
    openPairReady(true, edited);
  });

  document.querySelector('#edit-pair').addEventListener('click', openRegistry);
  document.querySelector('#receive-case').addEventListener('click', () => {
    if (!pair) return openRegistry();
    openPanel('最初のCASEは準備中です', '二人の記帳は完了しています。\nCASEが届いたら、ここから調査をはじめられます。');
    document.querySelector('.dialog-brand').textContent = 'MIRROR ROOM';
  });

  // Extension point: replace only the relevant handler with the future screen/router.
  // Keep data-action values stable; no game rules or case data are defined here.
  const actions = {
    'new-case': () => pair ? openPairReady() : openRegistry(),
    resume: () => openPanel('つづきから', hasSavedCase()
      ? '保存データは見つかりました。\nこの試作版には、事件を再開する機能がまだありません。保存データはそのまま残しています。'
      : '保存された事件は、まだありません。\nゲーム本編ができたら、ここから途中の事件に戻れるようになります。'),
    archive: () => openPanel('事件記録', '事件記録の入口です。\n記録の内容や残し方は、ゲーム本編と一緒に準備しています。'),
    settings: () => openPanel('設定', '読みやすい文字の大きさを選べます。', true),
  };

  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      lastTrigger = button;
      actions[button.dataset.action]?.();
    });
  });

  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
  // Native dialog provides Escape dismissal, modal focus containment and inert background.
  dialog.addEventListener('close', () => lastTrigger?.focus());

  document.querySelectorAll('input[name="text-size"]').forEach(input => {
    input.addEventListener('change', () => {
      applyTextSize(input.value);
      try {
        localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ version: 1, textSize: input.value }));
        settingsNote.textContent = 'このブラウザに保存しました。';
      } catch {
        settingsNote.textContent = 'このブラウザでは保存できないため、今回の表示に適用しています。';
      }
    });
  });

  window.addEventListener('storage', event => {
    if (event.key === GAME_STORAGE_KEY || event.key === null) updateResumeNote();
    if (event.key === UI_STORAGE_KEY || event.key === null) applyTextSize(readStored(UI_STORAGE_KEY)?.textSize);
    if (event.key === PAIR_STORAGE_KEY || event.key === null) {
      pair = readPair();
      updatePairDisplay();
      if (dialog.open && !pairResult.hidden) {
        if (pair) openPairReady();
        else openRegistry();
      }
    }
  });
  pair = readPair();
  updatePairDisplay();
  applyTextSize(readStored(UI_STORAGE_KEY)?.textSize);
  updateResumeNote();
})();
