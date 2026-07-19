(function () {
  "use strict";

  const SELECTOR_INTERACTIVE = "a, button, input, textarea, select, label, [role='button']";
  const PRIMARY_RGB = "74, 111, 165";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SCROLL_TRIGGER_URL = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js";
  const SWIPER_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/swiper@11.2.10/swiper-bundle.min.js";
  const SWIPER_STYLE_URL = "https://cdn.jsdelivr.net/npm/swiper@11.2.10/swiper-bundle.min.css";
  let scrollTriggerPromise = null;
  let swiperAssetsPromise = null;

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.fetchPriority = "low";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function loadStylesheet(url) {
    return new Promise(function (resolve, reject) {
      const stylesheet = document.createElement("link");
      const siteStylesheet = document.querySelector('link[href*="css/style.min.css"]');
      stylesheet.rel = "stylesheet";
      stylesheet.href = url;
      stylesheet.addEventListener("load", resolve, { once: true });
      stylesheet.addEventListener("error", reject, { once: true });
      if (siteStylesheet && siteStylesheet.parentNode) {
        siteStylesheet.parentNode.insertBefore(stylesheet, siteStylesheet);
      } else {
        document.head.appendChild(stylesheet);
      }
    });
  }

  function loadScrollTrigger() {
    if (window.ScrollTrigger) return Promise.resolve(window.ScrollTrigger);
    if (scrollTriggerPromise) return scrollTriggerPromise;

    scrollTriggerPromise = loadScript(SCROLL_TRIGGER_URL).then(function () {
      if (!window.ScrollTrigger) throw new Error("ScrollTrigger failed to initialize");
      if (window.gsap) window.gsap.registerPlugin(window.ScrollTrigger);
      return window.ScrollTrigger;
    });

    return scrollTriggerPromise;
  }

  function loadSwiperAssets() {
    if (window.Swiper) return Promise.resolve(window.Swiper);
    if (swiperAssetsPromise) return swiperAssetsPromise;

    swiperAssetsPromise = Promise.all([
      loadStylesheet(SWIPER_STYLE_URL),
      loadScript(SWIPER_SCRIPT_URL)
    ]).then(function () {
      if (!window.Swiper) throw new Error("Swiper failed to initialize");
      return window.Swiper;
    });

    return swiperAssetsPromise;
  }

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
    const root = document.documentElement;
    const hasPlayed = safeSessionGet("hiroIntroPlayed") === "true";
    const shouldPlay = root.classList.contains("is-loading") && !hasPlayed && !prefersReducedMotion;

    function revealPage() {
      root.classList.remove("is-loading");
      root.classList.add("is-ready");
      if (splash) {
        splash.classList.add("is-hidden");
      }
      window.requestAnimationFrame(function () {
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    }

    if (!splash || !shouldPlay) {
      revealPage();
      return;
    }

    safeSessionSet("hiroIntroPlayed", "true");
    window.setTimeout(function () {
      splash.classList.add("is-hidden");
    }, 650);

    window.setTimeout(revealPage, 1000);
  }

  function initMobileMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector(".mobile-menu");
    if (!toggle || !menu) return;
    const menuLinks = Array.from(menu.querySelectorAll("a"));
    const pageMain = document.querySelector("main");
    const pageFooter = document.querySelector(".site-footer");
    let previouslyFocused = null;

    function closeMenu(restoreFocus) {
      document.body.classList.remove("nav-open");
      toggle.classList.remove("is-open");
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "メニューを開く");
      menu.setAttribute("aria-hidden", "true");
      menu.inert = true;
      if (pageMain) pageMain.inert = false;
      if (pageFooter) pageFooter.inert = false;
      if (restoreFocus !== false && previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    }

    function openMenu() {
      previouslyFocused = document.activeElement;
      document.body.classList.add("nav-open");
      toggle.classList.add("is-open");
      menu.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "メニューを閉じる");
      menu.setAttribute("aria-hidden", "false");
      menu.inert = false;
      if (pageMain) pageMain.inert = true;
      if (pageFooter) pageFooter.inert = true;
      window.requestAnimationFrame(function () {
        if (menuLinks[0]) menuLinks[0].focus();
      });
    }

    menu.inert = true;

    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) {
        closeMenu(true);
      } else {
        openMenu();
      }
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (!menu.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== "Tab" || !menuLinks.length) return;

      const firstLink = menuLinks[0];
      const lastLink = menuLinks[menuLinks.length - 1];
      if (event.shiftKey && document.activeElement === firstLink) {
        event.preventDefault();
        lastLink.focus();
      } else if (!event.shiftKey && document.activeElement === lastLink) {
        event.preventDefault();
        firstLink.focus();
      }
    });
  }

  function initAdaptiveHeader() {
    const siteHeader = document.querySelector(".site-header");
    const hero = document.querySelector(".hero");
    if (!siteHeader || !hero) return;

    let ticking = false;

    function updateHeaderState() {
      const triggerPoint = hero.offsetTop + hero.offsetHeight;
      siteHeader.classList.toggle("is-after-fv", window.scrollY >= triggerPoint);
      ticking = false;
    }

    function requestHeaderUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHeaderState);
    }

    window.addEventListener("scroll", requestHeaderUpdate, { passive: true });
    window.addEventListener("resize", requestHeaderUpdate, { passive: true });
    updateHeaderState();
  }

  function initBackToTop() {
    const button = document.querySelector("[data-back-to-top]");
    const hero = document.querySelector("#hero");
    if (!button || !hero) return;

    let ticking = false;

    function updateButtonState() {
      const triggerPoint = hero.offsetTop + Math.min(hero.offsetHeight * 0.8, window.innerHeight * 0.88);
      const shouldShow = window.scrollY >= triggerPoint;

      button.classList.toggle("is-visible", shouldShow);
      button.setAttribute("aria-hidden", shouldShow ? "false" : "true");
      if (shouldShow) {
        button.removeAttribute("tabindex");
      } else {
        button.setAttribute("tabindex", "-1");
      }
      ticking = false;
    }

    function requestButtonUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateButtonState);
    }

    button.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    });

    window.addEventListener("scroll", requestButtonUpdate, { passive: true });
    window.addEventListener("resize", requestButtonUpdate, { passive: true });
    updateButtonState();
  }

  function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal-rotate");
    if (!targets.length) return;
    const useStaticReveal = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;

    if (!("IntersectionObserver" in window) || prefersReducedMotion || useStaticReveal) {
      targets.forEach(function (target) {
        target.classList.add("is-visible");
      });
      return;
    }

    document.documentElement.classList.add("reveal-enabled");

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
      const rect = target.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
        target.classList.add("is-visible");
      } else {
        observer.observe(target);
      }
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
      card.style.boxShadow = (18 - rotateY * 0.7).toFixed(1) + "px " + (18 + rotateX * 0.6).toFixed(1) + "px 0 rgba(" + PRIMARY_RGB + ", 0.12)";
    });

    card.addEventListener("pointerleave", function () {
      card.style.transform = "rotateX(0deg) rotateY(0deg)";
      card.style.boxShadow = "18px 18px 0 rgba(" + PRIMARY_RGB + ", 0.12)";
    });
  }

  function initCustomCursor() {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!dot || !ring || !finePointer) return;
    document.documentElement.classList.add("has-custom-cursor");

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let hasPointer = false;
    let cursorFrame = 0;

    function requestRingUpdate() {
      if (cursorFrame) return;
      cursorFrame = window.requestAnimationFrame(moveRing);
    }

    function moveRing() {
      cursorFrame = 0;
      ringX += (targetX - ringX) / 10;
      ringY += (targetY - ringY) / 10;
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      if (Math.abs(targetX - ringX) > 0.1 || Math.abs(targetY - ringY) > 0.1) {
        requestRingUpdate();
      }
    }

    document.addEventListener("pointermove", function (event) {
      targetX = event.clientX;
      targetY = event.clientY;
      dot.style.left = targetX + "px";
      dot.style.top = targetY + "px";
      requestRingUpdate();

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

  }

  function initParticleCanvas() {
    const canvas = document.getElementById("particle-canvas");
    const lowPowerViewport = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    if (!canvas || prefersReducedMotion || lowPowerViewport) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const particles = [];
    const auraLayers = [
      { x: 0.16, y: 0.24, radius: 0.48, color: "249, 229, 249", speed: 0.00018, phase: 0.3, rangeX: 0.12, rangeY: 0.1, parallax: 70 },
      { x: 0.82, y: 0.38, radius: 0.44, color: "210, 233, 249", speed: 0.00023, phase: 2.1, rangeX: 0.1, rangeY: 0.14, parallax: -55 },
      { x: 0.46, y: 0.86, radius: 0.4, color: "191, 249, 255", speed: 0.00015, phase: 4.2, rangeX: 0.16, rangeY: 0.08, parallax: 45 }
    ];
    const particleColors = ["209, 189, 255", "160, 237, 246", "255, 203, 222"];
    const connectionColors = ["132, 119, 201", "72, 166, 190", "207, 125, 160"];
    let animationFrame = 0;
    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      count: 20,
      isMobile: false,
      pointerX: 0.5,
      pointerY: 0.5,
      pointerTargetX: 0.5,
      pointerTargetY: 0.5,
      pointerActive: false,
      lastFrame: 0,
      isVisible: !document.hidden,
      isNearHero: true
    };

    function randomVelocity() {
      const value = (Math.random() * 42) + 24;
      return Math.random() > 0.5 ? value : -value;
    }

    function makeParticle(index) {
      return {
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        radius: state.isMobile ? (Math.random() * 4) + 6 : (Math.random() * 6) + 10,
        vx: randomVelocity(),
        vy: randomVelocity(),
        color: particleColors[index % particleColors.length],
        lineColor: connectionColors[index % connectionColors.length],
        phase: Math.random() * Math.PI * 2
      };
    }

    function resize() {
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.width = window.innerWidth;
      state.height = window.innerHeight;
      state.isMobile = state.width <= 768;
      state.count = state.isMobile ? 14 : 20;
      canvas.width = Math.floor(state.width * state.dpr);
      canvas.height = Math.floor(state.height * state.dpr);
      canvas.style.width = state.width + "px";
      canvas.style.height = state.height + "px";
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

      while (particles.length < state.count) {
        particles.push(makeParticle(particles.length));
      }
      particles.length = state.count;
      particles.forEach(function (particle) {
        particle.radius = state.isMobile ? Math.min(particle.radius, 10) : Math.max(particle.radius, 10);
        particle.x = Math.max(particle.radius, Math.min(particle.x, state.width - particle.radius));
        particle.y = Math.max(particle.radius, Math.min(particle.y, state.height - particle.radius));
      });
    }

    function drawAuras(time) {
      const pointerOffsetX = state.pointerX - 0.5;
      const pointerOffsetY = state.pointerY - 0.5;

      auraLayers.forEach(function (aura) {
        const x = (aura.x + Math.sin(time * aura.speed + aura.phase) * aura.rangeX) * state.width + pointerOffsetX * aura.parallax;
        const y = (aura.y + Math.cos(time * aura.speed * 0.82 + aura.phase) * aura.rangeY) * state.height + pointerOffsetY * aura.parallax;
        const radius = Math.max(state.width, state.height) * aura.radius;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

        gradient.addColorStop(0, "rgba(" + aura.color + ", 0.18)");
        gradient.addColorStop(0.46, "rgba(" + aura.color + ", 0.07)");
        gradient.addColorStop(1, "rgba(" + aura.color + ", 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, state.width, state.height);
      });
    }

    function drawConnection(first, second, strength) {
      const dx = first.x - second.x;
      const dy = first.y - second.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const diagonal = Math.sqrt(state.width * state.width + state.height * state.height);
      const alpha = Math.min(0.26, Math.max(0.075, (1 - distance / diagonal) * 0.22) * strength);
      const gradient = context.createLinearGradient(first.x, first.y, second.x, second.y);
      const firstLineColor = first.lineColor || first.color;
      const secondLineColor = second.lineColor || second.color;

      gradient.addColorStop(0, "rgba(" + firstLineColor + ", " + alpha.toFixed(3) + ")");
      gradient.addColorStop(1, "rgba(" + secondLineColor + ", " + (alpha * 0.86).toFixed(3) + ")");
      context.save();
      context.beginPath();
      context.moveTo(first.x, first.y);
      context.lineTo(second.x, second.y);
      context.strokeStyle = gradient;
      context.lineWidth = strength > 0.8 ? (state.isMobile ? 1.55 : 1.75) : (state.isMobile ? 1 : 1.2);
      context.shadowColor = "rgba(74, 111, 165, 0.16)";
      context.shadowBlur = strength > 0.8 ? 5 : 3;
      context.stroke();
      context.restore();
    }

    function drawParticle(particle, time) {
      const pulse = 1 + Math.sin(time * 0.0014 + particle.phase) * 0.12;
      const glowRadius = particle.radius * 2.8 * pulse;
      const glow = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, glowRadius);

      glow.addColorStop(0, "rgba(" + particle.color + ", 0.2)");
      glow.addColorStop(0.42, "rgba(" + particle.color + ", 0.07)");
      glow.addColorStop(1, "rgba(" + particle.color + ", 0)");
      context.beginPath();
      context.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
      context.fillStyle = glow;
      context.fill();

      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
      context.fillStyle = "rgba(" + particle.color + ", 0.16)";
      context.fill();
    }

    function requestDraw() {
      if (animationFrame || !state.isVisible || !state.isNearHero) return;
      animationFrame = window.requestAnimationFrame(draw);
    }

    function draw(time) {
      animationFrame = 0;
      if (!state.isVisible || !state.isNearHero) return;
      if (time - state.lastFrame < 1000 / 30) {
        requestDraw();
        return;
      }

      const delta = state.lastFrame ? Math.min((time - state.lastFrame) / 1000, 0.05) : 1 / 30;
      state.lastFrame = time;
      state.pointerX += (state.pointerTargetX - state.pointerX) * 0.055;
      state.pointerY += (state.pointerTargetY - state.pointerY) * 0.055;
      context.clearRect(0, 0, state.width, state.height);
      drawAuras(time);

      particles.forEach(function (particle) {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        if (particle.x <= particle.radius || particle.x >= state.width - particle.radius) {
          particle.vx *= -1;
          particle.x = Math.max(particle.radius, Math.min(state.width - particle.radius, particle.x));
        }

        if (particle.y <= particle.radius || particle.y >= state.height - particle.radius) {
          particle.vy *= -1;
          particle.y = Math.max(particle.radius, Math.min(state.height - particle.radius, particle.y));
        }
      });

      particles.forEach(function (particle, index) {
        drawConnection(particle, particles[(index + 1) % particles.length], 1);
        drawConnection(particle, particles[(index + 2) % particles.length], 0.58);
      });

      if (state.pointerActive) {
        const pointer = {
          x: state.pointerX * state.width,
          y: state.pointerY * state.height,
          color: "210, 233, 249",
          lineColor: "74, 111, 165"
        };
        particles
          .slice()
          .sort(function (first, second) {
            return Math.hypot(first.x - pointer.x, first.y - pointer.y) - Math.hypot(second.x - pointer.x, second.y - pointer.y);
          })
          .slice(0, 3)
          .forEach(function (particle) {
            drawConnection(pointer, particle, 1.18);
          });
      }

      particles.forEach(function (particle) {
        drawParticle(particle, time);
      });

      requestDraw();
    }

    function updateActivity() {
      const hero = document.querySelector(".hero");
      const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight;
      const wasNearHero = state.isNearHero;
      state.isNearHero = window.scrollY <= heroBottom + window.innerHeight * 0.2;
      canvas.classList.toggle("is-active", state.isNearHero);
      if (state.isNearHero && !wasNearHero) state.lastFrame = 0;
      requestDraw();
    }

    resize();
    updateActivity();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", updateActivity, { passive: true });
    window.addEventListener("pointermove", function (event) {
      state.pointerTargetX = event.clientX / Math.max(state.width, 1);
      state.pointerTargetY = event.clientY / Math.max(state.height, 1);
      state.pointerActive = true;
      requestDraw();
    }, { passive: true });
    document.addEventListener("pointerleave", function () {
      state.pointerActive = false;
      state.pointerTargetX = 0.5;
      state.pointerTargetY = 0.5;
    });
    document.addEventListener("visibilitychange", function () {
      state.isVisible = !document.hidden;
      if (state.isVisible) {
        state.lastFrame = 0;
        requestDraw();
      } else if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    });
    requestDraw();
  }

  function initHeroKeyword() {
    const swap = document.querySelector("[data-keyword]");
    if (!swap || prefersReducedMotion) return;

    const initialEl = swap.querySelector(".hero-keyword-initial");
    const wordEl = swap.querySelector(".hero-keyword-word");
    if (!initialEl || !wordEl) return;

    const words = ["DESIGN", "CODE", "MOTION", "STORY"];
    let index = 0;

    window.setInterval(function () {
      swap.classList.add("is-out");
      window.setTimeout(function () {
        index = (index + 1) % words.length;
        const word = words[index];
        initialEl.textContent = word.charAt(0);
        wordEl.textContent = word;
        swap.classList.remove("is-out");
      }, 400);
    }, 2900);
  }

  function initHeroVisual() {
    const visual = document.querySelector("[data-hero-visual]");
    const card = visual ? visual.querySelector("[data-hero-card]") : null;
    const image = visual ? visual.querySelector("[data-hero-image]") : null;
    const badge = visual ? visual.querySelector(".hero-keyword") : null;
    const canHover = window.matchMedia("(pointer: fine)").matches;
    if (!visual || !card || !image || !canHover || prefersReducedMotion || !window.gsap) return;

    const gsap = window.gsap;
    gsap.set(card, {
      transformPerspective: 1200,
      transformOrigin: "50% 50%",
      rotationZ: -2
    });

    visual.addEventListener("pointermove", function (event) {
      const rect = visual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      gsap.to(card, {
        rotationX: y * -10,
        rotationY: x * 13,
        rotationZ: -2 + x * 1.2,
        x: x * 8,
        y: y * 6,
        duration: 0.65,
        ease: "power3.out",
        overwrite: "auto"
      });
      gsap.to(image, {
        x: x * -12,
        y: y * -10,
        scale: 1.045,
        duration: 0.75,
        ease: "power3.out",
        overwrite: "auto"
      });
      if (badge) {
        gsap.to(badge, {
          x: x * -7,
          y: y * -7,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto"
        });
      }
    });

    visual.addEventListener("pointerleave", function () {
      gsap.to(card, {
        rotationX: 0,
        rotationY: 0,
        rotationZ: -2,
        x: 0,
        y: 0,
        duration: 0.9,
        ease: "elastic.out(1, 0.55)",
        overwrite: "auto"
      });
      gsap.to(image, {
        x: 0,
        y: 0,
        scale: 1.02,
        duration: 0.85,
        ease: "power3.out",
        overwrite: "auto"
      });
      if (badge) {
        gsap.to(badge, {
          x: 0,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          overwrite: "auto"
        });
      }
    });
  }

  function splitTextIntoCharacters(element) {
    if (!element) return [];
    if (element.dataset.splitReady === "true") {
      return Array.from(element.querySelectorAll(".split-char-block"));
    }

    const accessibleLabel = (element.innerText || element.textContent).replace(/\s+/g, " ").trim();
    const characterElements = [];

    function createCharacter(character) {
      const block = document.createElement("span");
      block.className = "split-char-block";
      block.setAttribute("aria-hidden", "true");
      block.textContent = character;
      characterElements.push(block);
      return block;
    }

    Array.from(element.childNodes).forEach(function (node) {
      if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue) return;

      const fragment = document.createDocumentFragment();
      const tokens = node.nodeValue.split(/(\s+)/);

      tokens.forEach(function (token) {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          fragment.appendChild(document.createTextNode(token));
          return;
        }

        const containsJapanese = /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(token);
        if (containsJapanese) {
          Array.from(token).forEach(function (character) {
            fragment.appendChild(createCharacter(character));
          });
          return;
        }

        const word = document.createElement("span");
        word.className = "split-word";
        word.setAttribute("aria-hidden", "true");
        Array.from(token).forEach(function (character) {
          word.appendChild(createCharacter(character));
        });
        fragment.appendChild(word);
      });

      node.replaceWith(fragment);
    });

    element.dataset.splitReady = "true";
    if (accessibleLabel) element.setAttribute("aria-label", accessibleLabel);
    return characterElements;
  }

  function setCharacterStartState(characters, isHero) {
    const gsap = window.gsap;

    if (isHero) {
      const compactMotion = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
      gsap.set(characters, {
        autoAlpha: 0,
        x: function () {
          return compactMotion ? gsap.utils.random(-150, -80) : gsap.utils.random(-600, -400);
        },
        y: function () {
          return compactMotion ? gsap.utils.random(-120, -30) : gsap.utils.random(-600, -50);
        },
        rotation: function () {
          return gsap.utils.random(-180, 180);
        },
        rotationX: 0,
        rotationY: 0,
        scale: compactMotion ? 2.2 : 5,
        filter: "blur(0px)",
        transformOrigin: "50% 50%"
      });
      return;
    }

    gsap.set(characters, {
      autoAlpha: 0,
      x: function (characterIndex) {
        const direction = characterIndex % 2 === 0 ? -1 : 1;
        return direction * (54 + (characterIndex % 4) * 22);
      },
      y: function (characterIndex) {
        const baseDistance = Math.min(window.innerHeight * 0.48, 420);
        return -baseDistance - (characterIndex % 4) * 34;
      },
      rotation: function (characterIndex) {
        return ((characterIndex * 97) % 360) - 180;
      },
      rotationX: function (characterIndex) {
        return -92 - (characterIndex % 3) * 24;
      },
      rotationY: function (characterIndex) {
        return (characterIndex % 2 === 0 ? -1 : 1) * (28 + (characterIndex % 3) * 14);
      },
      scale: function (characterIndex) {
        return 2.6 + (characterIndex % 3) * 0.42;
      },
      filter: "blur(7px)",
      transformOrigin: "50% 50%"
    });
  }

  function addCharacterBlockTweens(timeline, characters, options) {
    characters.forEach(function (character, characterIndex) {
      timeline.to(character, {
        autoAlpha: 1,
        x: 0,
        y: 0,
        rotation: 0,
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: options.duration,
        ease: "power2.out"
      }, characterIndex * options.interval);
    });
  }

  function initHeroTextReveal() {
    if (prefersReducedMotion || !window.gsap) return;

    const gsap = window.gsap;
    const heroAnimatedTitle = document.querySelector(".hero-jp-title");

    if (heroAnimatedTitle) {
      const heroCharacters = splitTextIntoCharacters(heroAnimatedTitle);
      if (heroCharacters.length) {
        setCharacterStartState(heroCharacters, true);
        const heroTimeline = gsap.timeline();
        heroTimeline.to(heroCharacters, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.2,
          stagger: 0.12,
          ease: "power2.out"
        });
      }
    }
  }

  function initSectionTextReveal() {
    if (prefersReducedMotion || !window.gsap) return;

    const gsap = window.gsap;
    const hasScrollTrigger = Boolean(window.ScrollTrigger);
    const sectionHeadings = Array.from(document.querySelectorAll("[data-section-title] h2"));
    const fallbackTimelines = new Map();

    if (hasScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }

    sectionHeadings.forEach(function (heading) {
      const characters = splitTextIntoCharacters(heading);
      if (!characters.length) return;
      setCharacterStartState(characters, false);
      const sectionTimelineOptions = { paused: !hasScrollTrigger };

      if (hasScrollTrigger) {
        sectionTimelineOptions.scrollTrigger = {
          trigger: heading.closest("[data-section-title]"),
          start: "top 88%",
          end: function () {
            return "+=" + Math.max(460, characters.length * 38);
          },
          scrub: 0.72,
          invalidateOnRefresh: true
        };
      }

      const sectionTimeline = gsap.timeline(sectionTimelineOptions);
      addCharacterBlockTweens(sectionTimeline, characters, {
        duration: 0.94,
        interval: 0.2
      });

      if (!hasScrollTrigger) fallbackTimelines.set(heading, sectionTimeline);
    });

    if (!hasScrollTrigger && fallbackTimelines.size) {
      if (!("IntersectionObserver" in window)) {
        fallbackTimelines.forEach(function (timeline) {
          timeline.play(0);
        });
        return;
      }

      const observer = new IntersectionObserver(function (entries, activeObserver) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const timeline = fallbackTimelines.get(entry.target);
          if (timeline) timeline.play(0);
          activeObserver.unobserve(entry.target);
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

      fallbackTimelines.forEach(function (timeline, heading) {
        observer.observe(heading);
      });
    }
  }

  function initSectionTitleAnimation() {
    const titles = Array.from(document.querySelectorAll("[data-section-title]"));
    if (!titles.length || prefersReducedMotion || !window.gsap) return;

    const gsap = window.gsap;
    const hasScrollTrigger = Boolean(window.ScrollTrigger);
    const canHover = window.matchMedia("(pointer: fine)").matches;

    if (hasScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }

    titles.forEach(function (title, index) {
      const copyItems = Array.from(title.querySelectorAll(".section-title-copy > *:not(h2)"));
      const art = title.querySelector(".section-title-art");
      const orbit = title.querySelector(".title-art-orbit");
      const disc = title.querySelector(".title-art-disc");
      const square = title.querySelector(".title-art-square");
      const artParts = Array.from(title.querySelectorAll(".section-title-art > span"));
      const timelineOptions = hasScrollTrigger ? {
        scrollTrigger: {
          trigger: title,
          start: "top 84%",
          once: true
        }
      } : {};
      const timeline = gsap.timeline(timelineOptions);

      timeline.from(title, {
        "--title-line": "0%",
        duration: 1.05,
        ease: "power3.out"
      });

      if (copyItems.length) {
        timeline.from(copyItems, {
          autoAlpha: 0,
          y: 34,
          rotationX: -12,
          transformOrigin: "50% 100%",
          duration: 0.85,
          stagger: 0.1,
          ease: "power3.out"
        }, 0.08);
      }

      if (art) {
        timeline
          .from(art, {
            autoAlpha: 0,
            scale: 0.54,
            rotation: index % 2 === 0 ? -28 : 28,
            duration: 1.05,
            ease: "back.out(1.7)"
          }, 0.04)
          .from(artParts, {
            autoAlpha: 0,
            scale: 0.35,
            stagger: 0.08,
            duration: 0.62,
            ease: "back.out(2)"
          }, 0.16);
      }

      if (orbit) {
        gsap.to(orbit, {
          rotation: index % 2 === 0 ? "+=360" : "-=360",
          duration: 18 + index * 1.4,
          repeat: -1,
          ease: "none"
        });
      }

      if (disc) {
        gsap.to(disc, {
          x: index % 2 === 0 ? 5 : -5,
          y: -8,
          duration: 2.8 + index * 0.24,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }

      if (square) {
        gsap.to(square, {
          rotation: index % 2 === 0 ? "+=24" : "-=24",
          y: 5,
          duration: 3.6 + index * 0.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      }

      if (canHover && art) {
        title.addEventListener("pointermove", function (event) {
          const rect = title.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;

          gsap.to(art, {
            x: x * 16,
            y: y * 12,
            rotationX: y * -7,
            rotationY: x * 9,
            duration: 0.7,
            ease: "power3.out",
            overwrite: "auto"
          });
        });

        title.addEventListener("pointerleave", function () {
          gsap.to(art, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            duration: 0.9,
            ease: "elastic.out(1, 0.55)",
            overwrite: "auto"
          });
        });
      }
    });
  }

  function initFlowAnimation() {
    const flowList = document.querySelector("[data-flow-list]");
    if (!flowList || prefersReducedMotion || !window.gsap) return;

    const gsap = window.gsap;
    const steps = Array.from(flowList.querySelectorAll("[data-flow-step]"));
    const arrows = Array.from(flowList.querySelectorAll("[data-flow-arrow]"));
    const hasScrollTrigger = Boolean(window.ScrollTrigger);
    const canHover = window.matchMedia("(pointer: fine)").matches;
    if (!steps.length) return;

    if (hasScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }

    gsap.set(steps, {
      autoAlpha: 0,
      y: 52,
      scale: 0.96,
      rotationX: -7,
      transformOrigin: "50% 100%"
    });

    arrows.forEach(function (arrow) {
      const line = arrow.querySelector(".flow-arrow-line");
      const glyph = arrow.querySelector(".flow-arrow-glyph");
      if (line) gsap.set(line, { scale: 0 });
      if (glyph) gsap.set(glyph, { autoAlpha: 0, scale: 0.45, rotation: -20 });
    });

    function createStepTimeline(step, index) {
      const timelineOptions = {
        paused: !hasScrollTrigger,
        defaults: { ease: "power3.out" }
      };

      if (hasScrollTrigger) {
        timelineOptions.scrollTrigger = {
          trigger: step,
          start: "top 86%",
          once: true,
          invalidateOnRefresh: true
        };
      }

      const timeline = gsap.timeline(timelineOptions);
      const meta = step.querySelector(".flow-step-meta");
      const heading = step.querySelector("h3");
      const copy = step.querySelector("p");
      const number = step.querySelector(".flow-number");
      const accent = step.querySelector(".flow-step-accent");
      const arrow = arrows[index];

      timeline.to(step, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        rotationX: 0,
        duration: 0.72
      }, 0);

      if (meta) {
        timeline.fromTo(meta, {
          autoAlpha: 0,
          y: 14
        }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.48
        }, 0.07);
      }

      if (number) {
        timeline.fromTo(number, {
          scale: 0.45,
          rotation: -24
        }, {
          scale: 1,
          rotation: 0,
          duration: 0.58,
          ease: "back.out(1.65)"
        }, 0.1);
      }

      if (heading || copy) {
        timeline.fromTo([heading, copy].filter(Boolean), {
          autoAlpha: 0,
          y: 16
        }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.52,
          stagger: 0.08
        }, 0.16);
      }

      if (accent) {
        timeline.fromTo(accent, {
          scaleX: 0
        }, {
          scaleX: 1,
          duration: 0.44,
          ease: "power2.inOut"
        }, 0.28);
      }

      if (arrow) {
        const line = arrow.querySelector(".flow-arrow-line");
        const glyph = arrow.querySelector(".flow-arrow-glyph");

        if (line) {
          timeline.to(line, {
            scale: 1,
            duration: 0.46,
            ease: "power2.inOut"
          }, 0.46);
        }

        if (glyph) {
          timeline.to(glyph, {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 0.44,
            ease: "back.out(1.7)"
          }, 0.58);
        }
      }

      return timeline;
    }

    const timelines = steps.map(createStepTimeline);

    if (!hasScrollTrigger) {
      if (!("IntersectionObserver" in window)) {
        timelines.forEach(function (timeline) {
          timeline.play(0);
        });
      } else {
        const timelineMap = new Map();
        steps.forEach(function (step, index) {
          timelineMap.set(step, timelines[index]);
        });

        const observer = new IntersectionObserver(function (entries, activeObserver) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            const timeline = timelineMap.get(entry.target);
            if (timeline) timeline.play(0);
            activeObserver.unobserve(entry.target);
          });
        }, { threshold: 0.16 });

        steps.forEach(function (step) {
          observer.observe(step);
        });
      }
    } else {
      window.addEventListener("load", function () {
        window.ScrollTrigger.refresh();
      }, { once: true });
    }

    if (canHover) {
      steps.forEach(function (step) {
        step.addEventListener("pointerenter", function () {
          gsap.to(step, {
            y: -5,
            scale: 1.008,
            boxShadow: "0 20px 42px rgba(74, 111, 165, 0.14)",
            duration: 0.32,
            ease: "power2.out",
            overwrite: "auto"
          });
        });

        step.addEventListener("pointerleave", function () {
          gsap.to(step, {
            y: 0,
            scale: 1,
            boxShadow: "0 16px 34px rgba(74, 111, 165, 0.08)",
            duration: 0.36,
            ease: "power2.out",
            overwrite: "auto"
          });
        });
      });
    }
  }

  function initWorksSlider() {
    const sliderElement = document.querySelector("[data-works-slider]");
    if (!sliderElement) return;

    const sliderShell = sliderElement.closest(".works-slider-shell");
    const nextButton = sliderShell ? sliderShell.querySelector(".works-next") : null;
    const previousButton = sliderShell ? sliderShell.querySelector(".works-prev") : null;
    const pagination = sliderElement.querySelector(".works-pagination");
    const currentNumber = sliderShell ? sliderShell.querySelector("[data-works-current]") : null;
    const totalNumber = sliderShell ? sliderShell.querySelector("[data-works-total]") : null;

    if (!window.Swiper) {
      if (sliderShell) sliderShell.classList.add("is-fallback");
      [nextButton, previousButton].forEach(function (button) {
        if (!button) return;
        button.disabled = true;
        button.setAttribute("aria-hidden", "true");
      });
      return;
    }

    function formatSlideNumber(value) {
      return String(value).padStart(2, "0");
    }

    function updateCounter(swiper) {
      if (currentNumber) currentNumber.textContent = formatSlideNumber(swiper.realIndex + 1);
      if (totalNumber) totalNumber.textContent = formatSlideNumber(swiper.slides.length);
    }

    function animateActiveSlide(swiper) {
      if (prefersReducedMotion || !window.gsap) return;

      const activeSlide = swiper.slides[swiper.activeIndex];
      if (!activeSlide) return;

      const image = activeSlide.querySelector("img");
      const content = activeSlide.querySelector(".work-content");
      const arrow = activeSlide.querySelector(".work-arrow");
      const viewLink = activeSlide.querySelector(".work-view");
      const targets = [image, content, arrow, viewLink].filter(Boolean);

      window.gsap.killTweensOf(targets);

      if (image) {
        window.gsap.fromTo(image, {
          scale: 1.045
        }, {
          scale: 1,
          duration: 0.78,
          ease: "power3.out",
          overwrite: "auto"
        });
      }

      if (content) {
        window.gsap.fromTo(content, {
          autoAlpha: 0.72,
          y: 12
        }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.62,
          delay: 0.04,
          ease: "power3.out",
          overwrite: "auto"
        });
      }

      if (arrow) {
        window.gsap.fromTo(arrow, {
          scale: 0.72,
          rotation: -18
        }, {
          scale: 1,
          rotation: 0,
          duration: 0.48,
          delay: 0.14,
          ease: "back.out(1.8)",
          overwrite: "auto"
        });
      }

      if (viewLink) {
        window.gsap.fromTo(viewLink, {
          autoAlpha: 0.4,
          y: 6
        }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.44,
          delay: 0.16,
          ease: "power2.out",
          overwrite: "auto"
        });
      }
    }

    new window.Swiper(sliderElement, {
      slidesPerView: "auto",
      spaceBetween: 22,
      speed: prefersReducedMotion ? 0 : 700,
      grabCursor: false,
      watchSlidesProgress: true,
      keyboard: {
        enabled: true,
        onlyInViewport: true
      },
      navigation: {
        nextEl: nextButton,
        prevEl: previousButton
      },
      pagination: {
        el: pagination,
        clickable: true
      },
      a11y: {
        enabled: true,
        containerRoleDescriptionMessage: "制作実績カルーセル",
        itemRoleDescriptionMessage: "制作実績",
        slideLabelMessage: "{{index}} / {{slidesLength}}",
        prevSlideMessage: "前の制作実績へ",
        nextSlideMessage: "次の制作実績へ",
        firstSlideMessage: "最初の制作実績です",
        lastSlideMessage: "最後の制作実績です",
        paginationBulletMessage: "制作実績 {{index}} へ移動"
      },
      breakpoints: {
        768: {
          spaceBetween: 26
        },
        1280: {
          spaceBetween: 30
        }
      },
      on: {
        init: function (swiper) {
          updateCounter(swiper);
          animateActiveSlide(swiper);
        },
        slideChangeTransitionStart: function (swiper) {
          updateCounter(swiper);
          animateActiveSlide(swiper);
        }
      }
    });
  }

  function initServiceAndWorksAnimation() {
    const serviceGrid = document.querySelector("[data-service-grid]");
    const worksList = document.querySelector("[data-works-list]");
    if ((!serviceGrid && !worksList) || prefersReducedMotion || !window.gsap) return;

    const gsap = window.gsap;
    const hasScrollTrigger = Boolean(window.ScrollTrigger);
    const canHover = window.matchMedia("(pointer: fine)").matches;

    if (hasScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }

    function createTimeline(trigger, start) {
      const options = {
        paused: !hasScrollTrigger,
        defaults: { ease: "power3.out" }
      };

      if (hasScrollTrigger) {
        options.scrollTrigger = {
          trigger: trigger,
          start: start,
          once: true,
          invalidateOnRefresh: true
        };
      }

      return gsap.timeline(options);
    }

    function playWithoutScrollTrigger(timeline, trigger, threshold) {
      if (hasScrollTrigger) return;

      if (!("IntersectionObserver" in window)) {
        timeline.play(0);
        return;
      }

      const observer = new IntersectionObserver(function (entries, activeObserver) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          timeline.play(0);
          activeObserver.disconnect();
        }
      }, { threshold: threshold });

      observer.observe(trigger);
    }

    if (serviceGrid) {
      const serviceCards = Array.from(serviceGrid.querySelectorAll("[data-service-card]"));

      gsap.set(serviceCards, {
        autoAlpha: 0,
        y: 58,
        scale: 0.94,
        rotationX: -7,
        transformOrigin: "50% 100%"
      });

      const serviceTimeline = createTimeline(serviceGrid, "top 80%");

      serviceCards.forEach(function (card, index) {
        const startAt = index * 0.2;
        const icon = card.querySelector(".service-icon");
        const number = card.querySelector(".service-number");
        const content = Array.from(card.children).filter(function (child) {
          return child.matches("h3, p, ul");
        });

        serviceTimeline.to(card, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotationX: 0,
          duration: 0.76
        }, startAt);

        if (icon) {
          serviceTimeline.fromTo(icon, {
            autoAlpha: 0,
            scale: 0.68,
            rotation: -9
          }, {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 0.64,
            ease: "back.out(1.55)"
          }, startAt + 0.1);
        }

        if (number) {
          serviceTimeline.fromTo(number, {
            autoAlpha: 0,
            scale: 0.3,
            rotation: 35
          }, {
            autoAlpha: 1,
            scale: 1,
            rotation: 0,
            duration: 0.58,
            ease: "back.out(1.9)"
          }, startAt + 0.14);
        }

        if (content.length) {
          serviceTimeline.fromTo(content, {
            autoAlpha: 0,
            y: 20
          }, {
            autoAlpha: 1,
            y: 0,
            duration: 0.52,
            stagger: 0.07
          }, startAt + 0.2);
        }

        if (canHover) {
          card.addEventListener("pointerenter", function () {
            gsap.to(card, {
              y: -10,
              scale: 1.015,
              boxShadow: "0 26px 54px rgba(74, 111, 165, 0.17)",
              duration: 0.34,
              ease: "power2.out",
              overwrite: "auto"
            });
            if (icon) gsap.to(icon, { scale: 1.035, rotation: 2, duration: 0.34, overwrite: "auto" });
          });

          card.addEventListener("pointerleave", function () {
            gsap.to(card, {
              y: 0,
              scale: 1,
              boxShadow: "0 16px 36px rgba(74, 111, 165, 0.08)",
              duration: 0.38,
              ease: "power2.out",
              overwrite: "auto"
            });
            if (icon) gsap.to(icon, { scale: 1, rotation: 0, duration: 0.38, overwrite: "auto" });
          });
        }
      });

      playWithoutScrollTrigger(serviceTimeline, serviceGrid, 0.14);
    }

    if (worksList) {
      const workCards = Array.from(worksList.querySelectorAll("[data-work-card]"));
      const sliderShell = worksList.closest(".works-slider-shell");

      if (sliderShell) {
        const worksTimeline = createTimeline(sliderShell, "top 84%");

        worksTimeline.fromTo(sliderShell, {
          autoAlpha: 0,
          y: 42,
          scale: 0.99
        }, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.88
        });

        playWithoutScrollTrigger(worksTimeline, sliderShell, 0.12);
      }

      workCards.forEach(function (card) {
        const image = card.querySelector("img");
        const arrow = card.querySelector(".work-arrow");
        const viewLink = card.querySelector(".work-view");

        if (canHover) {
          card.addEventListener("pointerenter", function () {
            gsap.to(card, {
              y: -6,
              scale: 1.004,
              boxShadow: "0 28px 58px rgba(74, 111, 165, 0.18)",
              duration: 0.34,
              ease: "power2.out",
              overwrite: "auto"
            });
            if (image) gsap.to(image, { scale: 1.04, duration: 0.55, ease: "power2.out", overwrite: "auto" });
            if (arrow) gsap.to(arrow, { scale: 1.08, rotation: 6, duration: 0.32, overwrite: "auto" });
            if (viewLink) gsap.to(viewLink, { x: -2, duration: 0.32, overwrite: "auto" });
          });

          card.addEventListener("pointerleave", function () {
            gsap.to(card, {
              y: 0,
              scale: 1,
              boxShadow: "0 18px 40px rgba(74, 111, 165, 0.09)",
              duration: 0.4,
              ease: "power2.out",
              overwrite: "auto"
            });
            if (image) gsap.to(image, { scale: 1, duration: 0.55, ease: "power2.out", overwrite: "auto" });
            if (arrow) gsap.to(arrow, { scale: 1, rotation: 0, duration: 0.36, overwrite: "auto" });
            if (viewLink) gsap.to(viewLink, { x: 0, duration: 0.36, overwrite: "auto" });
          });
        }
      });
    }

    if (hasScrollTrigger) {
      window.setTimeout(function () {
        window.ScrollTrigger.refresh();
      }, 0);
    }
  }

  function initContactAnimation() {
    const contact = document.querySelector("#contact");
    const reassurance = contact ? contact.querySelector("[data-contact-reassurance]") : null;
    const reassuranceItems = reassurance ? Array.from(reassurance.children) : [];
    const formWrap = contact ? contact.querySelector("[data-contact-form-wrap]") : null;
    if (!contact || !reassurance || !formWrap || prefersReducedMotion || !window.gsap || !window.ScrollTrigger) return;

    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: reassurance,
        start: "top 88%",
        once: true,
        invalidateOnRefresh: true
      }
    });

    timeline.from(reassuranceItems, {
      autoAlpha: 0,
      y: 18,
      duration: 0.56,
      stagger: 0.1,
      ease: "power3.out"
    });

    timeline.from(formWrap, {
      autoAlpha: 0,
      y: 38,
      scale: 0.985,
      duration: 0.86,
      ease: "power3.out"
    }, 0.18);
  }

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form || !window.fetch || !window.FormData) return;

    const status = form.querySelector("[data-form-status]");
    const submitButton = form.querySelector('button[type="submit"]');
    const submitLabel = form.querySelector("[data-submit-label]");
    const defaultLabel = submitLabel ? submitLabel.textContent : "送信する";

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
      }
      if (submitLabel) submitLabel.textContent = "送信中…";
      if (status) {
        status.classList.remove("is-success", "is-error");
        status.textContent = "フォームを送信しています。";
      }

      window.fetch(form.action, {
        method: "POST",
        body: new window.FormData(form),
        headers: { Accept: "application/json" }
      }).then(function (response) {
        if (!response.ok) throw new Error("Form submission failed");

        form.reset();
        if (status) {
          status.classList.add("is-success");
          status.textContent = "送信が完了しました。2営業日以内にご返信いたします。";
        }
      }).catch(function () {
        if (status) {
          status.classList.add("is-error");
          status.textContent = "送信できませんでした。時間をおいて再度お試しください。";
        }
      }).finally(function () {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
        if (submitLabel) submitLabel.textContent = defaultLabel;
      });
    });
  }

  function initSmoothHeaderOffset() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        const href = anchor.getAttribute("href");
        if (!href || href === "#") return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        if (target.tagName === "DETAILS") target.open = true;
        target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      });
    });
  }

  function scheduleWorksSlider() {
    const sliderElement = document.querySelector("[data-works-slider]");
    if (!sliderElement) return;

    let initialized = false;
    let observer = null;

    function initialize() {
      if (initialized) return;
      initialized = true;
      if (observer) observer.disconnect();

      loadSwiperAssets().catch(function () {
        return null;
      }).then(function () {
        initWorksSlider();
      });
    }

    if (!("IntersectionObserver" in window)) {
      initialize();
      return;
    }

    observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        initialize();
      }
    }, { rootMargin: "900px 0px", threshold: 0.01 });

    observer.observe(sliderElement);
  }

  function scheduleBelowFoldEnhancements() {
    function initialize() {
      initScrollReveal();
      initSectionTextReveal();
      initSectionTitleAnimation();
      initFlowAnimation();
      initServiceAndWorksAnimation();
      initContactAnimation();

      if (window.ScrollTrigger) {
        window.requestAnimationFrame(function () {
          window.ScrollTrigger.refresh();
        });
      }
    }

    function loadAndInitialize() {
      loadScrollTrigger().catch(function () {
        return null;
      }).then(initialize);
    }

    function schedule() {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadAndInitialize, { timeout: 1000 });
      } else {
        window.setTimeout(loadAndInitialize, 0);
      }
    }

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initOpening();
    initMobileMenu();
    initAdaptiveHeader();
    initBackToTop();
    initTiltCard();
    initCustomCursor();
    initParticleCanvas();
    initHeroKeyword();
    initHeroVisual();
    initHeroTextReveal();
    initContactForm();
    initSmoothHeaderOffset();
    scheduleWorksSlider();
    scheduleBelowFoldEnhancements();
  });
}());
