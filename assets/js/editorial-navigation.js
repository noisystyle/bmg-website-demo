(() => {
  'use strict';
  const header = document.querySelector('.site-header');
  const dialog = document.querySelector('[data-mobile-menu]');
  const opener = document.querySelector('[data-menu-open]');
  if (!header || !dialog || !opener || typeof dialog.showModal !== 'function') return;
  const desktop = window.matchMedia('(min-width: 901px)');
  let previousOverflow = '';

  opener.hidden = false;
  header.classList.add('navigation-ready');
  opener.addEventListener('click', () => {
    if (desktop.matches || dialog.open) return;
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    opener.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  });
  dialog.querySelector('[data-menu-close]').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('a').forEach(link => link.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener.setAttribute('aria-expanded', 'false');
  });
  desktop.addEventListener('change', event => {
    if (event.matches && dialog.open) dialog.close();
  });
})();
