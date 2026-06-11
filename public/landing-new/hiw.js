(function () {
  'use strict';

  var section = document.querySelector('.hiw');
  if (!section) return;

  var steps = Array.prototype.slice.call(section.querySelectorAll('.hiw-step'));
  var panel = section.querySelector('#hiw-panel');
  if (!steps.length) return;

  var widget = section.querySelector('.hiw__widget');
  // Transparent exports: WebM (VP9 + alpha) for Chrome/Firefox, HEVC (hvc1 + alpha)
  // for Safari. HEVC must be listed first — Safari supports VP9 but not VP9 alpha.
  var STEP_VIDEOS = [
    {
      webm: 'assets/hiw-step-1.webm?v=16',
      hevc: 'assets/hiw-step-1-hevc.mp4?v=20'
    },
    {
      webm: 'assets/hiw-step-2.webm?v=21',
      hevc: 'assets/hiw-step-2-hevc.mp4?v=21'
    },
    {
      webm: 'assets/hiw-step-3.webm?v=15',
      hevc: 'assets/hiw-step-3-hevc.mp4?v=20'
    }
  ];

  var STEP_DURATION = 6000;
  var currentIndex = 0;
  var timerId = null;
  var isVisible = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileQuery = window.matchMedia('(max-width: 768px)');

  var videos = [];
  var useVideo = false;

  function getMobileStepOrder(activeIndex, total) {
    // Circular order: active first, then the following steps wrapping around
    // (e.g. active 3 -> 3, 1, 2) rather than counting back down.
    var order = [];
    var i;
    for (i = 0; i < total; i++) order.push((activeIndex + i) % total);
    return order;
  }

  function updateStepOrder(activeIndex) {
    var sequence = getMobileStepOrder(activeIndex, steps.length);

    steps.forEach(function (step, stepIndex) {
      var item = step.parentElement;
      if (!item) return;

      if (mobileQuery.matches) {
        item.style.setProperty('--step-order', sequence.indexOf(stepIndex));
      } else {
        item.style.removeProperty('--step-order');
      }
    });
  }

  mobileQuery.addEventListener('change', function () {
    updateStepOrder(currentIndex);
  });

  function clearTimer() {
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  }

  function scheduleAdvance(delay) {
    clearTimer();
    if (!isVisible || reducedMotion) return;
    timerId = window.setTimeout(function () {
      timerId = null;
      goToStep((currentIndex + 1) % steps.length);
    }, delay);
  }

  function fallBackToTimer() {
    if (useVideo) useVideo = false;
    scheduleAdvance(STEP_DURATION);
  }

  function appendTransparentSources(video, step) {
    // Route by ENGINE, not canPlayType. Safari/iOS (WebKit) support HEVC alpha
    // but NOT VP9 alpha — yet modern Safari can DECODE VP9, so canPlayType
    // reports it "can play" WebM. Trusting that handed Safari the WebM, which it
    // renders opaque (black) since it ignores the alpha. Chrome/Firefox/Edge
    // (Blink/Gecko) support VP9 alpha but can't render HEVC alpha. So: WebKit
    // gets HEVC, everyone else gets WebM.
    var ua = navigator.userAgent;
    var isWebKit =
      /AppleWebKit/.test(ua) &&
      !/Chrome|Chromium|Android|Edg|OPR|SamsungBrowser/.test(ua);
    var source = document.createElement('source');
    if (isWebKit) {
      source.src = step.hevc;
      source.type = 'video/mp4; codecs="hvc1"';
      // Safari composites HEVC alpha reliably only when fully preloaded.
      video.preload = 'auto';
    } else {
      source.src = step.webm;
      source.type = 'video/webm; codecs="vp9"';
    }
    video.appendChild(source);
  }

  function pauseVideos() {
    videos.forEach(function (v) {
      v.pause();
    });
  }

  function showActiveVideo() {
    if (!useVideo) return;
    videos.forEach(function (v, i) {
      if (i === currentIndex) {
        v.classList.add('hiw__widget-video--active');
      } else {
        v.classList.remove('hiw__widget-video--active');
        v.pause();
      }
    });
  }

  function playActiveVideo() {
    if (!useVideo || !isVisible || reducedMotion) return;
    var v = videos[currentIndex];
    if (!v) return;
    try { v.currentTime = 0; } catch (e) {}
    var p = v.play();
    if (p && typeof p.catch === 'function') {
      p.catch(fallBackToTimer);
    }
  }

  function setActiveStep(index) {
    currentIndex = index;

    steps.forEach(function (step, i) {
      var active = i === index;
      step.classList.toggle('hiw-step--active', active);
      step.setAttribute('aria-selected', active ? 'true' : 'false');
      step.setAttribute('tabindex', active ? '0' : '-1');
    });

    if (panel) {
      panel.setAttribute('aria-labelledby', steps[index].id);
    }

    updateStepOrder(index);
    showActiveVideo();
  }

  function goToStep(index) {
    if (index < 0 || index >= steps.length) return;
    clearTimer();
    setActiveStep(index);
    if (useVideo) {
      playActiveVideo();
    } else {
      scheduleAdvance(STEP_DURATION);
    }
  }

  if (widget) {
    widget.innerHTML = '';
    STEP_VIDEOS.forEach(function (step, i) {
      var v = document.createElement('video');
      v.className = 'hiw__widget-video' + (i === 0 ? ' hiw__widget-video--active' : '');
      v.muted = true;
      v.defaultMuted = true;
      v.loop = false;
      v.preload = 'metadata';
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.playsInline = true;
      v.setAttribute('aria-hidden', 'true');
      appendTransparentSources(v, step);

      v.addEventListener('ended', function () {
        if (reducedMotion) return;
        if (i === currentIndex) goToStep((currentIndex + 1) % steps.length);
      });
      v.addEventListener('error', fallBackToTimer);

      widget.appendChild(v);
      videos.push(v);
    });
    useVideo = videos.length === steps.length;
  }

  steps.forEach(function (step, index) {
    step.addEventListener('click', function () {
      goToStep(index);
    });

    step.addEventListener('keydown', function (event) {
      var nextIndex = currentIndex;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % steps.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + steps.length) % steps.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = steps.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      goToStep(nextIndex);
      steps[nextIndex].focus();
    });
  });

  if ('IntersectionObserver' in window) {
    var trigger = section.querySelector('.hiw__product-wrap') || section;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var wasVisible = isVisible;
        isVisible = entry.isIntersecting;

        if (isVisible && !wasVisible) {
          goToStep(0);
        }

        if (!isVisible && wasVisible) {
          clearTimer();
          if (useVideo) pauseVideos();
        }
      });
    }, { threshold: 0.55 });

    observer.observe(trigger);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimer();
      if (useVideo) pauseVideos();
    } else if (isVisible && !reducedMotion) {
      if (useVideo) {
        playActiveVideo();
      } else if (!timerId) {
        goToStep(currentIndex);
      }
    }
  });

  if (reducedMotion) {
    setActiveStep(0);
    return;
  }

  goToStep(0);
})();
