(() => {
  const howItWorks = document.querySelector(".how-it-works");
  const stepCards = document.querySelectorAll(".step-card");
  if (!(howItWorks && stepCards.length)) {
    return;
  }

  // Clean up previous observers
  if (window.__stepsVideoObserver) {
    window.__stepsVideoObserver.disconnect();
  }
  if (window.__stepsSnapObserver) {
    window.__stepsSnapObserver.disconnect();
  }

  const stepsScroll = howItWorks.querySelector(".steps-scroll");
  if (!stepsScroll) {
    return;
  }

  // ===== Wheel passthrough at container boundaries =====
  // The steps-scroll container has its own scroll with snap.
  // When the user scrolls beyond the last step or above the first,
  // we temporarily disable overflow so the wheel event naturally
  // propagates to the main page, avoiding scroll-jail.

  let escapeTimer = null;

  stepsScroll.addEventListener(
    "wheel",
    (e) => {
      const el = stepsScroll;
      const atTop = el.scrollTop <= 1;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
        // Temporarily remove overflow so the page scroll takes over
        el.style.overflowY = "hidden";
        clearTimeout(escapeTimer);
        escapeTimer = setTimeout(() => {
          el.style.overflowY = "";
        }, 400);
      }
    },
    { passive: true }
  );

  // ===== Fade in steps + play/pause videos =====
  // Use the scroll container as the root so IntersectionObserver
  // detects visibility within the windowed viewport.
  window.__stepsVideoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target;
        const video = card.querySelector(".step-video");

        if (entry.isIntersecting) {
          card.classList.add("visible");
          if (video) {
            video.currentTime = 0;
            video.play().catch(() => {
              /* ignore autoplay restrictions */
            });
          }
        } else if (video) {
          video.pause();
        }
      }
    },
    { root: stepsScroll, threshold: 0.3 }
  );

  for (let i = 0; i < stepCards.length; i++) {
    window.__stepsVideoObserver.observe(stepCards[i]);
  }

  // ===== Reset scroll position when section enters viewport =====
  // So the user always starts from step 1 when scrolling down to this section
  window.__stepsSnapObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          stepsScroll.scrollTop = 0;
        }
      }
    },
    { threshold: 0.1 }
  );
  window.__stepsSnapObserver.observe(howItWorks);
})();
