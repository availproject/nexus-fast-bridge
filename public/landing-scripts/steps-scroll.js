(() => {
  const howItWorks = document.querySelector(".how-it-works");
  const stepCards = document.querySelectorAll(".step-card");
  if (!(howItWorks && stepCards.length)) {
    return;
  }

  if (window.__stepsVideoObserver) {
    window.__stepsVideoObserver.disconnect();
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
