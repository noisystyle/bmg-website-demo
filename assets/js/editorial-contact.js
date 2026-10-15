/* Editorial preview form. Uses the existing SMTP / Turnstile client. */
(() => {
  'use strict';
  const form = document.querySelector('[data-editorial-contact]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('button[type="submit"]');
  const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (localPreview) {
    form.querySelector('[data-form-preview]').hidden = false;
    button.textContent = 'Verifica modulo';
  }
  const api = window.BMGContact;
  if (!api && !localPreview) {
    status.textContent = 'Il modulo non è disponibile. Scrivi a info@bemarketinggroup.it.';
    button.disabled = true;
    return;
  }
  let protection, pending = false;
  const protect = () => protection ||= api.protect(form.querySelector('[data-turnstile]'), 'bmg_contact');
  // Load the verification only when the visitor approaches the contact form.
  if (!localPreview && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        protect();
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(form);
  } else if (!localPreview) protect();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const fields = new FormData(form);
    const value = name => String(fields.get(name) || '').trim();
    const name = value('name'), message = value('message');
    if (!name || !message) {
      status.textContent = 'Inserisci il tuo nome e una breve descrizione del progetto.';
      status.focus();
      return;
    }
    if (localPreview) {
      status.textContent = 'I campi sono validi. Questa anteprima non invia email; i dati restano nel modulo.';
      status.focus();
      return;
    }
    const context = [
      value('company') && `Struttura / azienda: ${value('company')}`,
      value('company_url') && `Sito della struttura: ${value('company_url')}`,
    ].filter(Boolean);
    const payload = {
      name,
      email: value('email'),
      service: value('service'),
      message: [...context, ...(context.length ? [''] : []), message].join('\n'),
      website: value('website'),
      metadata: { form: 'bmg_contact', page: location.origin + location.pathname },
    };
    pending = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Invio in corso…';
    let verificationUsed = false;
    try {
      payload.turnstileToken = protect().token();
      verificationUsed = true;
      await api.send(payload);
      form.reset();
      status.textContent = 'Grazie, la richiesta è stata inviata. Ti risponderemo via email.';
    } catch (error) {
      status.textContent = error.message || 'Invio non riuscito. I dati sono ancora nel modulo. Puoi scrivere a info@bemarketinggroup.it.';
    } finally {
      if (verificationUsed) protection.reset();
      pending = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
      status.focus();
    }
  });
})();
