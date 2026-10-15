(() => {
  'use strict';
  const dialog = document.querySelector('[data-case-dialog]');
  const photos = [...document.querySelectorAll('[data-case-photo]')];
  if (!dialog || !photos.length || typeof dialog.showModal !== 'function') return;
  const image = dialog.querySelector('[data-case-full-image]');
  const announcement = dialog.querySelector('[data-case-announcement]');
  const error = dialog.querySelector('[data-case-error]');
  const original = dialog.querySelector('[data-case-original]');
  let index = 0, opener, previousOverflow = '';

  const render = () => {
    const photo = photos[index];
    error.hidden = true;
    image.hidden = false;
    image.alt = photo.querySelector('img').alt;
    image.src = photo.href;
    original.href = photo.href;
    announcement.textContent = image.alt;
  };
  const move = direction => {
    index = (index + direction + photos.length) % photos.length;
    render();
  };
  image.addEventListener('error', () => { image.hidden = true; error.hidden = false; });
  photos.forEach((photo, photoIndex) => photo.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    opener = photo;
    index = photoIndex;
    render();
    previousOverflow = document.body.style.overflow;
    document.querySelectorAll('[data-case-film] video').forEach(video => video.pause());
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }));
  dialog.querySelector('[data-case-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-case-prev]').addEventListener('click', () => move(-1));
  dialog.querySelector('[data-case-next]').addEventListener('click', () => move(1));
  dialog.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
})();
