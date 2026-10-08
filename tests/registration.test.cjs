const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const PAIR = 'mirror-case:pair:v1';
const GAME = 'mirror-case:app:v1';
const UI = 'mirror-case:ui:v1';
const names = { version: 1, detectiveName: 'Nay', assistantName: 'なや' };

// A small DOM event harness: exercises storage and screen transitions, not layout.
function boot(initial = {}, blocked = false) {
  const data = new Map(Object.entries(initial));
  const writes = [];
  const nodes = new Map();
  let focused;
  function element() {
    const events = {};
    const attributes = {};
    const classes = new Set();
    return {
      hidden: false, open: false, value: '', textContent: '', dataset: {}, checked: false,
      firstChild: { textContent: '' },
      classList: { add: (...keys) => keys.forEach(k => classes.add(k)), remove: (...keys) => keys.forEach(k => classes.delete(k)), toggle: (key, on) => on ? classes.add(key) : classes.delete(key) },
      addEventListener: (name, fn) => { (events[name] ||= []).push(fn); },
      emit(name, detail = {}) { (events[name] || []).forEach(fn => fn({ preventDefault() {}, ...detail })); },
      focus() { focused = this; },
      setAttribute: (k, v) => { attributes[k] = v; },
      removeAttribute: k => { delete attributes[k]; },
      showModal() { this.open = true; },
      close() { this.open = false; this.emit('close'); },
    };
  }
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const node = element();
    node.hidden = /\bhidden\b/.test(match[0]);
    nodes.set(`#${match[1]}`, node);
  }
  nodes.set('.dialog-brand', element());
  const actions = [...html.matchAll(/data-action="([^"]+)"/g)].map(match => {
    const node = element(); node.dataset.action = match[1]; return node;
  });
  const closes = [element(), element()];
  const sizes = ['standard', 'large'].map(value => { const node = element(); node.value = value; return node; });
  const window = element();
  const document = {
    documentElement: { dataset: {} },
    querySelector(selector) { assert.ok(nodes.has(selector), `Unknown DOM selector: ${selector}`); return nodes.get(selector); },
    querySelectorAll(selector) {
      if (selector === '[data-action]') return actions;
      if (selector === '[data-close]') return closes;
      if (selector === 'input[name="text-size"]') return sizes;
      throw new Error(`Unknown DOM selector: ${selector}`);
    },
  };
  vm.runInNewContext(source, { document, window, localStorage: {
    getItem(key) { if (blocked) throw new Error('Storage blocked'); return data.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error('Storage blocked'); data.set(key, value); writes.push(key); },
  } });
  return {
    data, writes, sizes, window, document, closes,
    node: id => nodes.get(`#${id}`),
    action(name) { actions.find(node => node.dataset.action === name).emit('click'); },
    submit(detective = 'Nay', assistant = 'なや') {
      nodes.get('#detective-name').value = detective;
      nodes.get('#assistant-name').value = assistant;
      nodes.get('#pair-form').emit('submit');
    },
    focus: () => focused,
    trigger: name => actions.find(node => node.dataset.action === name),
  };
}

test('first visit opens a blank register; startup writes nothing', () => {
  const app = boot();
  assert.equal(app.node('pair-summary').hidden, true);
  assert.deepEqual(app.writes, []);
  app.action('new-case');
  assert.equal(app.node('pair-form').hidden, false);
  assert.equal(app.node('detective-name').value, '');
  assert.equal(app.node('entry-dialog').open, true);
  assert.equal(app.focus(), app.node('detective-name'));
});

test('trimmed names persist, completion appears, CASE ends at placeholder', () => {
  const app = boot(); app.action('new-case'); app.submit(' Nay ', ' なや ');
  assert.deepEqual(JSON.parse(app.data.get(PAIR)), names);
  assert.equal(app.node('pair-form').hidden, true);
  assert.equal(app.node('pair-result').hidden, false);
  assert.equal(app.node('pair-seal').hidden, false);
  assert.equal(app.node('pair-assistant').textContent, 'なや');
  app.node('receive-case').emit('click');
  assert.equal(app.node('dialog-title').textContent, '最初のCASEは準備中です');
  assert.equal(app.data.has(GAME), false);
});

test('reloaded registration skips form and completion animation', () => {
  const app = boot({ [PAIR]: JSON.stringify(names) }); app.action('new-case');
  assert.equal(app.node('pair-form').hidden, true);
  assert.equal(app.node('pair-result').hidden, false);
  assert.equal(app.node('pair-seal').hidden, true);
  assert.equal(app.node('pair-summary').hidden, false);
});

test('settings edit can be canceled, then saved, without touching existing saves', () => {
  const original = { [GAME]: '{"activeCase":{"id":42},"untouched":true}', [UI]: '{"version":1,"textSize":"large"}', [PAIR]: JSON.stringify(names) };
  const app = boot(original); app.action('settings'); app.node('edit-pair').emit('click');
  assert.equal(app.node('detective-name').value, 'Nay');
  app.node('detective-name').value = '未保存'; app.closes[0].emit('click');
  assert.equal(app.data.get(PAIR), original[PAIR]);
  assert.equal(app.focus(), app.trigger('settings'));
  app.action('settings'); app.node('edit-pair').emit('click'); app.submit('探偵', '助手');
  assert.equal(JSON.parse(app.data.get(PAIR)).detectiveName, '探偵');
  assert.equal(app.node('dialog-title').textContent, '記帳を更新しました');
  assert.equal(app.data.get(GAME), original[GAME]); assert.equal(app.data.get(UI), original[UI]);
  assert.deepEqual(app.writes, [PAIR]);
});

test('blank, whitespace-only and over-limit names cannot register', () => {
  for (const [detective, assistant] of [['', 'なや'], ['　 ', 'なや'], ['Nay', ' '], ['a'.repeat(41), 'なや']]) {
    const app = boot(); app.action('new-case'); app.submit(detective, assistant);
    assert.equal(app.data.has(PAIR), false);
    assert.ok(app.node('pair-error').textContent);
    assert.equal(app.node('pair-form').hidden, false);
  }
});

test('40-character and HTML-like names are rendered as text', () => {
  const app = boot(); app.action('new-case'); app.submit('あ'.repeat(40), '<img src=x onerror=alert(1)>');
  assert.equal(app.node('pair-detective').textContent, 'あ'.repeat(40));
  assert.equal(app.node('result-assistant').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(source.includes('innerHTML'), false);
});

test('blocked storage retains input and does not claim completion', () => {
  const app = boot({}, true); app.action('new-case'); app.submit();
  assert.equal(app.node('pair-result').hidden, true);
  assert.equal(app.node('pair-form').hidden, false);
  assert.equal(app.node('detective-name').value, 'Nay');
  assert.match(app.node('pair-error').textContent, /保存できません/);
});

test('corrupt or unsupported stored pair is preserved until explicit registration', () => {
  for (const value of ['{broken', 'null', '[]', '{"version":2,"detectiveName":"Nay","assistantName":"なや"}', '{"version":1,"detectiveName":" ","assistantName":"なや"}']) {
    const app = boot({ [PAIR]: value }); app.action('new-case');
    assert.equal(app.node('pair-form').hidden, false);
    assert.equal(app.data.get(PAIR), value);
    assert.deepEqual(app.writes, []);
  }
});

test('cross-tab changes refresh pair and deletion requires registration again', () => {
  const app = boot({ [PAIR]: JSON.stringify(names) }); app.action('new-case');
  app.data.set(PAIR, JSON.stringify({ ...names, detectiveName: '別名' })); app.window.emit('storage', { key: PAIR });
  assert.equal(app.node('result-detective').textContent, '別名');
  app.data.delete(PAIR); app.window.emit('storage', { key: PAIR });
  assert.equal(app.node('pair-form').hidden, false);
  assert.equal(app.node('pair-summary').hidden, true);
});

test('existing resume, archive and text-size controls still work', () => {
  const app = boot({ [GAME]: '{"activeCase":{}}' }); app.action('resume');
  assert.match(app.node('dialog-description').textContent, /保存データは見つかりました/);
  app.action('archive'); assert.equal(app.node('dialog-title').textContent, '事件記録');
  app.action('settings'); app.sizes[1].emit('change');
  assert.equal(app.document.documentElement.dataset.textSize, 'large');
  assert.equal(JSON.parse(app.data.get(UI)).textSize, 'large');
  assert.equal(app.data.get(GAME), '{"activeCase":{}}');
});
