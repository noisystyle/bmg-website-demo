(() => {
  'use strict';

  const banners = [...document.querySelectorAll('.editorial-home [data-scroll-reveal]')];
  const { gsap, ScrollTrigger } = window;
  // The complete, static composition is the fallback if either library is unavailable.
  if (!banners.length || !gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();

  media.add({
    desktop: '(min-width: 701px)',
    mobile: '(max-width: 700px)',
    reduceMotion: '(prefers-reduced-motion: reduce)',
  }, (context) => {
    if (context.conditions.reduceMotion) return;
    const travel = context.conditions.desktop ? 14 : 8;

    banners.forEach((banner) => {
      const photograph = banner.querySelector('.visual-banner-image');
      if (!photograph) return;
      banner.classList.add('is-scroll-reveal');

      // Move only the photograph. The frame, copy and native scroll stay in place.
      gsap.fromTo(photograph, { yPercent: -travel }, {
        yPercent: travel,
        ease: 'none',
        scrollTrigger: {
          trigger: banner,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
          invalidateOnRefresh: true,
          onToggle: ({ isActive }) => {
            photograph.style.willChange = isActive ? 'transform' : 'auto';
          },
        },
      });
    });

    // matchMedia reverts the animations when the breakpoint or preference changes.
    return () => banners.forEach((banner) => {
      banner.classList.remove('is-scroll-reveal');
      banner.querySelector('.visual-banner-image')?.style.removeProperty('will-change');
    });
  });

  document.querySelectorAll('.service-chapter').forEach(chapter => {
    chapter.addEventListener('toggle', () => ScrollTrigger.refresh());
  });

  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('pageshow', () => ScrollTrigger.refresh());
})();
