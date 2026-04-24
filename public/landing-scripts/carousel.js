(() => {
  const slides = [
    {
      bg: "/landing-assets/hero-bg.avif",
      chain: "MegaETH",
      slug: "megaeth",
      chainIcon: "/landing-assets/megaeth-icon.svg",
      token: "USDM",
      tokenIcon: "/landing-assets/musd-icon-outer.svg",
      tokenInner: "/landing-assets/musd-icon-inner.svg",
      hasCompositeIcon: true,
    },
    {
      bg: "/landing-assets/Hero-bg_citrea.avif",
      chain: "Citrea Mainnet",
      slug: "citrea",
      chainIcon: "/landing-assets/citrea-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_monad.avif",
      chain: "Monad",
      slug: "monad",
      chainIcon: "/landing-assets/monad-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_optimisim.avif",
      chain: "Optimism",
      slug: "op-mainnet",
      chainIcon: "/landing-assets/op-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_polygon.avif",
      chain: "Polygon",
      slug: "polygon",
      chainIcon: "/landing-assets/polygon-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_arbitrum.avif",
      chain: "Arbitrum",
      slug: "arbitrum",
      chainIcon: "/landing-assets/arb-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_avalanche.avif",
      chain: "Avalanche",
      slug: "avalanche",
      chainIcon: "/landing-assets/avax-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_ethereum.avif",
      chain: "Ethereum",
      slug: "ethereum",
      chainIcon: "/landing-assets/eth-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_hyperliquid.avif",
      chain: "Hyperliquid",
      slug: "hyperevm",
      chainIcon: "/landing-assets/hyperliquid-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_base.avif",
      chain: "Base",
      slug: "base",
      chainIcon: "/landing-assets/base-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_bnb.avif",
      chain: "BNB Chain",
      slug: "bnb-smart-chain",
      chainIcon: "/landing-assets/bnb-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_kaia.avif",
      chain: "Kaia",
      slug: "kaia",
      chainIcon: "/landing-assets/kaia-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
    {
      bg: "/landing-assets/Hero-bg_scroll.avif",
      chain: "Scroll",
      slug: "scroll",
      chainIcon: "/landing-assets/scroll-icon.png",
      token: "USDC",
      tokenIcon: "/landing-assets/usdc-icon.png",
      hasCompositeIcon: false,
    },
  ];

  const heroBg = document.querySelector(".hero-bg");
  const currentImg = document.querySelector(".hero-bg-img");
  const dots = document.querySelectorAll(".dot");
  const chainField = document.querySelectorAll(".bridge-field")[0];
  const tokenField = document.querySelectorAll(".bridge-field")[1];
  let currentSlide = 0;
  let transitioning = false;

  // Preload and cache images by attaching them invisibly to the DOM
  // This prevents aggressive garbage collection of unbound Image objects on mobile WebKit
  const preloadCache = document.createElement("div");
  preloadCache.style.position = "absolute";
  preloadCache.style.width = "0px";
  preloadCache.style.height = "0px";
  preloadCache.style.overflow = "hidden";
  preloadCache.style.opacity = "0";
  preloadCache.style.pointerEvents = "none";
  document.body.appendChild(preloadCache);

  const attachPreload = (src) => {
    if (!src) {
      return;
    }
    const img = document.createElement("img");
    img.src = src;
    img.decoding = "sync"; // Hint browser to decode immediately
    preloadCache.appendChild(img);
  };

  slides.forEach((s) => {
    attachPreload(s.chainIcon);
    attachPreload(s.tokenIcon);
    if (s.tokenInner) {
      attachPreload(s.tokenInner);
    }
  });

  function fadeSwap(el, newHTML) {
    // Fade out
    el.style.transition =
      "opacity 0.1s ease-in-out, transform 0.1s ease-in-out";
    el.style.opacity = "0";
    el.style.transform = "translateY(4px)";

    setTimeout(() => {
      el.innerHTML = newHTML;

      el.style.transition = "none";
      el.style.transform = "translateY(-4px)";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Fade in
          el.style.transition =
            "opacity 0.1s ease-in-out, transform 0.1s ease-in-out";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        });
      });
    }, 100);
  }

  function updateCard(slide) {
    // Update chain field with fade
    const chainLeft = chainField.querySelector(".field-left");
    fadeSwap(
      chainLeft,
      '<img src="' +
        slide.chainIcon +
        '" alt="' +
        slide.chain +
        '" class="token-icon" style="border-radius:50%">' +
        '<span class="field-text">' +
        slide.chain +
        "</span>"
    );

    // Update token field with fade
    const tokenLeft = tokenField.querySelector(".field-left");
    if (slide.hasCompositeIcon) {
      fadeSwap(
        tokenLeft,
        '<div class="musd-icon">' +
          '<img src="' +
          slide.tokenIcon +
          '" alt="" class="musd-outer">' +
          '<img src="' +
          slide.tokenInner +
          '" alt="" class="musd-inner">' +
          "</div>" +
          '<span class="field-text">' +
          slide.token +
          "</span>"
      );
    } else {
      fadeSwap(
        tokenLeft,
        '<img src="' +
          slide.tokenIcon +
          '" alt="' +
          slide.token +
          '" class="token-icon" style="border-radius:50%">' +
          '<span class="field-text">' +
          slide.token +
          "</span>"
      );
    }
  }

  // Pre-create all background images and keep them in DOM (hidden)
  const bgImages = [];
  const pixelOverlay = document.getElementById("pixel-overlay");
  slides.forEach((s, i) => {
    const img = document.createElement("img");
    img.src = s.bg;
    img.alt = "";
    img.className = "hero-bg-img";
    img.style.opacity = i === 0 ? "1" : "0";
    img.style.position = i === 0 ? "" : "absolute";
    img.style.inset = "0";
    img.style.transition = "opacity 0.8s ease-in-out";
    if (i > 0) {
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
    }
    heroBg.insertBefore(img, pixelOverlay);
    bgImages.push(img);
  });
  // Remove the original static image from HTML
  if (currentImg && currentImg !== bgImages[0]) {
    currentImg.remove();
  }

  function goToSlide(index) {
    if (index === currentSlide || transitioning) {
      return;
    }
    transitioning = true;
    currentSlide = index;
    const slide = slides[index];
    window.__fastbridgeSelectedSlug = slide.slug;

    // Crossfade: show new, hide old
    for (let i = 0; i < bgImages.length; i++) {
      bgImages[i].style.opacity = i === index ? "1" : "0";
    }

    setTimeout(() => {
      transitioning = false;
    }, 800);

    // Update card content
    updateCard(slide);

    // Update dots
    dots.forEach((dot) => {
      dot.classList.remove("dot-active");
    });
    dots[index].classList.add("dot-active");
  }

  if (window.__heroCarouselObserver) {
    window.__heroCarouselObserver.disconnect();
  }
  if (window.__heroCarouselAutoTimer) {
    clearInterval(window.__heroCarouselAutoTimer);
  }

  let autoTimer = null;

  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    goToSlide(next);
  }

  function startTimer() {
    if (!autoTimer) {
      autoTimer = setInterval(nextSlide, 3000);
      window.__heroCarouselAutoTimer = autoTimer;
    }
  }

  function stopTimer() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      window.__heroCarouselAutoTimer = null;
    }
  }

  function resetTimer() {
    stopTimer();
    startTimer();
  }

  // Watch hero visibility
  const hero = document.querySelector(".hero");
  let wasVisible = true;
  window.__heroCarouselObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!wasVisible) {
            // Reset transitioning flag in case it was stuck
            transitioning = false;
          }
          startTimer();
          wasVisible = true;
        } else {
          stopTimer();
          wasVisible = false;
        }
      });
    },
    { threshold: 0.1 }
  );

  window.__heroCarouselObserver.observe(hero);

  // Click handlers — reset timer on manual click
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      goToSlide(Number.parseInt(dot.dataset.slide, 10));
      resetTimer();
    });
    dot.style.cursor = "pointer";
  });
})();
