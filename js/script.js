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

    // Trois phases distinctes avec une petite zone d'ease aux seuils
    let phase = 1;
    if (progress > 0.62) phase = 3;
    else if (progress > 0.30) phase = 2;
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

/* ===== Mini-configurateur Primo Gardex (démonstratif) =====
   Pilote l'aperçu via des variables CSS et met à jour le résumé.
   Sort proprement si la section n'est pas présente. */
function initUfConfigurator() {
  const root = document.getElementById('ufConfigurator');
  if (!root) return;

  // Exemples de teintes RAL (nom + valeur approchée à l'écran)
  const COLORS = [
    { id: 'anthracite', name: 'Anthracite · RAL 7016', hex: '#383E42' },
    { id: 'noir',       name: 'Noir sablé · RAL 9005',  hex: '#14171A' },
    { id: 'quartz',     name: 'Gris quartz · RAL 7039', hex: '#6B6A65' },
    { id: 'blanc',      name: 'Blanc · RAL 9010',       hex: '#F1EDE4' },
    { id: 'bronze',     name: 'Bronze · RAL 8019',      hex: '#43302B' },
    { id: 'or',         name: 'Teinte au choix (RAL)',  hex: '#E4A52D' }
  ];
  const IMPL = {
    platines: { name: 'Sur platines', tag: 'sur platines' },
    beton:    { name: 'Scellement',   tag: 'scellement dalle' },
    muret:    { name: 'Sur muret',    tag: 'muret / acrotère' }
  };
  // 3 remplissages = 3 niveaux d'ajourage réels (le niveau dépend du dessin, pas d'un slider)
  const PATTERNS = {
    privacy:  { name: 'Occultant',    level: 'Dense' },
    balanced: { name: 'Semi-ajouré',  level: 'Intermédiaire' },
    open:     { name: 'Ajouré',       level: 'Plus ouvert' }
  };

  const fence       = root.querySelector('#ufFence');
  const swatches    = root.querySelector('#ufSwatches');
  const lengthInput = root.querySelector('#ufLength');
  const heightInput = root.querySelector('#ufHeight');

  // État simple, valeurs numériques pour les dimensions
  const state = {
    length:       +root.dataset.length || 6,        // m
    height:       +root.dataset.height || 1500,      // mm
    implantation: root.dataset.implantation || 'muret',
    pattern:      root.dataset.pattern || 'privacy',
    color:        root.dataset.color || 'anthracite'
  };

  const set = (sel, txt) => { const el = root.querySelector(sel); if (el) el.textContent = txt; };
  const fmtMm = (v) => v.toLocaleString('fr-FR') + ' mm';
  const colorById = (id) => COLORS.find(c => c.id === id) || COLORS[0];
  const luminance = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  // Remplit la piste du slider jusqu'au curseur
  const rangeFill = (input) => {
    if (!input) return;
    const pct = (input.value - input.min) / (input.max - input.min) * 100;
    input.style.setProperty('--uf-fill', pct + '%');
  };
  // Nombre de panneaux selon la longueur (taille de panneau stable)
  const panelsFor = (m) => (m <= 4 ? 2 : m <= 8 ? 3 : 4);

  // Génère les pastilles couleur
  if (swatches) COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'uf-cfg-swatch';
    btn.style.setProperty('--sw', c.hex);
    btn.dataset.value = c.id;
    btn.title = c.name;
    btn.setAttribute('aria-label', 'Couleur ' + c.name);
    btn.setAttribute('aria-pressed', String(c.id === state.color));
    swatches.appendChild(btn);
  });

  // (Re)construit la clôture avec N panneaux — la taille reste lisible, jamais minuscule
  let builtPanels = -1;
  function buildFence() {
    if (!fence) return;
    const panels = panelsFor(state.length);
    if (panels === builtPanels) return;
    builtPanels = panels;
    let html = '<span class="uf-cfg-post"></span>';
    for (let i = 0; i < panels; i++) html += '<div class="uf-cfg-panel"></div><span class="uf-cfg-post"></span>';
    fence.innerHTML = html;
  }

  // Applique l'état à l'aperçu (variables CSS) + au résumé court
  function render() {
    const col = colorById(state.color);
    const pat = PATTERNS[state.pattern] || PATTERNS.privacy;
    const impl = IMPL[state.implantation] || IMPL.muret;

    root.dataset.implantation = state.implantation;
    root.dataset.pattern = state.pattern;

    // Hauteur visuelle proportionnée : 900→1200 mm => 104→172 px
    const h = 104 + (state.height - 900) / 300 * 68;
    root.style.setProperty('--uf-panel-h', h.toFixed(0) + 'px');

    // Longueur illustrative : 2→12 m => largeur 52%→100% (panneaux jamais rapetissés)
    const lenW = 52 + (state.length - 2) / 10 * 48;
    root.style.setProperty('--uf-len-w', lenW.toFixed(0) + '%');

    root.style.setProperty('--uf-panel-color', col.hex);
    // Trous lisibles selon la teinte (simple contraste, aucune opacité réglable)
    root.style.setProperty('--uf-hole',
      luminance(col.hex) > 0.6 ? 'rgba(28,31,33,0.55)' : 'rgba(245,242,236,0.82)');

    buildFence();

    // Valeurs affichées
    set('#ufLengthOut', state.length + ' ml');
    set('#ufHeightOut', fmtMm(state.height));
    set('#ufColorOut', col.name);
    set('#ufCoteVal', state.length + ' ml');
    set('#ufPoseTag', impl.tag);

    // Résumé compact en chips
    set('#ufChipLen', state.length + ' ml');
    set('#ufChipHeight', fmtMm(state.height));
    set('#ufChipImpl', impl.name);
    set('#ufChipPattern', pat.name);
    set('#ufChipColor', col.name);
    const chipColor = root.querySelector('#ufChipColor');
    if (chipColor) chipColor.style.setProperty('--sw', col.hex);
  }

  // Sliders longueur / hauteur
  if (lengthInput) lengthInput.addEventListener('input', () => {
    state.length = +lengthInput.value; rangeFill(lengthInput); render();
  });
  if (heightInput) heightInput.addEventListener('input', () => {
    state.height = +heightInput.value; rangeFill(heightInput); render();
  });

  // Boutons de pose (cartes)
  const poseGroup = root.querySelector('.uf-cfg-poses');
  if (poseGroup) poseGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.uf-cfg-pose');
    if (!btn) return;
    poseGroup.querySelectorAll('.uf-cfg-pose').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    state.implantation = btn.dataset.value;
    render();
  });

  // Motifs (cartes) — chaque motif change réellement le dessin de perforation
  const motifGroup = root.querySelector('.uf-cfg-motifs');
  if (motifGroup) motifGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.uf-cfg-motif');
    if (!btn) return;
    motifGroup.querySelectorAll('.uf-cfg-motif').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    state.pattern = btn.dataset.value;
    render();
  });

  // Pastilles couleur
  if (swatches) swatches.addEventListener('click', (e) => {
    const btn = e.target.closest('.uf-cfg-swatch');
    if (!btn) return;
    swatches.querySelectorAll('.uf-cfg-swatch').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    state.color = btn.dataset.value;
    render();
  });

  // Synchronise l'état actif des cartes avec l'état initial (robustesse si data-* diffère du HTML)
  const syncPressed = (selector, val) =>
    root.querySelectorAll(selector).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === val)));
  syncPressed('.uf-cfg-pose', state.implantation);
  syncPressed('.uf-cfg-motif', state.pattern);

  rangeFill(lengthInput);
  rangeFill(heightInput);
  render();
}

if (document.readyState !== 'loading') initUfConfigurator();
else document.addEventListener('DOMContentLoaded', initUfConfigurator);
