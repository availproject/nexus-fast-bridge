(function () {
  'use strict';

  /* Chains marquee — exact scroll width */
  var track = document.querySelector('.chains-strip__track');
  if (track) {
    var logos = track.querySelectorAll('.chains-strip__logo');
    var half = logos.length / 2;
    var width = 0;
    var gap = parseFloat(getComputedStyle(track).gap) || 50;
    for (var i = 0; i < half; i++) {
      width += logos[i].offsetWidth;
    }
    width += (half - 1) * gap;
    track.style.setProperty('--scroll-width', '-' + width + 'px');
  }

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-item__question');
    var answer = item.querySelector('.faq-item__answer');
    if (!btn || !answer) return;
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('faq-item--open');
      document.querySelectorAll('.faq-item').forEach(function (el) {
        el.classList.remove('faq-item--open');
        var q = el.querySelector('.faq-item__question');
        var a = el.querySelector('.faq-item__answer');
        if (q) q.setAttribute('aria-expanded', 'false');
        if (a) a.hidden = true;
      });
      if (!isOpen) {
        item.classList.add('faq-item--open');
        btn.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
      }
    });
  });

  /* Scroll reveal — skip when enhanced animations handle it */
  if (document.documentElement.classList.contains('has-enhanced-animations')) {
    return;
  }

  /* Scroll reveal — show sections already in view on load */
  var reveal = document.querySelectorAll('.chains-strip, .blog, .faq, .site-footer');

  function markVisible(el) {
    el.classList.add('is-visible');
  }

  function revealIfInView(el, margin) {
    var buffer = margin == null ? 120 : margin;
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + buffer && rect.bottom > -buffer) {
      markVisible(el);
      return true;
    }
    return false;
  }

  /* Chains sits directly under hero — show immediately */
  var chains = document.querySelector('.chains-strip');
  if (chains) markVisible(chains);

  reveal.forEach(function (el) {
    revealIfInView(el, 200);
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          markVisible(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 80px 0px' });
    reveal.forEach(function (el) {
      if (!el.classList.contains('is-visible')) {
        observer.observe(el);
      }
    });
  } else {
    reveal.forEach(markVisible);
  }
})();
