(() => {
  const items = document.querySelectorAll(".faq-item");

  items.forEach((item) => {
    const btn = item.querySelector(".faq-question");
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("faq-item--open");

      // Close all
      items.forEach((i) => {
        i.classList.remove("faq-item--open");
      });

      // Toggle clicked
      if (!isOpen) {
        item.classList.add("faq-item--open");
      }
    });
  });
})();
