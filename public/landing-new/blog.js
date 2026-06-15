(function () {
  'use strict';

  var root = document.getElementById('blog');
  var canvas = document.getElementById('blog-squeezy-canvas');
  if (!root || !canvas) return;

  var items = JSON.parse(root.getAttribute('data-items') || '[]');
  if (!items.length) return;

  var metaContainer = document.getElementById('blog-meta-container');
  var metaSlides = [];
  var liveRegion = document.getElementById('blog-carousel-live');
  var carouselWrap = document.getElementById('blog-squeezy');
  var scroller = document.getElementById('blog-scroller');
  var dotsContainer = document.getElementById('blog-dots');

  var activeIndex = 0;
  var squeezy = null;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktopQuery = window.matchMedia('(min-width: 769px)');
  var resizeTimer = 0;
  var metaDuration = reducedMotion ? '200ms' : '1000ms';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildMetaSlides() {
    if (!metaContainer) return;

    var slidesHtml = items
      .map(function (item, index) {
        var title = escapeHtml(item.title || '');
        var href = escapeHtml(item.href || '#');
        var cta = escapeHtml(item.cta || 'Read more');
        var hidden = index === 0 ? 'false' : 'true';
        var tabindex = index === 0 ? '0' : '-1';

        return (
          '<div class="squeezy-carousel__item-details" id="blog-meta-slide-' +
          index +
          '" role="tabpanel" aria-hidden="' +
          hidden +
          '" style="transition-duration:' +
          metaDuration +
          '">' +
          '<div class="squeezy-carousel__item-copy">' +
          '<h3 class="blog__meta-title">' +
          title +
          '</h3>' +
          '</div>' +
          '<a href="' +
          href +
          '" class="blog__read" target="_blank" rel="noopener noreferrer" tabindex="' +
          tabindex +
          '">' +
          cta +
          '</a>' +
          '</div>'
        );
      })
      .join('');

    var chevronPrev =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
    var chevronNext =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';

    metaContainer.innerHTML =
      '<div class="squeezy-carousel__meta-track">' +
      slidesHtml +
      '</div>' +
      '<div class="blog__nav">' +
      '<button type="button" class="blog__nav-btn" id="blog-nav-prev" aria-label="Previous post">' +
      chevronPrev +
      '</button>' +
      '<button type="button" class="blog__nav-btn" id="blog-nav-next" aria-label="Next post">' +
      chevronNext +
      '</button>' +
      '</div>';

    metaSlides = Array.prototype.slice.call(
      metaContainer.querySelectorAll('.squeezy-carousel__item-details')
    );

    var navPrev = metaContainer.querySelector('#blog-nav-prev');
    var navNext = metaContainer.querySelector('#blog-nav-next');
    if (navPrev) navPrev.addEventListener('click', function () { gotoRelative(-1); });
    if (navNext) navNext.addEventListener('click', function () { gotoRelative(1); });
  }

  function setMetaIndex(index) {
    metaSlides.forEach(function (slide, i) {
      var isActive = i === index;
      slide.style.transform = 'translateX(' + -100 * i + '%)';
      slide.style.opacity = isActive ? '1' : '0';
      slide.style.pointerEvents = isActive ? 'auto' : 'none';
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');

      var link = slide.querySelector('.blog__read');
      if (link) link.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    if (liveRegion && items[index]) {
      liveRegion.textContent =
        'Item ' +
        (index + 1) +
        ' of ' +
        items.length +
        ': ' +
        items[index].title;
    }
  }

  function onNextColumnClick(columns) {
    if (!squeezy) return;
    squeezy.gotoNext(columns);
    activeIndex = (activeIndex + columns) % items.length;
    setMetaIndex(activeIndex);
  }

  function gotoRelative(steps) {
    if (!squeezy || steps === 0) return;

    if (steps > 0) {
      squeezy.gotoNext(steps);
      activeIndex = (activeIndex + steps) % items.length;
    } else {
      squeezy.gotoPrev(-steps);
      activeIndex = (activeIndex + steps + items.length) % items.length;
    }

    setMetaIndex(activeIndex);
  }

  function selectIndex(index) {
    if (index === activeIndex || index < 0 || index >= items.length) return;

    var delta = index - activeIndex;

    if (delta > 0) {
      squeezy.gotoNext(delta);
    } else {
      squeezy.gotoPrev(-delta);
    }

    activeIndex = index;
    setMetaIndex(activeIndex);
  }

  function buildScroller() {
    if (!scroller) return;

    scroller.innerHTML = items
      .map(function (item) {
        var title = escapeHtml(item.title || '');
        var href = escapeHtml(item.href || '#');
        var img = escapeHtml(item.imgSrc || '');
        var cta = escapeHtml(item.cta || 'Read more');

        return (
          '<li class="blog-card">' +
          '<a class="blog-card__link" href="' +
          href +
          '" target="_blank" rel="noopener noreferrer">' +
          '<span class="blog-card__media"><img src="' +
          img +
          '" alt="" loading="lazy"></span>' +
          '<span class="blog-card__title">' +
          title +
          '</span>' +
          '<span class="blog-card__read">' +
          cta +
          '</span>' +
          '</a>' +
          '</li>'
        );
      })
      .join('');
  }

  function buildDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = items
      .map(function (item, index) {
        return (
          '<button type="button" class="blog__dot' +
          (index === 0 ? ' blog__dot--active' : '') +
          '" data-index="' +
          index +
          '" aria-label="Go to post ' +
          (index + 1) +
          '"></button>'
        );
      })
      .join('');

    Array.prototype.forEach.call(
      dotsContainer.querySelectorAll('.blog__dot'),
      function (dot) {
        dot.addEventListener('click', function () {
          var i = parseInt(dot.getAttribute('data-index'), 10);
          var cards = scroller.querySelectorAll('.blog-card');
          var card = cards[i];
          if (!card) return;
          var padLeft = parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
          scroller.scrollTo({ left: card.offsetLeft - padLeft, behavior: 'smooth' });
        });
      }
    );
  }

  function updateActiveDot() {
    if (!dotsContainer || !scroller) return;
    var cards = scroller.querySelectorAll('.blog-card');
    if (!cards.length) return;
    var padLeft = parseFloat(getComputedStyle(scroller).scrollPaddingLeft) || 0;
    var ref = scroller.scrollLeft + padLeft;
    var best = 0;
    var bestDist = Infinity;
    for (var i = 0; i < cards.length; i++) {
      var d = Math.abs(cards[i].offsetLeft - ref);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    Array.prototype.forEach.call(
      dotsContainer.querySelectorAll('.blog__dot'),
      function (dot, i) {
        dot.classList.toggle('blog__dot--active', i === best);
      }
    );
  }

  function initSqueezy() {
    if (squeezy || !desktopQuery.matches) return;

    squeezy = new SqueezyImagesCanvas({
      canvasElement: canvas,
      items: items,
      onNextColumnClick: onNextColumnClick,
      prefersReducedMotion: reducedMotion,
    });

    squeezy.loadCanvasImages();
  }

  function destroySqueezy() {
    if (!squeezy) return;
    squeezy.dispose();
    squeezy = null;
  }

  function scheduleResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      squeezy && squeezy.onCanvasResize();
    }, 150);
  }

  buildMetaSlides();
  setMetaIndex(0);
  buildScroller();
  buildDots();

  if (scroller && dotsContainer) {
    scroller.addEventListener('scroll', updateActiveDot, { passive: true });
  }

  var hasBeenVisible = false;

  desktopQuery.addEventListener('change', function () {
    if (desktopQuery.matches) {
      if (hasBeenVisible) initSqueezy();
    } else {
      destroySqueezy();
    }
  });

  metaSlides.forEach(function (slide, index) {
    var link = slide.querySelector('.blog__read');
    if (!link) return;

    link.addEventListener('focus', function () {
      selectIndex(index);
    });

    link.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        gotoRelative(-1);
        var activeLink = metaSlides[activeIndex] && metaSlides[activeIndex].querySelector('.blog__read');
        if (activeLink) activeLink.focus();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        gotoRelative(1);
        var activeLink = metaSlides[activeIndex] && metaSlides[activeIndex].querySelector('.blog__read');
        if (activeLink) activeLink.focus();
      }
    });
  });

  if ('ResizeObserver' in window && carouselWrap) {
    var observer = new ResizeObserver(scheduleResize);
    observer.observe(carouselWrap);
  } else {
    window.addEventListener('resize', scheduleResize);
  }

  if ('IntersectionObserver' in window) {
    var visibility = new IntersectionObserver(
      function (entries) {
        if (entries[0] && entries[0].isIntersecting) {
          hasBeenVisible = true;
          initSqueezy();
          visibility.disconnect();
        }
      },
      { rootMargin: '3000px 0px 3000px 0px', threshold: 0 }
    );
    visibility.observe(root);
  } else {
    hasBeenVisible = true;
    initSqueezy();
  }
})();
