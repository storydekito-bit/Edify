(function () {
  const libraryTitle = document.getElementById("library-title");
  const libraryDescription = document.getElementById("library-description");
  const assetGrid = document.getElementById("asset-grid");
  const previewSectionTitle = document.getElementById("preview-section-title");
  const previewImage = document.getElementById("preview-image");
  const previewKicker = document.getElementById("preview-kicker");
  const previewTitle = document.getElementById("preview-title");
  const previewDescription = document.getElementById("preview-description");
  const inspectorTitle = document.getElementById("inspector-title");
  const inspectorChip = document.getElementById("inspector-chip");
  const featureModal = document.getElementById("feature-modal");
  const featureModalText = document.getElementById("feature-modal-text");
  const closeButton = document.querySelector(".feature-close");

  const categories = {
    media: {
      title: "Media library",
      description: "Browse clips, images, overlays, and soundtrack elements ready to place on the timeline.",
      sectionTitle: "Media preview",
      kicker: "Creator workflow",
      previewTitle: "Edit directly in the browser with the same Edify visual identity.",
      previewDescription: "Core browsing, timeline navigation, and light editing are available here. Higher-end production tools stay in the desktop app.",
      previewImage: "./web-check-premium-front.png",
      items: [
        { name: "Neon city intro", meta: "Video clip - 12s", image: "./demo-assets/neon-city.svg", pack: "Creator Pro", appOnly: false },
        { name: "Studio orbit", meta: "Video clip - 9s", image: "./demo-assets/studio-orbit.svg", pack: "Cinematic Pro", appOnly: false },
        { name: "Glass flare", meta: "Overlay - 8s", image: "./demo-assets/glass-flare.svg", pack: "Creator Pro", appOnly: false },
        { name: "Midnight pulse", meta: "Audio track - 3:45", image: "./demo-assets/waveform.svg", pack: "Studio Max", appOnly: false },
        { name: "Motion tracking shot", meta: "Desktop app only", image: "./web-check.png", pack: "Studio Max", appOnly: true, feature: "Motion tracking" },
        { name: "4K master clip", meta: "Desktop app only", image: "./web-check-premium-export.png", pack: "Studio Max", appOnly: true, feature: "4K media workflow" }
      ]
    },
    audio: {
      title: "Audio tools",
      description: "Shape voice, fades, soundtrack balance, and music placement while staying in the web workspace.",
      sectionTitle: "Audio preview",
      kicker: "Audio tools",
      previewTitle: "Mix voice, music, and timing with a lighter browser workflow.",
      previewDescription: "Web mode keeps the basics accessible while advanced cleanup and recording stay in the desktop app.",
      previewImage: "./demo-assets/waveform.svg",
      items: [
        { name: "Late night drive", meta: "Chill track - 92 BPM", image: "./demo-assets/waveform.svg", pack: "Creator Pro", appOnly: false },
        { name: "Logo hit", meta: "Short stinger", image: "./demo-assets/glass-flare.svg", pack: "Gaming Pro", appOnly: false },
        { name: "Voice denoise pro", meta: "Desktop app only", image: "./web-check-premium-export.png", pack: "Studio Max", appOnly: true, feature: "Voice denoise" },
        { name: "Microphone record", meta: "Desktop app only", image: "./web-check.png", pack: "Studio Max", appOnly: true, feature: "Microphone recording" },
        { name: "Podcast clean chain", meta: "Desktop app only", image: "./web-check-premium-front.png", pack: "AI Creator Pass", appOnly: true, feature: "Voice studio chain" }
      ]
    },
    text: {
      title: "Text and titles",
      description: "Work with creator, cinematic, and gaming text packs from Edify's premium system.",
      sectionTitle: "Text preview",
      kicker: "Text system",
      previewTitle: "Build premium captions, hooks, and lower thirds in the browser.",
      previewDescription: "Common title work stays available on the web. Heavier animation systems open in the desktop app.",
      previewImage: "./demo-assets/glass-flare.svg",
      items: [
        { name: "Luxury Lower Third", meta: "Creator Pro", image: "./demo-assets/neon-city.svg", pack: "Creator Pro", appOnly: false },
        { name: "Diamond Caption", meta: "Creator Pro", image: "./demo-assets/studio-orbit.svg", pack: "Creator Pro", appOnly: false },
        { name: "Trailer Impact Title", meta: "Cinematic Pro", image: "./web-check-premium-export.png", pack: "Cinematic Pro", appOnly: true, feature: "Trailer title animation" },
        { name: "Neon HUD Title", meta: "Gaming Pro", image: "./web-check-premium-front.png", pack: "Gaming Pro", appOnly: true, feature: "Gaming text animation" },
        { name: "Auto viral captions", meta: "AI Creator Pass", image: "./web-check.png", pack: "AI Creator Pass", appOnly: true, feature: "Auto captions AI" }
      ]
    },
    effects: {
      title: "Effects library",
      description: "Browse real Edify effects from Creator Pro, Gaming Pro, and Cinematic Pro.",
      sectionTitle: "Effects preview",
      kicker: "Effects stack",
      previewTitle: "Creator looks, gaming energy, and cinematic polish all live in the same product.",
      previewDescription: "You can explore the library on web. Heavy render paths and premium stacks open in the desktop app.",
      previewImage: "./web-check-premium-export.png",
      items: [
        { name: "Film Halation", meta: "Cinematic Pro", image: "./web-check-premium-export.png", pack: "Cinematic Pro", appOnly: false },
        { name: "Prism Split", meta: "Creator Pro", image: "./demo-assets/glass-flare.svg", pack: "Creator Pro", appOnly: false },
        { name: "Neon Edge Pulse", meta: "Gaming Pro", image: "./demo-assets/neon-city.svg", pack: "Gaming Pro", appOnly: false },
        { name: "Speed Ramp Shock", meta: "Gaming Pro", image: "./web-check.png", pack: "Gaming Pro", appOnly: true, feature: "Speed ramp effect stack" },
        { name: "Luxury Product Shine", meta: "Creator Pro", image: "./web-check-premium-front.png", pack: "Creator Pro", appOnly: true, feature: "Premium beauty and product effects" }
      ]
    },
    transitions: {
      title: "Transition packs",
      description: "Explore real transition families already present in Edify premium packs.",
      sectionTitle: "Transition preview",
      kicker: "Transition packs",
      previewTitle: "Whip, glass, cinematic, gaming, and creator transitions are all organized here.",
      previewDescription: "Desktop Edify unlocks the heaviest transition system, while web mode previews the catalog.",
      previewImage: "./web-check.png",
      items: [
        { name: "VIP Glass Swipe", meta: "Creator Pro", image: "./demo-assets/glass-flare.svg", pack: "Creator Pro", appOnly: false },
        { name: "Whip Pan Pro", meta: "Gaming Pro", image: "./demo-assets/neon-city.svg", pack: "Gaming Pro", appOnly: false },
        { name: "Anamorphic Blur Wipe", meta: "Cinematic Pro", image: "./demo-assets/studio-orbit.svg", pack: "Cinematic Pro", appOnly: false },
        { name: "Glitch Portal", meta: "Gaming Pro", image: "./web-check-premium-front.png", pack: "Gaming Pro", appOnly: true, feature: "Advanced transition placement" },
        { name: "Film Burn Deluxe", meta: "Cinematic Pro", image: "./web-check-premium-export.png", pack: "Cinematic Pro", appOnly: true, feature: "Cinematic transition renderer" }
      ]
    },
    filters: {
      title: "Filter presets",
      description: "Color and look presets ready for creator, cinematic, and gaming cuts.",
      sectionTitle: "Filter preview",
      kicker: "Color looks",
      previewTitle: "Quick look presets stay easy to browse and apply.",
      previewDescription: "Web mode previews the filter range. Advanced grading workflows remain stronger in the app.",
      previewImage: "./demo-assets/studio-orbit.svg",
      items: [
        { name: "Portra Glow Pro", meta: "Creator Pro", image: "./demo-assets/studio-orbit.svg", pack: "Creator Pro", appOnly: false },
        { name: "Teal Orange Deluxe", meta: "Cinematic Pro", image: "./web-check-premium-export.png", pack: "Cinematic Pro", appOnly: false },
        { name: "E-Sport Neon Grade", meta: "Gaming Pro", image: "./demo-assets/neon-city.svg", pack: "Gaming Pro", appOnly: false },
        { name: "Color match AI", meta: "Desktop app only", image: "./web-check.png", pack: "AI Creator Pass", appOnly: true, feature: "AI color match" }
      ]
    },
    captions: {
      title: "Caption presets",
      description: "Preview real caption styles from the app, from Creator Pro to Gaming Pro.",
      sectionTitle: "Caption preview",
      kicker: "Caption system",
      previewTitle: "Captions are part of the product identity, not an afterthought.",
      previewDescription: "Web mode shows the style system. Live generation and AI cleanup open in the desktop app.",
      previewImage: "./web-check-premium-front.png",
      items: [
        { name: "Karaoke Word Highlight Pro", meta: "Creator Pro", image: "./demo-assets/glass-flare.svg", pack: "Creator Pro", appOnly: false },
        { name: "Scene Dialogue Captions", meta: "Cinematic Pro", image: "./demo-assets/studio-orbit.svg", pack: "Cinematic Pro", appOnly: false },
        { name: "Rank Up Captions Pro", meta: "Gaming Pro", image: "./demo-assets/neon-city.svg", pack: "Gaming Pro", appOnly: false },
        { name: "Caption style AI", meta: "Desktop app only", image: "./web-check.png", pack: "AI Creator Pass", appOnly: true, feature: "Caption style AI" },
        { name: "Auto subtitle engine", meta: "Desktop app only", image: "./web-check-premium-export.png", pack: "AI Creator Pass", appOnly: true, feature: "Auto subtitle engine" }
      ]
    },
    templates: {
      title: "Template packs",
      description: "Open ready-made creator structures for reels, launches, gaming edits, and promos.",
      sectionTitle: "Template preview",
      kicker: "Template packs",
      previewTitle: "Launch projects faster with packs built around real creator workflows.",
      previewDescription: "Templates can be browsed here, while the desktop app handles the full premium application flow.",
      previewImage: "./web-check.png",
      items: [
        { name: "Travel Reel Starter", meta: "Creator Essentials", image: "./demo-assets/neon-city.svg", pack: "Creator Pro", appOnly: false },
        { name: "Podcast Clip Stack", meta: "Creator Essentials", image: "./demo-assets/waveform.svg", pack: "Creator Pro", appOnly: false },
        { name: "Cinematic Tease Pack", meta: "Cinematic Pro", image: "./demo-assets/studio-orbit.svg", pack: "Cinematic Pro", appOnly: false },
        { name: "Hook Generator Pack", meta: "Desktop app only", image: "./web-check-premium-front.png", pack: "AI Creator Pass", appOnly: true, feature: "Magic edit templates" }
      ]
    },
    color: {
      title: "Color tools",
      description: "Use quick grade controls and preview stronger grading systems from desktop Edify.",
      sectionTitle: "Color preview",
      kicker: "Color studio",
      previewTitle: "Shape tone, contrast, warmth, and cinematic direction with a clean control flow.",
      previewDescription: "Basic color looks are visible on web. The deep studio stays in the desktop application.",
      previewImage: "./web-check-premium-export.png",
      items: [
        { name: "Warm tone", meta: "Quick look", image: "./demo-assets/studio-orbit.svg", pack: "Creator Pro", appOnly: false },
        { name: "Cinematic cool tone", meta: "Quick look", image: "./web-check-premium-export.png", pack: "Cinematic Pro", appOnly: false },
        { name: "Skin tone protect", meta: "Desktop app only", image: "./web-check-premium-front.png", pack: "Studio Max", appOnly: true, feature: "Skin tone protect" },
        { name: "Scopes and LUT studio", meta: "Desktop app only", image: "./web-check.png", pack: "Studio Max", appOnly: true, feature: "Color studio scopes" }
      ]
    },
    premium: {
      title: "Premium packs",
      description: "See the real Edify premium plans and the benefits they unlock inside the app.",
      sectionTitle: "Premium preview",
      kicker: "Premium studio",
      previewTitle: "Premium in Edify is built around real packs, not vague labels.",
      previewDescription: "Creator Pro, Gaming Pro, Cinematic Pro, Studio Max, Text Studio Pass, and AI Creator Pass each have their own focus.",
      previewImage: "./web-check-premium-front.png",
      items: [
        { name: "Creator Pro", meta: "Glow effects, VIP text templates", image: "./demo-assets/glass-flare.svg", pack: "Creator Pro", appOnly: false },
        { name: "Gaming Pro", meta: "Glitch portal transitions, rank-up captions", image: "./demo-assets/neon-city.svg", pack: "Gaming Pro", appOnly: false },
        { name: "Cinematic Pro", meta: "1440p export, film title cards", image: "./demo-assets/studio-orbit.svg", pack: "Cinematic Pro", appOnly: false },
        { name: "Studio Max", meta: "4K Ultra export, all VIP transitions", image: "./web-check-premium-export.png", pack: "Studio Max", appOnly: true, feature: "Studio Max render path" },
        { name: "AI Creator Pass", meta: "Smart montage AI, B-roll finder", image: "./web-check.png", pack: "AI Creator Pass", appOnly: true, feature: "AI Creator Pass tools" }
      ]
    },
    ai: {
      title: "AI tools",
      description: "AI is visible in the web experience, but the full automation system belongs to the desktop app.",
      sectionTitle: "AI preview",
      kicker: "AI workflow",
      previewTitle: "Edify AI is part review assistant, part creator accelerator.",
      previewDescription: "The web version previews the direction. Core AI generation, analysis, and export helpers open in the desktop application.",
      previewImage: "./web-check.png",
      items: [
        { name: "Project assistant", meta: "Desktop app only", image: "./web-check.png", pack: "AI Creator Pass", appOnly: true, feature: "Project assistant" },
        { name: "Hook generator", meta: "Desktop app only", image: "./web-check-premium-front.png", pack: "AI Creator Pass", appOnly: true, feature: "Hook generator" },
        { name: "Beat sync", meta: "Desktop app only", image: "./web-check-premium-export.png", pack: "AI Creator Pass", appOnly: true, feature: "Beat sync" },
        { name: "Auto reframe", meta: "Desktop app only", image: "./demo-assets/studio-orbit.svg", pack: "Studio Max", appOnly: true, feature: "Auto reframe" },
        { name: "Smart montage AI", meta: "Desktop app only", image: "./demo-assets/neon-city.svg", pack: "AI Creator Pass", appOnly: true, feature: "Magic edit AI" }
      ]
    }
  };

  const clipMetadata = {
    "Neon city intro": "Creator Pro",
    "Whip cut": "Gaming Pro",
    "Studio orbit": "Cinematic Pro",
    "Glass flare": "Creator Pro",
    "Creator CTA Panel": "Creator Pro",
    "Luxury Lower Third": "Creator Pro",
    "Diamond Caption": "Creator Pro",
    "Midnight pulse": "Studio Max"
  };

  function openModal(featureName) {
    if (!featureModal) return;
    featureModal.classList.remove("is-hidden");
    featureModal.setAttribute("aria-hidden", "false");
    if (featureModalText) {
      featureModalText.textContent = `${featureName} is available in the Edify desktop application. Install Edify on Windows to unlock the full production workflow for this tool.`;
    }
  }

  function closeModal() {
    if (!featureModal) return;
    featureModal.classList.add("is-hidden");
    featureModal.setAttribute("aria-hidden", "true");
  }

  function bindAppOnly(scope) {
    scope.querySelectorAll("[data-app-only='true']").forEach((button) => {
      button.addEventListener("click", () => {
        openModal(button.dataset.feature || "This feature");
      });
    });
  }

  function renderAssets(categoryId) {
    const category = categories[categoryId];
    if (!category || !assetGrid) return;

    if (libraryTitle) libraryTitle.textContent = category.title;
    if (libraryDescription) libraryDescription.textContent = category.description;
    if (previewSectionTitle) previewSectionTitle.textContent = category.sectionTitle;
    if (previewKicker) previewKicker.textContent = category.kicker;
    if (previewTitle) previewTitle.textContent = category.previewTitle;
    if (previewDescription) previewDescription.textContent = category.previewDescription;
    if (previewImage) previewImage.src = category.previewImage;

    assetGrid.innerHTML = category.items
      .map((item, index) => {
        const stateClass = index === 0 ? " is-active" : "";
        const appOnlyAttr = item.appOnly ? "true" : "false";
        const featureAttr = item.feature ? ` data-feature="${item.feature}"` : "";
        return `
          <button class="asset-card-button${stateClass}" data-app-only="${appOnlyAttr}" data-pack="${item.pack}" data-name="${item.name}"${featureAttr}>
            <img src="${item.image}" alt="" />
            <span>
              <strong>${item.name}</strong>
              <small>${item.meta}</small>
            </span>
          </button>
        `;
      })
      .join("");

    assetGrid.querySelectorAll(".asset-card-button").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.appOnly === "true") {
          openModal(button.dataset.feature || button.dataset.name || "This feature");
          return;
        }

        assetGrid.querySelectorAll(".asset-card-button").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        if (inspectorTitle) inspectorTitle.textContent = button.dataset.name || "Selection";
        if (inspectorChip) inspectorChip.textContent = button.dataset.pack || "Creator Pro";
      });
    });

    bindAppOnly(assetGrid);
  }

  document.querySelectorAll(".rail-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".rail-button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      renderAssets(button.dataset.category);
    });
  });

  document.querySelectorAll(".clip").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".clip").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      if (inspectorTitle) inspectorTitle.textContent = button.dataset.clipName || "Selection";
      if (inspectorChip) inspectorChip.textContent = clipMetadata[button.dataset.clipName] || "Creator Pro";
    });
  });

  bindAppOnly(document);

  closeButton?.addEventListener("click", closeModal);
  featureModal?.addEventListener("click", (event) => {
    if (event.target === featureModal) closeModal();
  });

  renderAssets("media");
})();
