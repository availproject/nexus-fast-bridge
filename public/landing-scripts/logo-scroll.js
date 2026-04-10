(() => {
  const track = document.querySelector(".chains-track");
  if (!track) {
    return;
  }

  // Count original logos (first half)
  const logos = track.querySelectorAll(".chain-logo");
  const half = logos.length / 2;

  // Calculate exact width of first set including gaps
  let firstSetWidth = 0;
  for (let i = 0; i < half; i++) {
    firstSetWidth += logos[i].offsetWidth;
  }
  // Add gaps (60px each, between logos)
  firstSetWidth += half * 60;

  // Set CSS custom property for exact scroll distance
  track.style.setProperty("--scroll-width", `-${firstSetWidth}px`);
})();
