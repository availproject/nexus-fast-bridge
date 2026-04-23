(() => {
  const blogGrid = document.querySelector(".blog-grid");
  const blogCards = document.querySelectorAll(".blog-card");
  const dotsContainer = document.querySelector(".blog-dots");

  if (!(blogGrid && dotsContainer) || blogCards.length === 0) {
    return;
  }

  // Clear existing dots
  dotsContainer.innerHTML = "";

  const dots = [];
  const totalCards = blogCards.length;

  // Create dots
  for (let i = 0; i < totalCards; i++) {
    const dot = document.createElement("div");
    dot.className = `blog-dot${i === 0 ? " blog-dot--active" : ""}`;
    dot.dataset.index = i;

    dot.addEventListener("click", () => {
      // Calculate position relative to the grid's start
      const card = blogCards[i];
      if (card) {
        blogGrid.scrollTo({
          left: card.offsetLeft - blogGrid.offsetLeft,
          behavior: "smooth",
        });
      }
    });

    dotsContainer.appendChild(dot);
    dots.push(dot);
  }

  // Update dots based on scroll position
  const updateDots = () => {
    const scrollLeft = blogGrid.scrollLeft;
    const width = blogGrid.clientWidth || 1;
    const activeIndex = Math.round(scrollLeft / width);

    for (let i = 0; i < dots.length; i++) {
      if (i === activeIndex) {
        dots[i].classList.add("blog-dot--active");
      } else {
        dots[i].classList.remove("blog-dot--active");
      }
    }
  };

  blogGrid.addEventListener("scroll", updateDots, { passive: true });

  // Initial check
  updateDots();
})();
