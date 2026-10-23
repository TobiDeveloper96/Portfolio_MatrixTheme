const THEMES = Object.freeze({
  green: "Green",
  amber: "Amber",
  ice: "Ice",
});

const MATRIX_GLYPHS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ012345789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

class MatrixRain {
  constructor(canvas, toggle, motionPreference) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.toggle = toggle;
    this.motionPreference = motionPreference;
    this.enabled = !motionPreference.matches;
    this.animationFrame = 0;
    this.columns = [];
    this.width = 0;
    this.height = 0;

    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => this.handleVisibility());
    motionPreference.addEventListener("change", () => this.handleMotionPreference());
    toggle.addEventListener("click", () => this.setEnabled(!this.enabled));

    this.resize();
    this.setEnabled(this.enabled);
  }

  resize() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * pixelRatio);
    this.canvas.height = Math.floor(this.height * pixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.columns = Array.from(
      { length: Math.ceil(this.width / 18) },
      () => Math.random() * (this.height / 18),
    );
  }

  setEnabled(enabled) {
    this.enabled = enabled && !this.motionPreference.matches;
    this.canvas.classList.toggle("paused", !this.enabled);
    this.toggle.setAttribute("aria-pressed", String(this.enabled));
    this.toggle.setAttribute(
      "aria-label",
      this.enabled ? "Pause code rain" : "Resume code rain",
    );
    this.toggle.querySelector(".rain-toggle-icon").textContent = this.enabled
      ? "Ⅱ"
      : "▶";
    window.cancelAnimationFrame(this.animationFrame);

    if (this.enabled && !document.hidden) {
      this.animationFrame = window.requestAnimationFrame(() => this.draw());
    }
  }

  draw() {
    if (!this.enabled || document.hidden || this.motionPreference.matches) return;

    const accent = getComputedStyle(document.body)
      .getPropertyValue("--accent")
      .trim();
    this.context.fillStyle = "rgba(7, 10, 8, 0.09)";
    this.context.fillRect(0, 0, this.width, this.height);
    this.context.fillStyle = accent;
    this.context.font = "11px 'DM Mono', monospace";

    this.columns.forEach((position, column) => {
      const glyph =
        MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
      const x = column * 18;
      const y = position * 18;
      this.context.globalAlpha = Math.random() * 0.5 + 0.15;
      this.context.fillText(glyph, x, y);
      this.context.globalAlpha = 1;
      this.columns[column] =
        y > this.height && Math.random() > 0.975 ? 0 : position + 0.35;
    });

    this.animationFrame = window.requestAnimationFrame(() => this.draw());
  }

  handleVisibility() {
    window.cancelAnimationFrame(this.animationFrame);
    if (!document.hidden && this.enabled) {
      this.animationFrame = window.requestAnimationFrame(() => this.draw());
    }
  }

  handleMotionPreference() {
    this.setEnabled(this.enabled && !this.motionPreference.matches);
  }
}

class ThemeController {
  constructor(buttons, notification) {
    this.buttons = buttons;
    this.notification = notification;
    this.timeout = 0;

    buttons.forEach((button) => {
      button.addEventListener("click", () => this.select(button.dataset.themeChoice));
    });
  }

  select(theme) {
    if (!Object.hasOwn(THEMES, theme)) return;

    document.body.dataset.theme = theme;
    this.buttons.forEach((button) => {
      const selected = button.dataset.themeChoice === theme;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    this.notification.textContent = `${THEMES[theme]} theme enabled`;
    this.notification.classList.add("visible");
    window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(
      () => this.notification.classList.remove("visible"),
      1500,
    );
  }
}

class ProjectFilter {
  constructor(buttons, projects, visibleCount, emptyState) {
    this.buttons = buttons;
    this.projects = projects;
    this.visibleCount = visibleCount;
    this.emptyState = emptyState;

    buttons.forEach((button) => {
      button.addEventListener("click", () => this.select(button));
    });
  }

  select(selectedButton) {
    this.buttons.forEach((button) => {
      const selected = button === selectedButton;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const category = selectedButton.dataset.filter;
    const visibleProjects = this.projects.filter((project) => {
      const visible =
        category === "all" || project.dataset.category === category;
      project.hidden = !visible;
      return visible;
    });

    this.visibleCount.textContent = String(visibleProjects.length).padStart(
      2,
      "0",
    );
    this.emptyState.hidden = visibleProjects.length !== 0;
  }
}

class PointerGravity {
  constructor(projects, motionPreference) {
    if (motionPreference.matches || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    projects.forEach((project) => {
      project.addEventListener("pointermove", (event) => this.tilt(project, event));
      project.addEventListener("pointerleave", () => this.reset(project));
      project.addEventListener("pointercancel", () => this.reset(project));
    });
  }

  tilt(project, event) {
    const bounds = project.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;

    project.style.setProperty("--tilt-x", `${vertical * -5}deg`);
    project.style.setProperty("--tilt-y", `${horizontal * 5}deg`);
  }

  reset(project) {
    project.style.removeProperty("--tilt-x");
    project.style.removeProperty("--tilt-y");
  }
}

class PortfolioApp {
  constructor(documentRoot = document) {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    new MatrixRain(
      documentRoot.querySelector(".rain"),
      documentRoot.querySelector(".rain-toggle"),
      motionPreference,
    );
    new ThemeController(
      [...documentRoot.querySelectorAll(".theme-swatch")],
      documentRoot.querySelector(".theme-toast"),
    );
    new ProjectFilter(
      [...documentRoot.querySelectorAll(".filter-button")],
      [...documentRoot.querySelectorAll(".project-card")],
      documentRoot.querySelector("#visible-count"),
      documentRoot.querySelector("#empty-state"),
    );
    new PointerGravity(
      [...documentRoot.querySelectorAll(".project-card")],
      motionPreference,
    );

    documentRoot.querySelector("#year").textContent = String(
      new Date().getFullYear(),
    );
  }
}

new PortfolioApp();
