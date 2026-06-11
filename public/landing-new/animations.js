(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('has-enhanced-animations');

  if (reducedMotion) {
    document.querySelectorAll('[data-reveal], [data-reveal-stagger]').forEach(function (el) {
      el.classList.add('is-revealed');
    });
    return;
  }

  /* ---- Scroll reveal ---- */
  var revealTargets = document.querySelectorAll('[data-reveal], [data-reveal-stagger]');

  function revealElement(el) {
    el.classList.add('is-revealed');
  }

  function revealIfNearViewport(el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 100 && rect.bottom > -100) {
      revealElement(el);
      return true;
    }
    return false;
  }

  revealTargets.forEach(function (el) {
    if (!revealIfNearViewport(el) && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            revealElement(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      observer.observe(el);
    } else if (!el.classList.contains('is-revealed')) {
      revealElement(el);
    }
  });

  /* Chains strip sits directly below hero — reveal immediately */
  var chains = document.querySelector('.chains-strip[data-reveal-stagger]');
  if (chains) revealElement(chains);

  /* ---- Hero parallax ---- */
  var hero = document.querySelector('.hero[data-hero-animate]');
  var heroBg = hero && hero.querySelector('.hero__gradient-wrap');
  var parallaxTicking = false;

  function updateHeroParallax() {
    parallaxTicking = false;
    if (!hero || !heroBg) return;
    var rect = hero.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    var progress = Math.max(0, Math.min(1, -rect.top / rect.height));
    heroBg.style.transform = 'translateY(' + (progress * 48) + 'px) scale(' + (1 + progress * 0.04) + ')';
  }

  function onScroll() {
    if (heroBg && !parallaxTicking) {
      parallaxTicking = true;
      requestAnimationFrame(updateHeroParallax);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateHeroParallax();
})();
