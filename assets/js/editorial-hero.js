(() => {
  'use strict';
  const hero = document.querySelector('[data-editorial-hero]');
  if (!hero) return;
  // Keep navigation readable when the photographic opening leaves the header.
  const header = document.querySelector('[data-editorial-header]');
  if (header) {
    let headerFrame;
    const updateHeader = () => {
      // Switch before the bottom controls pass beneath the fixed navigation.
      header.classList.toggle('is-paper', hero.getBoundingClientRect().bottom <= header.offsetHeight + 80);
      headerFrame = undefined;
    };
    const scheduleHeader = () => {
      if (headerFrame === undefined) headerFrame = requestAnimationFrame(updateHeader);
    };
    window.addEventListener('scroll', scheduleHeader, { passive: true });
    window.addEventListener('resize', scheduleHeader, { passive: true });
    window.addEventListener('pageshow', scheduleHeader);
    updateHeader();
  }
  const slides = [...hero.querySelectorAll('[data-hero-slide]')];
  const stage = hero.querySelector('[data-hero-stage]');
  const video = hero.querySelector('[data-hero-video]');
  const controls = hero.querySelector('[data-hero-controls]');
  const previous = hero.querySelector('[data-hero-prev]');
  const next = hero.querySelector('[data-hero-next]');
  const dotsGroup = hero.querySelector('[data-hero-dots]');
  const dots = [...hero.querySelectorAll('[data-hero-dot]')];
  const caption = hero.querySelector('[data-hero-caption]');
  const announcement = hero.querySelector('[data-hero-announcement]');
  const preview = document.querySelector('[data-preview-only]');
  const picker = preview?.querySelector('[data-preview-video]');
  const feedback = preview?.querySelector('[data-preview-video-status]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const blockers = new Set();
  let current = 0, busy = false, paused = reduceMotion.matches, mode = 'photos';
  let timer, objectURL, pointerStart, videoVersion = 0, playRequest = 0;
  const gsap = window.gsap;
  const interval = 7500;

  function paintControls() {
    hero.dataset.mode = mode;
    caption.textContent = mode === 'video' ? 'Be Marketing Group — Film' : slides[current].dataset.title;
    previous.hidden = next.hidden = dotsGroup.hidden = mode === 'video';
    dots.forEach((dot, index) => {
      if (index === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    hero.setAttribute('aria-roledescription', mode === 'video' ? 'video' : 'carosello');
  }

  function syncPlayback() {
    clearTimeout(timer);
    paintControls();
    const shouldPlay = !paused && !blockers.size && !busy;
    const request = ++playRequest;
    if (mode === 'video') {
      if (shouldPlay) {
        video.play().catch(() => {
          if (request !== playRequest || mode !== 'video') return;
          paused = true;
          paintControls();
        });
      } else video.pause();
    } else if (shouldPlay && slides.length > 1) {
      timer = window.setTimeout(() => showSlide(current + 1, 1, false), interval);
    }
  }

  function block(reason, active) {
    if (active) blockers.add(reason);
    else blockers.delete(reason);
    syncPlayback();
  }

  function finishTransition(outgoing) {
    outgoing.hidden = true;
    if (gsap) gsap.set(outgoing, { clearProps: 'transform' });
    busy = false;
    syncPlayback();
  }

  function showSlide(index, direction = 1, manual = true) {
    if (busy || mode !== 'photos') return;
    if (manual) paused = true;
    const target = (index + slides.length) % slides.length;
    if (target === current) { syncPlayback(); return; }
    clearTimeout(timer);
    const outgoing = slides[current];
    const incoming = slides[target];
    current = target;
    busy = true;
    incoming.hidden = false;
    incoming.setAttribute('aria-hidden', 'false');
    outgoing.setAttribute('aria-hidden', 'true');
    paintControls();
    if (manual) announcement.textContent = incoming.dataset.title;
    if (!gsap || reduceMotion.matches) {
      finishTransition(outgoing);
      return;
    }
    gsap.to(outgoing, { xPercent: -100 * direction, duration: 1.15, ease: 'power2.inOut', overwrite: true });
    gsap.fromTo(incoming, { xPercent: 100 * direction }, {
      xPercent: 0, duration: 1.15, ease: 'power2.inOut', overwrite: true,
      onComplete: () => finishTransition(outgoing),
    });
  }

  function restorePhotos(message = '') {
    ++videoVersion;
    ++playRequest;
    video.pause();
    video.hidden = true;
    video.removeAttribute('src');
    video.load();
    if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = undefined; }
    mode = 'photos';
    busy = false;
    paused = reduceMotion.matches;
    blockers.delete('loading-video');
    if (gsap) gsap.killTweensOf(slides);
    slides.forEach((slide, index) => {
      slide.hidden = index !== current;
      slide.setAttribute('aria-hidden', String(index !== current));
      if (gsap) gsap.set(slide, { clearProps: 'transform' });
    });
    if (picker) picker.value = '';
    if (feedback) feedback.textContent = message;
    syncPlayback();
  }

  function useVideo(source, local = false) {
    restorePhotos();
    if (local) objectURL = source;
    const version = ++videoVersion;
    block('loading-video', true);
    if (feedback) feedback.textContent = 'Preparazione del video…';
    video.muted = true;
    video.onloadeddata = () => {
      if (version !== videoVersion) return;
      mode = 'video';
      video.hidden = false;
      slides.forEach(slide => { slide.hidden = true; slide.setAttribute('aria-hidden', 'true'); });
      paused = reduceMotion.matches;
      if (feedback) feedback.textContent = local ? 'Video attivo soltanto in questa anteprima. Nessun file è stato caricato online.' : '';
      block('loading-video', false);
    };
    video.onerror = () => {
      if (version !== videoVersion) return;
      restorePhotos('Questo video non è riproducibile. Prova un MP4 con codec H.264 o un WebM.');
    };
    video.src = source;
    video.load();
  }

  previous.addEventListener('click', () => showSlide(current - 1, -1));
  next.addEventListener('click', () => showSlide(current + 1, 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index, index > current ? 1 : -1)));
  hero.addEventListener('keydown', event => {
    if (mode !== 'photos' || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    showSlide(current + direction, direction);
  });
  // Keep autoplay paused while keyboard users operate the remaining controls.
  hero.addEventListener('focusin', () => { paused = true; syncPlayback(); });
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointerup', event => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    pointerStart = undefined;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      const direction = dx < 0 ? 1 : -1;
      showSlide(current + direction, direction);
    }
  });
  stage.addEventListener('pointercancel', () => { pointerStart = undefined; });
  hero.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') block('hover', true); });
  hero.addEventListener('pointerleave', () => block('hover', false));
  document.addEventListener('visibilitychange', () => block('hidden-document', document.hidden));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => block('offscreen', !entries[0].isIntersecting), { threshold: .1 }).observe(hero);
  }
  reduceMotion.addEventListener('change', () => {
    paused = true;
    if (gsap) {
      gsap.killTweensOf(slides);
      slides.forEach((slide, index) => {
        slide.hidden = mode === 'video' || index !== current;
        gsap.set(slide, { clearProps: 'transform' });
      });
      busy = false;
    }
    syncPlayback();
  });

  // Local authoring controls are never shown on the public domain.
  if (preview && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    preview.hidden = false;
    picker.addEventListener('change', () => {
      const file = picker.files?.[0];
      if (!file) return;
      if (!/^video\//.test(file.type) && !/\.(mp4|webm|mov)$/i.test(file.name)) {
        feedback.textContent = 'Scegli un video MP4, MOV o WebM.';
        return;
      }
      useVideo(URL.createObjectURL(file), true);
    });
    preview.querySelector('[data-preview-photos]').addEventListener('click', () => restorePhotos('Selezione fotografica ripristinata.'));
  }
  controls.hidden = false;
  block('hidden-document', document.hidden);
  const configuredVideo = hero.dataset.videoSrc?.trim();
  if (configuredVideo) useVideo(configuredVideo);
})();
