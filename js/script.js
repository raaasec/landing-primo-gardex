/* ============================================================
   Cercle Partenaire — Primo Gardex · Interactions
   - Apparition au scroll (reveal)
   - Mini-configurateur garde-corps (aperçu piloté par variables CSS)
   - Pile d'étapes pilotée au scroll (conditions)
   Aucune librairie externe.
   ============================================================ */

/* ===== Apparition au scroll, avec repli si déjà visible ===== */
const reveals = document.querySelectorAll('.reveal');
function revealNow(el) { el.classList.add('in-view'); }
function revealVisible() {
  reveals.forEach(el => {
    if (el.classList.contains('in-view')) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) revealNow(el);
  });
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { revealNow(e.target); observer.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  reveals.forEach(el => observer.observe(el));
  requestAnimationFrame(revealVisible);
  setTimeout(revealVisible, 1200);
} else {
  reveals.forEach(revealNow);
}

/* ===== Cartes "flip" : clic tactile + clavier ===== */
const supportsHover = window.matchMedia('(hover: hover)').matches;
const flipCards = document.querySelectorAll('.benefit-flip');
flipCards.forEach(card => {
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-pressed', 'false');

  const toggleFlip = (e) => {
    if (e.target.tagName === 'A') return;
    if (e.type === 'touchend') e.preventDefault();
    const wasFlipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', wasFlipped ? 'true' : 'false');
  };
  card.addEventListener('touchend', toggleFlip, { passive: false });
  card.addEventListener('click', (e) => { if (!supportsHover) toggleFlip(e); });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFlip(e); }
  });
});

/* ===== Process / étapes — transitions de phase pilotées au scroll ===== */
(function () {
  const scrollEl = document.getElementById('processScroll');
  const stack    = document.getElementById('stepsStack');
  const fill     = document.getElementById('stepsProgressFill');
  const items    = document.querySelectorAll('.steps-progress-item');
  if (!scrollEl || !stack) return;

  // Sur mobile, pas d'effet "pinned" : les cartes s'affichent en pile statique
  const mql = window.matchMedia('(max-width: 760px)');

  let raf = 0;
  function update() {
    raf = 0;
    if (mql.matches) return;

    const rect = scrollEl.getBoundingClientRect();
    const total = scrollEl.offsetHeight - window.innerHeight;
    const scrolled = Math.max(0, Math.min(total, -rect.top));
    const progress = total > 0 ? scrolled / total : 0;

    // Trois phases : seuils calés pour occuper toute la runway (pas de scroll mort en fin)
    let phase = 1;
    if (progress > 0.70) phase = 3;
    else if (progress > 0.34) phase = 2;
    stack.dataset.phase = phase;

    // Hauteur de la barre de progression — 0%, ~50%, 100%
    if (fill) {
      const target = phase === 3 ? 100 : phase === 2 ? 50 : 0;
      fill.style.height = target + '%';
    }

    items.forEach(it => {
      it.dataset.active = (parseInt(it.dataset.step) === phase) ? 'true' : 'false';
    });
  }
  function onScroll() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  // Cliquer sur une étape amène à la position de scroll correspondante
  items.forEach(it => {
    it.addEventListener('click', () => {
      if (mql.matches) return;
      const step = parseInt(it.dataset.step);
      const total = scrollEl.offsetHeight - window.innerHeight;
      const target = step === 1 ? 0.05 : step === 2 ? 0.45 : 0.85;
      const top = scrollEl.offsetTop + total * target;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  function applyMobileFallback() {
    if (mql.matches) {
      stack.removeAttribute('data-phase');
      items.forEach(it => it.dataset.active = 'true');
      if (fill) fill.style.height = '100%';
    } else {
      update();
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', applyMobileFallback);
  if (mql.addEventListener) mql.addEventListener('change', applyMobileFallback);
  applyMobileFallback();
})();
