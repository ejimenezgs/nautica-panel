const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const uid = '5vwUKOwvdfQsmnLRhoJCEs9Rqyg1';
const entry = (id, status = 'pending', seconds = 1) => ({ id, sku: id, productName: 'Jabonera', email: `${id}@example.test`, status, createdAt: { seconds } });
const snapshot = entries => ({ docs: entries.map(({ id, ...data }) => ({ id, data: () => data })) });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
class Element {
  constructor() { this.children = []; this.textContent = ''; this.value = ''; this.disabled = false; this.listeners = {}; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  dispatch(name) { return this.listeners[name]?.(); }
}
function harness(options = {}) {
  const elements = Object.fromEntries(['waitlistRows', 'waitlistMessage', 'waitlistSendMessage', 'waitlistSearch', 'refreshWaitlist'].map(id => [id, new Element()]));
  const nav = new Element();
  const calls = { reads: 0, posts: [], tokens: 0, confirms: 0 };
  const user = { uid, getIdToken: async () => { calls.tokens++; return 'mock-id-token'; } };
  const context = vm.createContext({
    document: { getElementById: id => elements[id], querySelector: () => nav, createElement: () => new Element() },
    window: { location: { origin: options.origin || 'https://panel.nauticahome.com.mx' } },
    auth: { currentUser: user }, db: {}, TypeError,
    console: { warn() {} },
    confirm: () => { calls.confirms++; return options.confirm !== false; },
    collection: (_db, name) => { assert.equal(name, 'productWaitlist'); return name; },
    getDocs: async () => { calls.reads++; return options.read ? options.read(calls.reads) : snapshot(options.entries || [entry('one')]); },
    fetch: async (url, request) => { calls.posts.push({ url, request }); return options.send ? options.send() : { ok: true, json: async () => ({ ok: true }) }; }
  });
  vm.runInContext(source.slice(source.indexOf('const WAITLIST_SEND_URL')) + '\nglobalThis.api = {loadWaitlist, renderWaitlist, sendWaitlistEmail, resetWaitlistState};', context);
  return { ...context.api, context, elements, nav, calls, user, rows: () => elements.waitlistRows.children,
    button: (i = 0) => elements.waitlistRows.children[i].children[4].children[0] };
}

test('open and refresh read Firestore only; search filters locally without backend calls', async () => {
  const h = harness({ entries: [entry('old', 'sent', 1), entry('new', 'pending', 2)] });
  h.nav.dispatch('click');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.rows().length, 2);
  assert.equal(h.rows()[0].children[0].textContent, 'new');
  assert.equal(h.calls.reads, 1);
  h.elements.waitlistSearch.value = 'OLD@EXAMPLE.TEST';
  h.elements.waitlistSearch.dispatch('input');
  assert.equal(h.rows().length, 1);
  assert.equal(h.rows()[0].children[0].textContent, 'old');
  assert.equal(h.calls.reads, 1);
  await h.elements.refreshWaitlist.dispatch('click');
  assert.equal(h.calls.reads, 2);
  assert.equal(h.calls.posts.length, 0);
  assert.equal(h.calls.tokens, 0);
});

test('failed refresh retains rows and search works; successful refresh clears load error', async () => {
  const h = harness({ read: n => { if (n === 2) throw new TypeError('Load failed'); return snapshot([entry('one')]); } });
  await h.loadWaitlist();
  assert.equal(await h.loadWaitlist(), false);
  assert.equal(h.rows().length, 1);
  assert.match(h.elements.waitlistMessage.textContent, /últimos datos/);
  h.elements.waitlistSearch.value = 'no matches'; h.renderWaitlist();
  assert.equal(h.rows().length, 0);
  h.elements.waitlistSearch.value = ''; h.renderWaitlist();
  assert.equal(h.rows().length, 1);
  await h.loadWaitlist();
  assert.equal(h.elements.waitlistMessage.textContent, '1 solicitudes');
});

test('newest refresh wins when responses arrive out of order', async () => {
  const first = deferred(), second = deferred();
  const h = harness({ read: n => n === 1 ? first.promise : second.promise });
  const a = h.loadWaitlist(), b = h.loadWaitlist();
  second.resolve(snapshot([entry('new')])); await b;
  first.resolve(snapshot([entry('old')])); await a;
  assert.equal(h.rows()[0].children[0].textContent, 'new');
});

test('permission errors are attributed to Firestore and do not invoke Brevo', async () => {
  const h = harness({ read: () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); } });
  await h.loadWaitlist();
  assert.match(h.elements.waitlistMessage.textContent, /Firestore no autorizó/);
  assert.equal(h.calls.posts.length, 0);
});

test('signed out and other users cannot read or send', async () => {
  for (const currentUser of [null, { uid: 'someone-else' }]) {
    const h = harness(); h.context.auth.currentUser = currentUser;
    assert.equal(await h.loadWaitlist(), false);
    await h.sendWaitlistEmail(entry('one'), new Element());
    assert.equal(h.calls.reads, 0); assert.equal(h.calls.posts.length, 0);
  }
});

test('logout clears rows and discards an in-flight Firestore response', async () => {
  const pending = deferred(); const h = harness({ read: () => pending.promise });
  const load = h.loadWaitlist();
  h.context.auth.currentUser = null; h.resetWaitlistState();
  pending.resolve(snapshot([entry('one')])); await load;
  assert.equal(h.rows().length, 0);
  assert.equal(h.elements.waitlistMessage.textContent, '');
});

for (const [status, label, action] of [['pending', 'Registrado', 'Enviar email'], ['sent', 'Enviado', 'Volver a enviar'], ['visited', 'Visitó producto', 'Volver a enviar']]) {
  test(`${status}: explicit button click sends one authenticated POST to www backend`, async () => {
    const h = harness({ entries: [entry('one', status)] }); await h.loadWaitlist();
    assert.equal(h.rows()[0].children[3].textContent, label);
    assert.equal(h.button().textContent, action);
    assert.equal(h.calls.posts.length, 0);
    await h.button().dispatch('click');
    assert.equal(h.calls.posts.length, 1);
    const { url, request } = h.calls.posts[0];
    assert.equal(url, 'https://www.nauticahome.com.mx/api/brevo/send-waitlist.php');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers.Authorization, 'Bearer mock-id-token');
    assert.deepEqual(JSON.parse(request.body), { id: 'one' });
    assert.match(h.elements.waitlistSendMessage.textContent, /Brevo aceptó/);
  });
}

test('HTTP origin is rejected before requesting a token or sending', async () => {
  const h = harness({ origin: 'http://panel.nauticahome.com.mx' }); await h.loadWaitlist();
  await h.button().dispatch('click');
  assert.equal(h.calls.posts.length, 0); assert.equal(h.calls.tokens, 0);
  assert.match(h.elements.waitlistSendMessage.textContent, /https:\/\/panel/);
  assert.equal(h.rows().length, 1);
});

test('cancelled confirmation does not send', async () => {
  const h = harness({ confirm: false }); await h.loadWaitlist();
  await h.button().dispatch('click'); assert.equal(h.calls.posts.length, 0);
});

test('failed fetch never retries and never replaces Firestore count or available rows', async () => {
  const h = harness({ send: () => { throw new TypeError('Load failed'); } }); await h.loadWaitlist();
  await h.button().dispatch('click');
  assert.equal(h.calls.posts.length, 1); assert.equal(h.rows().length, 1);
  assert.equal(h.elements.waitlistMessage.textContent, '1 solicitudes');
  assert.match(h.elements.waitlistSendMessage.textContent, /no se reintentó automáticamente/);
  assert.equal(h.button().disabled, false);
});

test('accepted email followed by Firestore failure is reported as accepted, not failed sending', async () => {
  const h = harness({ read: n => { if (n > 1) throw new Error('offline'); return snapshot([entry('one')]); } });
  await h.loadWaitlist(); await h.button().dispatch('click');
  assert.equal(h.calls.posts.length, 1); assert.equal(h.rows().length, 1);
  assert.match(h.elements.waitlistSendMessage.textContent, /Brevo aceptó.*No se pudo actualizar/);
  assert.match(h.elements.waitlistMessage.textContent, /últimos datos/);
});

test('duplicate send is suppressed even if search rerenders while request is pending', async () => {
  const pending = deferred(); const h = harness({ send: () => pending.promise }); await h.loadWaitlist();
  const sending = h.button().dispatch('click');
  await new Promise(resolve => setImmediate(resolve));
  h.renderWaitlist(); assert.equal(h.button().disabled, true);
  await h.button().dispatch('click'); assert.equal(h.calls.posts.length, 1);
  pending.resolve({ ok: true, json: async () => ({ ok: true }) }); await sending;
  assert.equal(h.button().disabled, false);
});

test('logout during token retrieval cancels sending', async () => {
  const token = deferred(); const h = harness(); h.user.getIdToken = () => token.promise;
  await h.loadWaitlist(); const sending = h.button().dispatch('click');
  h.context.auth.currentUser = null; h.resetWaitlistState(); token.resolve('token'); await sending;
  assert.equal(h.calls.posts.length, 0); assert.equal(h.rows().length, 0);
});

test('backend rejection stays separate from loading feedback', async () => {
  const h = harness({ send: () => ({ ok: false, json: async () => ({ error: 'Token inválido.' }) }) });
  await h.loadWaitlist(); await h.button().dispatch('click');
  assert.match(h.elements.waitlistSendMessage.textContent, /Token inválido/);
  assert.equal(h.elements.waitlistMessage.textContent, '1 solicitudes');
});

test('document ID cannot be overridden by a data field; content is rendered as text', async () => {
  const h = harness({ read: () => ({ docs: [{ id: 'real', data: () => ({ id: 'forged', sku: '<img onerror=alert(1)>', status: 'pending' }) }] }) });
  await h.loadWaitlist(); assert.equal(h.rows()[0].children[0].textContent, '<img onerror=alert(1)>');
  await h.button().dispatch('click'); assert.deepEqual(JSON.parse(h.calls.posts[0].request.body), { id: 'real' });
});

test('HTTPS redirect and cPanel deployment include .htaccess; frontend cache is invalidated', () => {
  const root = path.join(__dirname, '..');
  assert.match(fs.readFileSync(path.join(root, '.htaccess'), 'utf8'), /RewriteCond %\{HTTPS\} !=on\nRewriteRule \^ https:\/\/panel.nauticahome.com.mx%\{REQUEST_URI\} \[R=301,L\]/);
  assert.match(fs.readFileSync(path.join(root, '.cpanel.yml'), 'utf8'), /cp \.htaccess "\$DEPLOYPATH\/\.htaccess"/);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /app.js\?v=10\.1/); assert.match(html, /id="waitlistSendMessage"/);
});
