(() => {
  'use strict';
  const token = new URLSearchParams(window.location.hash.slice(1)).get('t') || '';
  const form = document.getElementById('preferencesForm');
  const all = document.getElementById('unsubscribeAll');
  const choices = document.getElementById('productChoices');
  const confirm = document.getElementById('confirmUnsubscribe');
  const loadMessage = document.getElementById('loadMessage');
  const submitMessage = document.getElementById('submitMessage');
  const retry = document.getElementById('retryLoad');
  let busy = false;
  let products = [];
  function selected() { return [...choices.querySelectorAll('input:checked')].filter(input => !input.disabled).map(input => input.value); }
  function updateSelection() { confirm.disabled = busy || (!all.checked && selected().length === 0); }
  async function call(action, extra = {}) {
    const res = await fetch('./api/brevo/preferences.php', {
      method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action, ...extra })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudieron procesar tus preferencias.');
    return data;
  }
  function render(data) {
    products = Array.isArray(data.products) ? data.products : [];
    choices.replaceChildren();
    all.checked = data.all === true;
    all.disabled = data.all === true;
    for (const product of products) {
      const label = document.createElement('label'); label.className = 'choice';
      const input = document.createElement('input'); input.type = 'checkbox'; input.value = product.sku;
      input.disabled = product.unsubscribed || data.all === true;
      input.checked = input.disabled;
      const span = document.createElement('span'); span.textContent = product.name;
      const small = document.createElement('small');
      small.textContent = product.sku + (input.disabled ? ' · Baja de usuario' : ' · Dejar de recibir avisos de este producto.');
      span.append(small); label.append(input, span); choices.append(label);
      input.addEventListener('change', () => { all.checked = false; updateSelection(); });
    }
    document.getElementById('accountHint').textContent = data.emailHint || '';
    form.hidden = data.all === true;
    loadMessage.textContent = data.all ? 'Todos tus avisos de Lista de espera ya están desactivados.' : products.length ? '' : 'No tienes avisos de productos disponibles. Puedes desactivar todos los futuros avisos.';
    updateSelection();
  }
  async function load() {
    if (busy) return;
    retry.hidden = true;
    if (!token) { loadMessage.textContent = 'Abre esta página desde el enlace personal incluido en tu correo de Nautica Home.'; return; }
    busy = true; loadMessage.textContent = 'Cargando tus avisos…';
    try { render(await call('list')); }
    catch (error) { loadMessage.textContent = error.message; retry.hidden = false; }
    finally { busy = false; updateSelection(); }
  }
  all.addEventListener('change', () => {
    choices.querySelectorAll('input').forEach(input => { if (!input.disabled) input.checked = all.checked; });
    updateSelection();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const skus = selected();
    if (!all.checked && skus.length === 0) { submitMessage.textContent = 'Selecciona al menos un aviso.'; return; }
    const stopAll = all.checked;
    busy = true; confirm.disabled = true; submitMessage.textContent = 'Guardando tu baja…';
    try {
      const data = await call('unsubscribe', { all: stopAll, skus });
      document.getElementById('preferencesView').hidden = true;
      document.getElementById('confirmationView').hidden = false;
      document.getElementById('confirmationMessage').textContent = data.all
        ? 'Has desactivado todos tus avisos de Lista de espera. No recibirás más notificaciones de productos en este correo.'
        : 'Has desactivado los avisos de los productos seleccionados. Los demás avisos se conservan.';
    } catch (error) {
      submitMessage.textContent = error.message + ' No se confirmó la baja; vuelve a cargar tus preferencias antes de intentarlo otra vez.';
      retry.hidden = false;
    } finally { busy = false; updateSelection(); }
  });
  retry.addEventListener('click', load);
  load(); // Reads preferences only. Opening a link never unsubscribes or sends an email.
})();
