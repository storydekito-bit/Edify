// Small, framework-free interactions for the Edify landing page.
(function () {
  const topbar = document.querySelector(".topbar");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const cursorGlow = document.querySelector(".cursor-glow");
  const toggleSwitch = document.querySelector(".toggle-switch");
  const pricingNumbers = document.querySelectorAll("[data-monthly]");
  const monthlyLabel = document.querySelector('[data-plan-mode="monthly-label"]');
  const yearlyLabel = document.querySelector('[data-plan-mode="yearly-label"]');
  const revealItems = document.querySelectorAll(".reveal");
  const faqItems = document.querySelectorAll(".faq-item");
  const toolbarButtons = document.querySelectorAll(".toolbar-button");
  const assetStack = document.querySelector("[data-asset-stack]");
  const timelineClips = document.querySelectorAll(".timeline-clip");

  const tabData = {
    Media: {
      title: "Media library",
      text: "Drag production clips, stills, and branded assets directly into the timeline.",
      badge: "Media mode",
      kicker: "Ready to cut",
      previewTitle: "Launch fast edits from any browser.",
      previewText:
        "Switch panels, refine timing, and export polished videos without losing the desktop feel.",
      inspectorTitle: "Hero intro",
      inspectorText: "Refine transform, motion, text, and finishing controls in one focused panel.",
      opacity: "94%",
      motion: "Smooth push",
      blend: "Normal",
      assets: [
        ["Hero sequence", "4K / 24fps / 18s", "asset-thumb-blue"],
        ["Product close-up", "HD / 60fps / 8s", "asset-thumb-violet"],
        ["Logo sting", "Motion overlay", "asset-thumb-gold"]
      ]
    },
    Text: {
      title: "Text styles",
      text: "Create subtitles, hooks, lower thirds, and bold title cards with motion-ready presets.",
      badge: "Text mode",
      kicker: "Motion text",
      previewTitle: "Design titles that feel premium from frame one.",
      previewText:
        "Dial in typography, alignment, timing, and animation presets from one focused browser panel.",
      inspectorTitle: "Lower third style",
      inspectorText: "Adjust font, spacing, motion, glow, and entry timing without leaving the preview.",
      opacity: "100%",
      motion: "Slide up",
      blend: "Screen",
      assets: [
        ["Cinematic title", "Bold uppercase look", "asset-thumb-blue"],
        ["Creator subtitle", "Word highlight preset", "asset-thumb-violet"],
        ["Launch lower third", "Brand-friendly lower third", "asset-thumb-gold"]
      ]
    },
    Effects: {
      title: "Effects rack",
      text: "Stack glow, blur, film burn, RGB split, lens accents, and finishing polish with preview feedback.",
      badge: "Effects mode",
      kicker: "Finishing tools",
      previewTitle: "Layer premium looks without slowing the creative pass.",
      previewText:
        "Use tasteful cinematic effects or creator-style energy hits directly inside the browser workspace.",
      inspectorTitle: "Glow + grade stack",
      inspectorText: "Tune effect intensity, blend modes, order, and color direction for fast finishing.",
      opacity: "88%",
      motion: "Energy burst",
      blend: "Additive",
      assets: [
        ["Neon edge pulse", "Premium effect", "asset-thumb-blue"],
        ["Film halation", "Cinematic finish", "asset-thumb-violet"],
        ["Glass flare", "Overlay accent", "asset-thumb-gold"]
      ]
    },
    Audio: {
      title: "Audio lane",
      text: "Shape music, dialogue, fades, loudness, and atmosphere from a dedicated audio workflow.",
      badge: "Audio mode",
      kicker: "Mix clean",
      previewTitle: "Keep voice clear and music controlled without leaving the edit.",
      previewText:
        "Balance soundtrack, dialogue, and sound design with quick audio tools built for creator speed.",
      inspectorTitle: "Chill soundtrack",
      inspectorText: "Adjust gain, fade, denoise, ducking, and timing while keeping visual focus on the cut.",
      opacity: "100%",
      motion: "Beat sync",
      blend: "Audio only",
      assets: [
        ["Late Night Drive", "Chill / 92 BPM", "asset-thumb-blue"],
        ["Soft Pulse", "Minimal electronic", "asset-thumb-violet"],
        ["Logo hit", "Short branded stinger", "asset-thumb-gold"]
      ]
    }
  };

  function updateTopbar() {
    if (!topbar) return;
    topbar.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  function updateCursorGlow(event) {
    if (!cursorGlow) return;
    document.documentElement.style.setProperty("--glow-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--glow-y", `${event.clientY}px`);
  }

  function updatePricing(isYearly) {
    pricingNumbers.forEach((element) => {
      const value = isYearly ? element.dataset.yearly : element.dataset.monthly;
      element.textContent = value;
    });

    if (toggleSwitch) {
      toggleSwitch.classList.toggle("is-yearly", isYearly);
      toggleSwitch.setAttribute("aria-pressed", String(isYearly));
    }

    monthlyLabel?.classList.toggle("is-active", !isYearly);
    yearlyLabel?.classList.toggle("is-active", isYearly);
  }

  function setActiveToolbar(button) {
    toolbarButtons.forEach((item) => item.classList.toggle("is-active", item === button));
  }

  function renderAssets(items) {
    if (!assetStack) return;

    assetStack.innerHTML = items
      .map(([title, subtitle, thumbClass], index) => {
        const activeClass = index === 0 ? " is-active" : "";
        return `
          <button class="asset-card${activeClass}" type="button">
            <span class="asset-thumb ${thumbClass}"></span>
            <span class="asset-copy">
              <strong>${title}</strong>
              <small>${subtitle}</small>
            </span>
          </button>
        `;
      })
      .join("");
  }

  function updateEditorPreview(mode) {
    const data = tabData[mode];
    if (!data) return;

    document.querySelector("[data-tab-title]")?.replaceChildren(document.createTextNode(data.title));
    document.querySelector("[data-tab-text]")?.replaceChildren(document.createTextNode(data.text));
    document.querySelector("[data-preview-badge]")?.replaceChildren(document.createTextNode(data.badge));
    document.querySelector("[data-preview-kicker]")?.replaceChildren(document.createTextNode(data.kicker));
    document.querySelector("[data-preview-title]")?.replaceChildren(document.createTextNode(data.previewTitle));
    document.querySelector("[data-preview-text]")?.replaceChildren(document.createTextNode(data.previewText));
    document.querySelector("[data-inspector-badge]")?.replaceChildren(document.createTextNode("Active selection"));
    document.querySelector("[data-inspector-title]")?.replaceChildren(document.createTextNode(data.inspectorTitle));
    document.querySelector("[data-inspector-text]")?.replaceChildren(document.createTextNode(data.inspectorText));
    document.querySelector("[data-inspector-opacity]")?.replaceChildren(document.createTextNode(data.opacity));
    document.querySelector("[data-inspector-motion]")?.replaceChildren(document.createTextNode(data.motion));
    document.querySelector("[data-inspector-blend]")?.replaceChildren(document.createTextNode(data.blend));

    renderAssets(data.assets);
  }

  function setActiveClip(clip) {
    timelineClips.forEach((item) => item.classList.toggle("is-active", item === clip));
    const clipName = clip.dataset.clip || clip.textContent.trim();
    const inspectorTitle = document.querySelector("[data-inspector-title]");
    const inspectorText = document.querySelector("[data-inspector-text]");

    if (inspectorTitle) {
      inspectorTitle.textContent = clipName;
    }

    if (inspectorText) {
      inspectorText.textContent =
        "Selected from the browser timeline. Use the inspector to refine timing, motion, look, and placement.";
    }
  }

  function initRevealObserver() {
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  window.addEventListener("scroll", updateTopbar, { passive: true });
  window.addEventListener("pointermove", updateCursorGlow, { passive: true });

  navToggle?.addEventListener("click", () => {
    const isOpen = navLinks?.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  toggleSwitch?.addEventListener("click", () => {
    const isYearly = !toggleSwitch.classList.contains("is-yearly");
    updatePricing(isYearly);
  });

  toolbarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveToolbar(button);
      updateEditorPreview(button.textContent.trim());
    });
  });

  timelineClips.forEach((clip) => {
    clip.addEventListener("click", () => setActiveClip(clip));
  });

  faqItems.forEach((item) => {
    const trigger = item.querySelector(".faq-question");
    trigger?.addEventListener("click", () => {
      const isOpen = item.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", String(isOpen));
    });
  });

  document.querySelectorAll(".asset-stack").forEach((stack) => {
    stack.addEventListener("click", (event) => {
      const button = event.target.closest(".asset-card");
      if (!button) return;

      stack.querySelectorAll(".asset-card").forEach((card) => card.classList.remove("is-active"));
      button.classList.add("is-active");
    });
  });

  document.getElementById("current-year").textContent = new Date().getFullYear();

  updateTopbar();
  updatePricing(false);
  updateEditorPreview("Media");
  initRevealObserver();
})();
