(() => {
  'use strict';
  const endpoint = 'https://bemarketinggroup.it/contact-api/index.php';
  const fallback = 'Non siamo riusciti a inviare la richiesta. I dati sono ancora nel modulo: riprova oppure scrivi a info@bemarketinggroup.it.';

  const sitekey = '0x4AAAAAAFV6AZ6VHIuBJHeb'; // Public Turnstile site key; never put the secret here.
  const verificationMessage = 'Completa la verifica antispam prima di inviare. Se non compare, ricarica la pagina o scrivi a info@bemarketinggroup.it.';
  let scriptReady;
  function loadTurnstile() {
    if (!scriptReady) scriptReady = new Promise((resolve, reject) => {
      if (!sitekey) { reject(new Error(verificationMessage)); return; }
      const timer = window.setTimeout(() => reject(new Error(verificationMessage)), 15000);
      const script = document.createElement('script');
      window.bmgTurnstileReady = () => { window.clearTimeout(timer); resolve(); };
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=bmgTurnstileReady&render=explicit';
      script.async = true;
      script.onerror = () => { window.clearTimeout(timer); reject(new Error(verificationMessage)); };
      document.head.appendChild(script);
    });
    return scriptReady;
  }
  function protect(container, action) {
    let token = '', widget, disposed = false;
    const notice = document.createElement('p');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.textContent = 'Caricamento verifica antispam…';
    const target = document.createElement('div');
    container.appendChild(target);
    container.appendChild(notice);
    loadTurnstile().then(() => {
      if (disposed) return;
      widget = window.turnstile.render(target, {
        sitekey, action, theme: 'light', size: container.clientWidth < 300 ? 'compact' : 'flexible', language: 'it',
        'response-field': false,
        callback: (value) => { token = value; notice.textContent = ''; },
        'expired-callback': () => { token = ''; notice.textContent = 'Verifica scaduta: attendi la nuova verifica.'; },
        'error-callback': () => { token = ''; notice.textContent = verificationMessage; },
        'timeout-callback': () => { token = ''; notice.textContent = 'Verifica scaduta: riprova nel riquadro antispam.'; },
      });
      notice.textContent = '';
    }).catch(() => { if (!disposed) notice.textContent = verificationMessage; });
    return {
      token() { if (!token) throw new Error(verificationMessage); return token; },
      reset() { token = ''; if (widget !== undefined) window.turnstile.reset(widget); },
      remove() { disposed = true; if (widget !== undefined) window.turnstile.remove(widget); container.replaceChildren(); },
    };
  }

  async function send(payload) {
    if (typeof payload.turnstileToken !== 'string' || !payload.turnstileToken || payload.turnstileToken.length > 2048) {
      throw new Error(verificationMessage);
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        throw new Error(response.status === 429
          ? 'Sono state inviate troppe richieste. Attendi prima di riprovare oppure scrivi a info@bemarketinggroup.it.'
          : result?.error === 'verification_failed' ? 'La verifica antispam è scaduta o non è valida. Completa la nuova verifica e riprova.' : fallback);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Non abbiamo ricevuto la conferma dell’invio. Prima di riprovare, verifica con info@bemarketinggroup.it per evitare richieste duplicate.');
      }
      throw new Error(error instanceof TypeError ? fallback : error.message);
    } finally {
      window.clearTimeout(timeout);
    }
  }
  window.BMGContact = { send, protect };

  function init() {
    document.querySelectorAll('[data-contact-form]').forEach((form) => {
      const status = form.querySelector('[data-form-status]');
      const button = form.querySelector('button[type="submit"]');
      const protection = protect(form.querySelector('[data-turnstile]'), form.dataset.contactForm);
      let pending = false;
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (pending || !form.reportValidity()) return;
        const fields = new FormData(form);
        const payload = {
          name: String(fields.get('name') || '').trim(),
          email: String(fields.get('email') || '').trim(),
          service: String(fields.get('service') || form.dataset.defaultService || 'Primo confronto').trim(),
          message: String(fields.get('message') || '').trim(),
          website: String(fields.get('website') || ''),
          metadata: {
            form: form.dataset.contactForm,
            page: window.location.origin + window.location.pathname,
          },
        };
        if (!payload.name || !payload.message) {
          status.textContent = 'Inserisci il tuo nome e una breve descrizione del progetto.';
          return;
        }
        if (payload.metadata.form === 'bmg_hospitality_landing') {
          payload.metadata.hotel = (new URLSearchParams(window.location.search).get('hotel') || '').trim().slice(0, 90);
        }
        pending = true;
        button.disabled = true;
        form.setAttribute('aria-busy', 'true');
        status.textContent = 'Invio in corso…';
        let verificationUsed = false;
        try {
          payload.turnstileToken = protection.token();
          verificationUsed = true;
          await send(payload);
          form.reset();
          status.textContent = 'Richiesta inviata. Ti risponderemo appena possibile.';
        } catch (error) {
          status.textContent = error.message;
        } finally {
          if (verificationUsed) protection.reset();
          pending = false;
          button.disabled = false;
          form.removeAttribute('aria-busy');
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
