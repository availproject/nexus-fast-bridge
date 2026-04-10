(() => {
  const howItWorks = document.querySelector(".how-it-works");
  const stepCards = document.querySelectorAll(".step-card");
  if (!(howItWorks && stepCards.length)) {
    return;
  }

  const isMobile = window.innerWidth <= 1024;

  if (window.__stepsSectionObserver) {
    window.__stepsSectionObserver.disconnect();
  }
  if (window.__stepsVideoObserver) {
    window.__stepsVideoObserver.disconnect();
  }

  // Toggle scroll-snap on html and sticky title when how-it-works is in viewport (desktop only)
  if (!isMobile) {
    window.__stepsSectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document.documentElement.classList.add("snap-active");
          } else {
            document.documentElement.classList.remove("snap-active");
          }
        });
      },
      { threshold: 0.1 }
    );

    window.__stepsSectionObserver.observe(howItWorks);
  }

  // Fade in steps + play/pause videos as they scroll into view
  window.__stepsVideoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const card = entry.target;
        const video = card.querySelector(".step-video");

        if (entry.isIntersecting) {
          card.classList.add("visible");
          if (video) {
            video.currentTime = 0;
            video.play().catch(() => {
              /* ignore */
            });
          }
        } else if (video) {
          video.pause();
        }
      });
    },
    { threshold: 0.2 }
  );

  for (let i = 0; i < stepCards.length; i++) {
    window.__stepsVideoObserver.observe(stepCards[i]);
  }
})();
