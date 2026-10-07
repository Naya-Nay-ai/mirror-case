'use strict';

(() => {
  // Preserve the original save namespace; the entrance never creates or edits cases.
  const GAME_STORAGE_KEY = 'mirror-case:app:v1';
  const UI_STORAGE_KEY = 'mirror-case:ui:v1';
  const dialog = document.querySelector('#entry-dialog');
  const title = document.querySelector('#dialog-title');
  const description = document.querySelector('#dialog-description');
  const settings = document.querySelector('#text-settings');
  const settingsNote = document.querySelector('#settings-note');
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
    if (!dialog.open) dialog.showModal();
  }

  // Extension point: replace only the relevant handler with the future screen/router.
  // Keep data-action values stable; no game rules or case data are defined here.
  const actions = {
    'new-case': () => openPanel('最初の事件は、準備中。', 'いま開けるのは、この入口まで。\n事件が届いたら、ここからふたりの推理をはじめられます。'),
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
  });
  applyTextSize(readStored(UI_STORAGE_KEY)?.textSize);
  updateResumeNote();
})();
