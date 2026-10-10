(() => {
  let navigationFrame;
  let noticeDialog;
  let noticeTrigger;

  function navigateTo(hash = window.location.hash) {
    cancelAnimationFrame(navigationFrame);
    let identifier;
    try {
      identifier = decodeURIComponent(hash.replace(/^#/, ""));
    } catch {
      return;
    }
    if (!identifier) return;
    let attempts = 0;
    const scrollToSection = () => {
      const section = document.getElementById(identifier);
      if (!section && attempts++ < 30) {
        navigationFrame = requestAnimationFrame(scrollToSection);
        return;
      }
      if (!section) return;
      const navigation = document.querySelector("nav");
      const headerBottom = navigation?.getBoundingClientRect().bottom ?? 0;
      document.documentElement.style.setProperty("--header-offset", `${headerBottom + 16}px`);
      section.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    };
    navigationFrame = requestAnimationFrame(() => {
      navigationFrame = requestAnimationFrame(scrollToSection);
    });
  }

  function showNotice(title, message) {
    if (!noticeDialog) {
      noticeDialog = document.createElement("dialog");
      noticeDialog.className = "site-notice";
      noticeDialog.setAttribute("aria-labelledby", "site-notice-title");
      noticeDialog.setAttribute("aria-describedby", "site-notice-message");
      noticeDialog.innerHTML = '<h2 id="site-notice-title"></h2><p id="site-notice-message"></p><div class="site-notice-actions"><a href="tel:5159813565">Call (515) 981-3565</a><button type="button">Close</button></div>';
      noticeDialog.querySelector("button").addEventListener("click", () => noticeDialog.close());
      noticeDialog.addEventListener("close", () => noticeTrigger?.focus());
      document.body.append(noticeDialog);
    }
    noticeTrigger = document.activeElement;
    noticeDialog.querySelector("h2").textContent = title;
    noticeDialog.querySelector("p").textContent = message;
    if (!noticeDialog.open) noticeDialog.showModal();
  }

  const notices = {
    privacy: ["Privacy policy information", "A privacy policy document is not available on this website. Please contact Continued Blessing Senior Delivery for its current policy before sharing sensitive information."],
    terms: ["Terms of service information", "Terms of service are not published on this website. Please contact Continued Blessing Senior Delivery to confirm service terms before booking."],
    accessibility: ["Accessibility assistance", "If you have difficulty using this website or completing a form, please call Continued Blessing Senior Delivery for assistance."],
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[data-site-notice]");
    const notice = link && notices[link.dataset.siteNotice];
    if (!notice) return;
    event.preventDefault();
    showNotice(...notice);
  });

  window.siteSupport = { navigateTo, showNotice };
  window.addEventListener("hashchange", () => navigateTo());
  window.addEventListener("load", () => navigateTo());
})();
