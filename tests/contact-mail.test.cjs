const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
function setup(fetch) {
  let widgetOptions, resets = 0;
  const element = () => ({textContent:'', setAttribute(){}, appendChild(){}, replaceChildren(){}});
  const container = element();
  const status = { textContent: '' };
  const button = { disabled: false };
  const form = {
    dataset: { contactForm: 'bmg_hospitality_landing', defaultService: 'Hospitality' },
    fields: { name: ' Test ', email: 'test@example.com', message: ' Messaggio ', website: '' },
    querySelector: selector => selector.includes('status') ? status : selector.includes('turnstile') ? container : button,
    addEventListener: (_, handler) => { form.submit = handler; },
    reportValidity: () => true,
    setAttribute() {}, removeAttribute() {},
    reset() { form.resets++; }, resets: 0,
  };
  const context = {
    window: { setTimeout, clearTimeout, location: { origin: 'http://127.0.0.1:8081', pathname: '/', search: '?hotel=Hotel%20Test&nome=Persona&utm_source=test' } },
    document: { readyState: 'complete', querySelectorAll: () => [form], createElement: element, head: {appendChild(){ context.window.bmgTurnstileReady(); }} },
    FormData: class { constructor(form) { this.form = form; } get(key) { return this.form.fields[key]; } },
    fetch, AbortController, URLSearchParams, Error, TypeError,
  };
  context.window.turnstile = {render(target, options){widgetOptions=options; options.callback('valid-token'); return 'widget';}, reset(){resets++; widgetOptions.callback('fresh-token');}, remove(){}};
  vm.runInNewContext(fs.readFileSync('assets/js/contact-mail.js', 'utf8'), context);
  return { form, status, button, widget: () => widgetOptions, resets: () => resets, send: context.window.BMGContact.send, submit: () => form.submit({preventDefault(){}}) };
}
test('one request per submission, sanitized provenance, reset after SMTP acceptance', async () => {
  let resolve, calls = 0, payload;
  const ui = setup((url, options) => { calls++; assert.equal(url, 'https://bemarketinggroup.it/contact-api/index.php'); payload = JSON.parse(options.body); return new Promise(r => resolve = r); });
  await Promise.resolve();
  const pending = ui.submit();
  assert.equal(ui.button.disabled, true);
  await Promise.resolve();
  await ui.submit();
  assert.equal(calls, 1);
  assert.equal(payload.name, 'Test');
  assert.equal(payload.metadata.hotel, 'Hotel Test');
  assert.equal(payload.metadata.page, 'http://127.0.0.1:8081/');
  resolve({ok: true, status: 200, json: async () => ({ok: true})});
  await pending;
  assert.equal(ui.form.resets, 1);
  assert.match(ui.status.textContent, /Richiesta inviata/);
  assert.equal(ui.button.disabled, false);
});
for (const [label, response] of [
  ['SMTP rejection', {ok:false,status:502,json:async()=>({ok:false})}],
  ['false success body', {ok:true,status:200,json:async()=>({ok:false})}],
  ['HTML response', {ok:true,status:200,json:async()=>{throw new Error('not JSON');}}],
  ['rate limit', {ok:false,status:429,json:async()=>({ok:false})}],
]) test(label+' preserves form values and allows retry', async () => {
  const ui=setup(async()=>response);
  await Promise.resolve();
  await ui.submit();
  assert.equal(ui.form.resets,0);
  assert.equal(ui.button.disabled,false);
  assert.doesNotMatch(ui.status.textContent,/Richiesta inviata/);
  assert.match(ui.status.textContent,/info@bemarketinggroup.it/);
});
test('network failure preserves input', async () => {
  const ui=setup(async()=>{throw new TypeError('network');});
  await Promise.resolve();
  await ui.submit();
  assert.equal(ui.form.resets,0);
  assert.match(ui.status.textContent,/I dati sono ancora/);
});
test('whitespace-only names do not send', async () => {
  const ui=setup(async()=>{throw new Error('must not send');});
  ui.form.fields.name='   ';
  await Promise.resolve();
  await ui.submit();
  assert.match(ui.status.textContent,/Inserisci il tuo nome/);
  assert.equal(ui.form.resets,0);
});

test('missing or expired challenge blocks delivery and preserves fields', async () => {
  let calls = 0;
  const ui = setup(async () => { calls++; });
  await Promise.resolve();
  ui.widget()['expired-callback']();
  await ui.submit();
  assert.equal(calls, 0);
  assert.equal(ui.form.resets, 0);
  assert.equal(ui.resets(), 0);
  assert.match(ui.status.textContent, /verifica antispam/);
});
test('token is attached and refreshed after failed delivery', async () => {
  let token;
  const ui = setup(async (_, options) => { token=JSON.parse(options.body).turnstileToken; return {ok:false,status:502,json:async()=>({ok:false})}; });
  await Promise.resolve();
  await ui.submit();
  assert.equal(token, 'valid-token');
  assert.equal(ui.resets(), 1);
});
