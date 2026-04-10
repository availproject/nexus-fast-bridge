(() => {
  const blogGrid = document.querySelector(".blog-grid");
  const blogCards = document.querySelectorAll(".blog-card");
  const dotsContainer = document.querySelector(".blog-dots");
  let currentBlog = 0;
  const totalBlogs = blogCards.length;

  // Clear existing dots in case of script re-execution
  if (dotsContainer) {
    dotsContainer.innerHTML = "";
  }

  // Create dots
  for (let i = 0; i < totalBlogs; i++) {
    const dot = document.createElement("div");
    dot.className = `blog-dot${i === 0 ? " blog-dot--active" : ""}`;
    dot.dataset.index = i;
    dot.addEventListener("click", function () {
      goToBlog(Number.parseInt(this.dataset.index, 10));
    });
    dotsContainer.appendChild(dot);
  }

  function goToBlog(index) {
    currentBlog = index;
    for (let j = 0; j < totalBlogs; j++) {
      blogCards[j].style.transform = `translateX(-${index * 100}%)`;
    }
    const dots = dotsContainer.querySelectorAll(".blog-dot");
    for (let d = 0; d < dots.length; d++) {
      dots[d].classList.remove("blog-dot--active");
    }
    dots[index].classList.add("blog-dot--active");
  }

  // Touch swipe support
  let startX = 0;
  let diffX = 0;

  blogGrid.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
    },
    { passive: true }
  );

  blogGrid.addEventListener(
    "touchmove",
    (e) => {
      diffX = e.touches[0].clientX - startX;
    },
    { passive: true }
  );

  blogGrid.addEventListener("touchend", () => {
    if (Math.abs(diffX) > 50) {
      if (diffX < 0 && currentBlog < totalBlogs - 1) {
        goToBlog(currentBlog + 1);
      } else if (diffX > 0 && currentBlog > 0) {
        goToBlog(currentBlog - 1);
      }
    }
    diffX = 0;
  });
})();
