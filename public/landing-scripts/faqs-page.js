(() => {
  const navWrapper = document.querySelector(".faqs-nav-wrapper");
  const navItems = document.querySelectorAll(".faqs-nav-item");
  const categories = document.querySelectorAll(".faqs-category[data-category]");

  // ========== Scroll-spy: highlight active nav item ==========
  if (navItems.length && categories.length) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-category");
            for (const item of navItems) {
              item.classList.toggle(
                "faqs-nav-item--active",
                item.getAttribute("data-category") === id
              );
            }
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    for (const cat of categories) {
      spyObserver.observe(cat);
    }
  }

  // ========== Smooth scroll on nav click ==========
  for (const item of navItems) {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(item.getAttribute("href"));
      if (target) {
        const navHeight = navWrapper ? navWrapper.offsetHeight : 0;
        const top =
          target.getBoundingClientRect().top +
          window.pageYOffset -
          navHeight -
          24;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });
  }

  // ========== Section reveal on scroll ==========
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px 40px 0px" }
  );

  for (const cat of categories) {
    revealObserver.observe(cat);
  }
})();
