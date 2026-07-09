(function () {
  "use strict";

  const SELECTOR_INTERACTIVE = "a, button, input, textarea, select, label, [role='button']";
  const PRIMARY_RGB = "12, 63, 155";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safeSessionGet(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSessionSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (error) {
      return false;
    }
    return true;
  }

  function initOpening() {
    const splash = document.querySelector(".splash");
    const hasPlayed = safeSessionGet("hiroIntroPlayed") === "true";

    function revealPage() {
      document.body.classList.remove("is-loading");
      document.body.classList.add("is-ready");
      if (splash) {
        splash.classList.add("is-hidden");
      }
    }

    if (!splash || hasPlayed || prefersReducedMotion) {
      revealPage();
      return;
    }

    safeSessionSet("hiroIntroPlayed", "true");
    window.setTimeout(function () {
      splash.classList.add("is-hidden");
    }, 2650);

    window.setTimeout(revealPage, 3150);
  }

  function initMobileMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector(".mobile-menu");
    if (!toggle || !menu) return;

    function closeMenu() {
      document.body.classList.remove("nav-open");
      toggle.classList.remove("is-open");
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    function openMenu() {
      document.body.classList.add("nav-open");
      toggle.classList.add("is-open");
      menu.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });
  }

  function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal-rotate");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      targets.forEach(function (target) {
        target.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(function (entries, activeObserver) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          activeObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px"
    });

    targets.forEach(function (target) {
      observer.observe(target);
    });
  }

  function initTiltCard() {
    const card = document.querySelector("[data-tilt-card]");
    const canHover = window.matchMedia("(pointer: fine)").matches;
    if (!card || !canHover || prefersReducedMotion) return;

    const maxRotateX = 9;
    const maxRotateY = 12;

    card.addEventListener("pointermove", function (event) {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * maxRotateY * 2;
      const rotateX = (0.5 - y) * maxRotateX * 2;
      card.style.transform = "rotateX(" + rotateX.toFixed(2) + "deg) rotateY(" + rotateY.toFixed(2) + "deg)";
      card.style.boxShadow = (18 - rotateY * 0.7).toFixed(1) + "px " + (18 + rotateX * 0.6).toFixed(1) + "px 0 rgba(12, 63, 155, 0.12)";
    });

    card.addEventListener("pointerleave", function () {
      card.style.transform = "rotateX(0deg) rotateY(0deg)";
      card.style.boxShadow = "18px 18px 0 rgba(12, 63, 155, 0.12)";
    });
  }

  function initCustomCursor() {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!dot || !ring || !finePointer) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let hasPointer = false;

    function moveRing() {
      ringX += (targetX - ringX) / 10;
      ringY += (targetY - ringY) / 10;
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      window.requestAnimationFrame(moveRing);
    }

    document.addEventListener("pointermove", function (event) {
      targetX = event.clientX;
      targetY = event.clientY;
      dot.style.left = targetX + "px";
      dot.style.top = targetY + "px";

      if (!hasPointer) {
        hasPointer = true;
        dot.classList.add("is-visible");
        ring.classList.add("is-visible");
      }
    }, { passive: true });

    document.addEventListener("pointerover", function (event) {
      if (event.target.closest(SELECTOR_INTERACTIVE)) {
        ring.classList.add("is-hovering");
      }
    });

    document.addEventListener("pointerout", function (event) {
      if (event.target.closest(SELECTOR_INTERACTIVE)) {
        ring.classList.remove("is-hovering");
      }
    });

    moveRing();
  }

  function initParticleCanvas() {
    const canvas = document.getElementById("particle-canvas");
    if (!canvas || prefersReducedMotion) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const particles = [];
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      count: window.matchMedia("(max-width: 768px)").matches ? 14 : 20,
      maxDistance: 170
    };

    function randomVelocity() {
      const value = (Math.random() * 0.44) + 0.12;
      return Math.random() > 0.5 ? value : -value;
    }

    function makeParticle() {
      return {
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        radius: (Math.random() * 4) + 3,
        vx: randomVelocity(),
        vy: randomVelocity()
      };
    }

    function resize() {
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      canvas.width = Math.floor(state.width * state.dpr);
      canvas.height = Math.floor(state.height * state.dpr);
      canvas.style.width = state.width + "px";
      canvas.style.height = state.height + "px";
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      while (particles.length < state.count) {
        particles.push(makeParticle());
      }
      particles.length = state.count;
      particles.forEach(function (particle) {
        particle.x = Math.min(particle.x, state.width);
        particle.y = Math.min(particle.y, state.height);
      });
    }

    function draw() {
      context.clearRect(0, 0, state.width, state.height);

      particles.forEach(function (particle) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x <= particle.radius || particle.x >= state.width - particle.radius) {
          particle.vx *= -1;
          particle.x = Math.max(particle.radius, Math.min(state.width - particle.radius, particle.x));
        }

        if (particle.y <= particle.radius || particle.y >= state.height - particle.radius) {
          particle.vy *= -1;
          particle.y = Math.max(particle.radius, Math.min(state.height - particle.radius, particle.y));
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(" + PRIMARY_RGB + ", 0.10)";
        context.fill();
      });

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const first = particles[i];
          const second = particles[j];
          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < state.maxDistance) {
            const alpha = (1 - distance / state.maxDistance) * 0.22;
            context.beginPath();
            context.moveTo(first.x, first.y);
            context.lineTo(second.x, second.y);
            context.strokeStyle = "rgba(" + PRIMARY_RGB + ", " + alpha.toFixed(3) + ")";
            context.lineWidth = 1;
            context.stroke();
          }
        }
      }

      window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    draw();
  }

  function initSmoothHeaderOffset() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        const href = anchor.getAttribute("href");
        if (!href || href === "#") return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initOpening();
    initMobileMenu();
    initScrollReveal();
    initTiltCard();
    initCustomCursor();
    initParticleCanvas();
    initSmoothHeaderOffset();
  });
}());
