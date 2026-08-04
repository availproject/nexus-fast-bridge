(() => {
  const toc = document.querySelector(".seo-toc");
  if (!toc) {
    return;
  }

  const links = Array.prototype.slice.call(
    toc.querySelectorAll('a[href^="#"]')
  );
  const sections = links
    .map((link) => {
      const id = link.getAttribute("href")?.slice(1);
      if (!id) {
        return null;
      }
      const el = document.getElementById(id);
      if (!el) {
        return null;
      }
      return {
        id,
        el,
        link,
        li: link.closest("li"),
      };
    })
    .filter(Boolean);

  if (!sections.length) {
    return;
  }

  let activeId = null;

  function setActive(id) {
    if (id === activeId) {
      return;
    }
    activeId = id;
    for (const section of sections) {
      if (!section) {
        continue;
      }
      const on = section.id === id;
      if (section.li) {
        section.li.classList.toggle("is-active", on);
      }
      if (on) {
        section.link.setAttribute("aria-current", "location");
      } else {
        section.link.removeAttribute("aria-current");
      }
    }
  }

  function update() {
    const marker = Math.min(160, Math.round(window.innerHeight * 0.28));
    let current = sections[0]?.id;
    for (const section of sections) {
      if (section && section.el.getBoundingClientRect().top <= marker) {
        current = section.id;
      }
    }
    if (current) {
      setActive(current);
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) {
      return;
    }
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
})();
