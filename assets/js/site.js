(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  let previousY = window.scrollY;
  let ticking = false;

  const updateHeaderContrast = () => {
    if (!header) return;
    const sampleY = Math.min(70, window.innerHeight - 1);
    const surface = document.elementsFromPoint(window.innerWidth / 2, sampleY)
      .map((element) => element.closest?.("[data-header-contrast]"))
      .find(Boolean);
    header.classList.toggle("is-on-light", surface?.dataset.headerContrast === "dark");
  };

  const updateHeader = () => {
    const currentY = window.scrollY;
    const goingDown = currentY > previousY + 6;
    const goingUp = currentY < previousY - 6;

    if (header) {
      if (goingDown && currentY > 120) header.classList.add("is-hidden");
      if (goingUp || currentY < 80) header.classList.remove("is-hidden");
      updateHeaderContrast();
    }

    previousY = Math.max(currentY, 0);
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener("resize", updateHeaderContrast);
  updateHeaderContrast();

  const rotatingWord = document.querySelector("[data-rotating-word]");
  const words = ["scelto.", "raccontato.", "ricordato."];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let pageScrollTween = null;
  const scrollToSection = (target) => {
    const scrollMargin = parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
    const destination = Math.max(0, target.getBoundingClientRect().top + window.scrollY - scrollMargin);

    if (reduceMotion || !window.gsap) {
      window.scrollTo({ top: destination, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }

    pageScrollTween?.kill();
    const position = { y: window.scrollY };
    const distance = Math.abs(destination - position.y);
    pageScrollTween = window.gsap.to(position, {
      y: destination,
      duration: Math.min(1.15, Math.max(.65, distance / 1600)),
      ease: "power3.inOut",
      onUpdate: () => window.scrollTo(0, position.y),
      onComplete: () => { pageScrollTween = null; },
    });
  };

  document.querySelectorAll('a[href^="#"]:not([href="#"]):not(.skip-link)').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const hash = link.getAttribute("href");
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;

      event.preventDefault();
      scrollToSection(target);
      if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    });
  });

  const cancelPageScroll = () => {
    pageScrollTween?.kill();
    pageScrollTween = null;
  };
  window.addEventListener("wheel", cancelPageScroll, { passive: true });
  window.addEventListener("touchstart", cancelPageScroll, { passive: true });

  if (rotatingWord && !reduceMotion) {
    let index = 0;
    window.setInterval(() => {
      rotatingWord.classList.add("is-changing");
      window.setTimeout(() => {
        index = (index + 1) % words.length;
        rotatingWord.textContent = words[index];
        rotatingWord.classList.remove("is-changing");
      }, 260);
    }, 2800);
  }

  const projectGrid = document.querySelector(".project-grid");
  const projectCards = Array.from(document.querySelectorAll(".project-card"));
  const projectCurrent = document.querySelector("[data-project-current]");
  const projectScrollStatus = document.querySelector(".project-scroll-status");

  if (projectGrid && projectCards.length && window.gsap && window.ScrollTrigger && !reduceMotion) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    const desktopProjects = window.gsap.matchMedia();

    desktopProjects.add("(min-width: 901px)", () => {
      projectCards.forEach((card, index) => {
        card.style.zIndex = String(index + 1);
        card.dataset.headerContrast = "light";

        const image = card.querySelector("picture img");
        const meta = card.querySelector(".project-meta");
        const overlay = card.querySelector(".project-overlay");

        window.ScrollTrigger.create({
          trigger: card,
          start: "top center",
          end: "bottom center",
          onEnter: () => { if (projectCurrent) projectCurrent.textContent = String(index + 1).padStart(2, "0"); },
          onEnterBack: () => { if (projectCurrent) projectCurrent.textContent = String(index + 1).padStart(2, "0"); },
        });

        if (image) {
          window.gsap.fromTo(image, { scale: 1.065 }, {
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top bottom", end: "top top", scrub: true },
          });
        }

        if (meta) {
          window.gsap.fromTo(meta, { y: 34, opacity: .45 }, {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top 82%", end: "top 42%", scrub: true },
          });
        }

        if (overlay) {
          window.gsap.fromTo(overlay, { opacity: .55 }, {
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top 92%", end: "top 12%", scrub: true },
          });
        }
      });

      window.ScrollTrigger.create({
        trigger: projectGrid,
        start: "top 92%",
        end: "bottom bottom",
        onEnter: () => projectScrollStatus?.classList.add("is-active"),
        onEnterBack: () => projectScrollStatus?.classList.add("is-active"),
        onLeave: () => projectScrollStatus?.classList.remove("is-active"),
        onLeaveBack: () => projectScrollStatus?.classList.remove("is-active"),
      });

      window.ScrollTrigger.create({
        trigger: projectGrid,
        start: "top top",
        end: "bottom bottom",
        snap: {
          snapTo: 1 / Math.max(1, projectCards.length - 1),
          duration: { min: .18, max: .52 },
          delay: .08,
          ease: "power2.inOut",
        },
      });

      window.ScrollTrigger.refresh();

      return () => {
        projectScrollStatus?.classList.remove("is-active");
        projectCards.forEach((card) => {
          card.style.removeProperty("z-index");
          delete card.dataset.headerContrast;
        });
      };
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8%" });

    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add("is-visible"));
  }

  const showcaseTrack = document.querySelector("[data-showcase-track]");
  const showcaseItems = Array.from(document.querySelectorAll("[data-showcase-full]"));
  const showcaseProgress = document.querySelector("[data-showcase-progress]");
  const showcasePrevious = document.querySelector("[data-showcase-prev]");
  const showcaseNext = document.querySelector("[data-showcase-next]");
  const showcaseLightbox = document.querySelector("[data-showcase-lightbox]");

  if (showcaseTrack && showcaseItems.length) {
    const updateShowcase = () => {
      const maximum = showcaseTrack.scrollWidth - showcaseTrack.clientWidth;
      const visibleShare = Math.min(1, showcaseTrack.clientWidth / showcaseTrack.scrollWidth);
      const position = maximum > 0 ? showcaseTrack.scrollLeft / maximum : 1;
      if (showcaseProgress) showcaseProgress.style.width = `${Math.max(visibleShare, position * (1 - visibleShare) + visibleShare) * 100}%`;
      if (showcasePrevious) showcasePrevious.disabled = showcaseTrack.scrollLeft < 4;
      if (showcaseNext) showcaseNext.disabled = showcaseTrack.scrollLeft > maximum - 4;
    };

    const moveShowcase = (direction) => {
      const firstCard = showcaseItems[0];
      const gap = parseFloat(getComputedStyle(showcaseTrack).gap) || 0;
      showcaseTrack.scrollBy({ left: direction * (firstCard.getBoundingClientRect().width + gap), behavior: "smooth" });
    };

    showcasePrevious?.addEventListener("click", () => moveShowcase(-1));
    showcaseNext?.addEventListener("click", () => moveShowcase(1));
    showcaseTrack.addEventListener("scroll", updateShowcase, { passive: true });
    window.addEventListener("resize", updateShowcase);
    updateShowcase();
  }

  if (showcaseLightbox && showcaseItems.length) {
    const lightboxImage = showcaseLightbox.querySelector("[data-showcase-image]");
    const lightboxCaption = showcaseLightbox.querySelector("[data-showcase-caption]");
    const lightboxCounter = showcaseLightbox.querySelector("[data-showcase-counter]");
    const lightboxStage = showcaseLightbox.querySelector("[data-showcase-stage]");
    const closeButton = showcaseLightbox.querySelector("[data-showcase-close]");
    let lightboxIndex = 0;
    let touchStartX = 0;
    let closing = false;

    const updateLightbox = (index, animate = true) => {
      lightboxIndex = (index + showcaseItems.length) % showcaseItems.length;
      const item = showcaseItems[lightboxIndex];
      if (animate) lightboxImage.classList.add("is-changing");
      window.setTimeout(() => {
        lightboxImage.src = item.dataset.showcaseFull;
        lightboxImage.alt = item.querySelector("img")?.alt || "Fotografia del progetto";
        lightboxCaption.textContent = item.dataset.showcaseCaption || "";
        lightboxCounter.textContent = `${String(lightboxIndex + 1).padStart(2, "0")} / ${String(showcaseItems.length).padStart(2, "0")}`;
        lightboxImage.classList.remove("is-changing");
      }, animate ? 140 : 0);
    };

    const openLightbox = (index) => {
      updateLightbox(index, false);
      showcaseLightbox.showModal();
      document.body.classList.add("showcase-lightbox-open");
      if (!reduceMotion) lightboxStage.animate([{ transform: "translateY(70px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 560, easing: "cubic-bezier(.22,1,.36,1)" });
      closeButton?.focus();
    };

    const closeLightbox = () => {
      if (!showcaseLightbox.open || closing) return;
      closing = true;
      const finish = () => {
        showcaseLightbox.close();
        document.body.classList.remove("showcase-lightbox-open");
        closing = false;
        showcaseItems[lightboxIndex].focus();
      };
      if (reduceMotion) return finish();
      lightboxStage.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(70px)", opacity: 0 }], { duration: 300, easing: "ease-in", fill: "forwards" }).finished.finally(finish);
    };

    showcaseItems.forEach((item, index) => item.addEventListener("click", () => openLightbox(index)));
    closeButton?.addEventListener("click", closeLightbox);
    showcaseLightbox.querySelector("[data-showcase-lightbox-prev]")?.addEventListener("click", () => updateLightbox(lightboxIndex - 1));
    showcaseLightbox.querySelector("[data-showcase-lightbox-next]")?.addEventListener("click", () => updateLightbox(lightboxIndex + 1));
    showcaseLightbox.addEventListener("click", (event) => { if (event.target === showcaseLightbox) closeLightbox(); });
    showcaseLightbox.addEventListener("cancel", (event) => { event.preventDefault(); closeLightbox(); });
    showcaseLightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") updateLightbox(lightboxIndex - 1);
      if (event.key === "ArrowRight") updateLightbox(lightboxIndex + 1);
    });
    lightboxStage?.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    lightboxStage?.addEventListener("touchend", (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) > 45) updateLightbox(lightboxIndex + (distance < 0 ? 1 : -1));
    }, { passive: true });
  }

})();
