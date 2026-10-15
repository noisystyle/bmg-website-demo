(() => {
  'use strict';
  const films = [...document.querySelectorAll('[data-case-film]')];
  const videos = films.map(film => film.querySelector('video'));

  films.forEach(film => {
    const video = film.querySelector('video');
    const play = film.querySelector('[data-film-play]');
    const error = film.querySelector('[data-film-error]');
    if (!video || !play || !error) return;

    // Native controls remain available if JavaScript is disabled.
    video.controls = false;
    play.hidden = false;
    const showError = () => {
      play.hidden = true;
      video.controls = true;
      error.hidden = false;
    };

    play.addEventListener('click', async () => {
      error.hidden = true;
      play.hidden = true;
      video.controls = true;
      video.tabIndex = 0;
      video.focus({ preventScroll: true });
      try {
        await video.play();
      } catch (failure) {
        if (failure.name !== 'AbortError') showError();
      }
    });
    video.addEventListener('play', () => {
      videos.forEach(other => { if (other !== video) other?.pause(); });
    });
    video.addEventListener('ended', () => {
      const restoreFocus = document.activeElement === video;
      video.controls = false;
      video.removeAttribute('tabindex');
      play.hidden = false;
      if (restoreFocus) play.focus({ preventScroll: true });
    });
    video.addEventListener('error', showError);
    video.querySelectorAll('source').forEach(source => source.addEventListener('error', showError));
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach(video => video?.pause());
  });
})();
