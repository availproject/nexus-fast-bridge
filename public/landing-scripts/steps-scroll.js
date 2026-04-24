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

  // ===== Fade in steps + play/pause videos =====
  // Use the window viewport as the root
  window.__stepsVideoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target;
        const video = card.querySelector(".step-video");

        // Use a high threshold since cards are 100vh
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
    { threshold: 0.3 }
  );

  for (let i = 0; i < stepCards.length; i++) {
    window.__stepsVideoObserver.observe(stepCards[i]);
  }
})();
