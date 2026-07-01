/* Nav, menu burger et vol de l'illu « 50 » vers le logo */
(function () {
  const nav = document.getElementById("nav");
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");
  const heroIllu = document.getElementById("heroIllu");
  const heroSignature = document.getElementById("heroSignature");
  const logoSlot = document.getElementById("logoSlot");
  const scrollCue = document.getElementById("scrollCue");

  /* ——— Menu burger ——— */
  function setMenu(open) {
    burger.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    menu.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });

  /* ——— Vol de l'illu ——— */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Rect de départ (l'illu est dans un calque fixe : indépendant du scroll)
  let start = null;
  let target = null;

  function measure() {
    heroIllu.style.transform = "none";
    start = heroIllu.getBoundingClientRect();
    target = logoSlot.getBoundingClientRect();
    update(true);
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  let docked = false;

  function update(force) {
    if (!start) return;
    const vh = window.innerHeight;
    const raw = Math.min(Math.max(window.scrollY / (vh * 0.72), 0), 1);
    const p = ease(raw);

    if (!reduceMotion) {
      const s = lerp(1, target.height / start.height, p);
      const tx = lerp(0, target.left - start.left, p);
      const ty = lerp(0, target.top - start.top, p);
      heroIllu.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
    } else {
      heroIllu.style.opacity = String(1 - raw * 1.6);
    }

    heroSignature.style.opacity = String(Math.max(1 - raw * 2.2, 0));
    nav.classList.toggle("is-solid", raw > 0.62);
    scrollCue.classList.toggle("is-hidden", raw > 0.12);

    const isDocked = raw >= 0.999;
    if (isDocked !== docked || force) {
      docked = isDocked;
      heroIllu.classList.toggle("is-docked", docked);
      // posée : on affiche le mini-logo statique à la place (rendu net) — voir CSS .illu-docked
      document.body.classList.toggle("illu-docked", docked);
    }
  }

  if (reduceMotion) {
    // pas de vol : le mini-logo statique de la nav reprend du service
    document.body.classList.remove("js-flight");
    heroIllu.style.willChange = "opacity";
  } else {
    document.body.classList.add("js-flight");
  }

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 120);
  });

  const heroImg = document.getElementById("heroImg");
  if (heroImg.complete) measure();
  else heroImg.addEventListener("load", measure);
})();
