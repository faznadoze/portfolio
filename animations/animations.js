/* ═══════════════════════════════════════════════
   ANIMATIONS — Apple-style high-performance
   Sem libs externas. Apenas APIs nativas do browser.
   Anima SOMENTE transform e opacity.
   ═══════════════════════════════════════════════ */

// ── TEXT REVEAL ───────────────────────────────
function initTextReveal() {
  const lines = document.querySelectorAll('.reveal-line');
  if (!lines.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '-40px 0px' });

  lines.forEach(line => observer.observe(line));
}

// ── PARALLAX ──────────────────────────────────
function initParallax() {
  const elements = document.querySelectorAll('[data-parallax]');
  if (!elements.length) return;

  const items = Array.from(elements).map(el => ({
    el,
    factor: parseFloat(el.getAttribute('data-parallax')) || 0.3
  }));

  window._parallaxUpdate = function () {
    items.forEach(({ el, factor }) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2);
      el.style.transform = `translateY(${offset * factor * -0.15}px)`;
    });
  };
}

// ── SCROLL SCRUBBING ──────────────────────────
function initScrollScrubbing() {
  const section = document.querySelector('.scrub-section');
  if (!section) return;

  const content = section.querySelector('.scrub-content');
  if (content) {
    const headings = content.querySelectorAll('h1, h2, h3');
    headings.forEach(heading => {
      const words = heading.textContent.trim().split(/\s+/);
      heading.innerHTML = words
        .map(w => `<span data-scrub-word>${w}</span>`)
        .join(' ');
    });
  }

  const words = section.querySelectorAll('[data-scrub-word]');

  window._scrubUpdate = function () {
    const rect = section.getBoundingClientRect();
    const sectionHeight = section.offsetHeight - window.innerHeight;
    if (sectionHeight <= 0) return;

    const progress = Math.max(0, Math.min(1, -rect.top / sectionHeight));

    words.forEach((word, i) => {
      const wordProgress = (progress - i * (0.8 / words.length)) / 0.4;
      word.style.opacity = 0.12 + Math.max(0, Math.min(1, wordProgress)) * 0.88;
    });
  };
}

// ── 3D TILT ───────────────────────────────────
function initTiltCards() {
  if (window.matchMedia('(max-width: 768px)').matches) return;

  const cards = document.querySelectorAll('[data-tilt]');
  if (!cards.length) return;

  const MAX_TILT = 10;

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const nx = (x / rect.width - 0.5) * 2;
      const ny = (y / rect.height - 0.5) * 2;

      const rotateX = -ny * MAX_TILT;
      const rotateY =  nx * MAX_TILT;

      card.style.setProperty('--tilt-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--tilt-y', `${(y / rect.height) * 100}%`);

      card.style.transition = 'transform 0.08s ease, box-shadow 0.3s ease';
      card.style.transform = `
        perspective(1000px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale3d(1.03, 1.03, 1.03)
      `;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease';
      card.style.transform = `
        perspective(1000px)
        rotateX(0deg)
        rotateY(0deg)
        scale3d(1, 1, 1)
      `;
    });
  });
}

// ── INICIALIZAÇÃO E RAF LOOP CENTRAL ──────────
document.addEventListener('DOMContentLoaded', () => {

  initTextReveal();
  initParallax();
  initScrollScrubbing();
  initTiltCards();

  function rafLoop() {
    if (typeof window._parallaxUpdate === 'function') {
      window._parallaxUpdate();
    }
    if (typeof window._scrubUpdate === 'function') {
      window._scrubUpdate();
    }
    requestAnimationFrame(rafLoop);
  }
  requestAnimationFrame(rafLoop);

});
