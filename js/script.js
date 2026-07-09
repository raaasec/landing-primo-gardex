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

    // Trois phases réparties sur toute la course. La carte 03 apparaît à 76% :
    // il reste juste de quoi la lire avant de sortir, sans scroll mort.
    let phase = 1;
    if (progress > 0.76) phase = 3;
    else if (progress > 0.38) phase = 2;
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

/* ===== Carrousels mobiles — points de pagination (dots) =====
   Sous chaque slider horizontal : une rangée de points synchronisés au scroll.
   Clic + flèches clavier pour naviguer. Masqués sur desktop (CSS).
   Aucune modification du HTML source : les dots sont créés ici. */
(function () {
  const SLIDERS = [
    { grid: '.ctx2-cards',        item: '.ctx2-card',    label: 'cartes de présentation' },
    { grid: '.tppme-grid',        item: '.tppme-item',   label: 'avantages' },
    { grid: '.uf-renders-grid',   item: '.uf-render-card', label: 'motifs' },
    { grid: '.realisations-grid', item: '.real-card',    label: 'réalisations' }
  ];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  SLIDERS.forEach(cfg => {
    const grid = document.querySelector(cfg.grid);
    if (!grid) return;
    const cards = Array.prototype.slice.call(grid.querySelectorAll(':scope > ' + cfg.item));
    if (cards.length < 2) return;

    // Conteneur de points
    const dots = document.createElement('div');
    dots.className = 'slider-dots';
    dots.setAttribute('role', 'group');
    dots.setAttribute('aria-label', 'Pagination : ' + cfg.label);

    let current = -1;

    // Centre la carte i dans le slider (respecte prefers-reduced-motion)
    function scrollToCard(i) {
      const sRect = grid.getBoundingClientRect();
      const cRect = cards[i].getBoundingClientRect();
      const delta = (cRect.left + cRect.width / 2) - (sRect.left + sRect.width / 2);
      grid.scrollTo({ left: grid.scrollLeft + delta, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    const buttons = cards.map((card, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slider-dot';
      b.setAttribute('aria-label', 'Aller à l’élément ' + (i + 1) + ' sur ' + cards.length);
      b.addEventListener('click', () => scrollToCard(i));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const n = Math.max(0, Math.min(cards.length - 1, current + (e.key === 'ArrowRight' ? 1 : -1)));
        scrollToCard(n);
        buttons[n].focus();
      });
      dots.appendChild(b);
      return b;
    });

    grid.insertAdjacentElement('afterend', dots);

    function setActive(i) {
      if (i === current) return;
      current = i;
      buttons.forEach((b, k) => {
        if (k === i) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }

    // Index de la carte la plus proche du centre du slider
    function activeIndex() {
      const sRect = grid.getBoundingClientRect();
      const sCenter = sRect.left + sRect.width / 2;
      let best = 0, bestDist = Infinity;
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs((r.left + r.width / 2) - sCenter);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    let raf = 0;
    function sync() {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; setActive(activeIndex()); });
    }
    grid.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    setActive(0);
  });
})();
