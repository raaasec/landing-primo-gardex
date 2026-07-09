/* ============================================================
   Cercle Partenaire — Primo Gardex · Visualiseur 3D garde-corps
   Three.js (CDN via import map). Aucune autre librairie.

   - Construit un garde-corps simple : base béton + montants +
     main courante + panneaux de remplissage ajourés (motifs).
   - Rotation souris / doigt (OrbitControls), zoom limité, pas de pan.
   - Les motifs (dossier Motifs/) sont traités dans un <canvas> :
     la tôle devient un anthracite plat (opaque), les trous (blanc)
     deviennent transparents => vraies perforations. Le filigrane,
     posé sur la tôle, disparaît ; sur les trous il est atténué.
   - Init seulement quand la section entre à l'écran ; boucle stoppée
     hors écran ; dispose() propre ; fallback si WebGL indisponible.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* --- Motifs : ordre = ordre des boutons (Atlantide par défaut) --- */
const MOTIFS = [
  { name: 'Atlantide', src: 'Motifs/SPM20033-ATLANTIDE-par-Dampere.jpg' },
  { name: 'Aréthusa',  src: 'Motifs/SPM20045-ARETHUSA-par-Dampere.jpg' },
  { name: 'Lanixit',   src: 'Motifs/SPM20090-LANIXIT-par-Dampere.jpg' },
  { name: 'Archipel',  src: 'Motifs/ARCHIPEL-par-Dampere.jpg' },
];

/* Dernier motif choisi : survit à un remontage (contexte perdu, retour bfcache)
   pour ne pas ramener l'utilisateur sur Atlantide sans raison. */
let lastMotifSrc = null;

/* --- Charte --- */
const ANTHRACITE = 0x2f3436;   // tôle garde-corps
const CONCRETE   = 0xcac6bd;   // base béton gris clair
const CREAM      = 0xFAF6EE;   // fond (crème charte)

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   Traitement d'un motif -> texture RGBA ajourée + anthracite plat
   ============================================================ */
const textureCache = new Map();

function makePanelTexture(src) {
  if (textureCache.has(src)) return Promise.resolve(textureCache.get(src));

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let tex;
      try {
        const w = img.naturalWidth, h = img.naturalHeight;
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // getImageData lève une SecurityError si la page est en file://
        // (canvas « tainted ») -> on tombe alors dans le catch ci-dessous.
        const data = ctx.getImageData(0, 0, w, h);
        const px = data.data;
        // Couleur plate de la tôle (anthracite)
        const ar = (ANTHRACITE >> 16) & 255;
        const ag = (ANTHRACITE >> 8) & 255;
        const ab = ANTHRACITE & 255;
        // Seuils de perforation (smoothstep sur la luminance)
        const LO = 0.42, HI = 0.72;

        for (let i = 0; i < px.length; i += 4) {
          const L = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          // t=0 -> tôle (opaque) ; t=1 -> trou (transparent)
          let t = (L - LO) / (HI - LO);
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          t = t * t * (3 - 2 * t);        // smoothstep -> bords doux, filigrane atténué
          // Toute la tôle prend la teinte plate : le filigrane sur tôle disparaît.
          px[i] = ar; px[i + 1] = ag; px[i + 2] = ab;
          px[i + 3] = Math.round((1 - t) * 255);
        }
        ctx.putImageData(data, 0, 0);

        tex = new THREE.CanvasTexture(cv);
      } catch (err) {
        // Repli : motif affiché sans ajourage (pas de perforation) mais rien ne bloque.
        console.warn('[viewer3d] Traitement du motif impossible — page ouverte en local (file://) ?' +
          ' Utilisez un serveur local (Live Server) pour les perforations.', err);
        tex = new THREE.Texture(img);
        tex.needsUpdate = true;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      textureCache.set(src, tex);
      resolve(tex);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/* ============================================================
   Ombre de contact douce (canvas radial) — pose le modèle au sol
   ============================================================ */
function makeShadowTexture() {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(40,36,30,0.30)');
  g.addColorStop(0.6, 'rgba(40,36,30,0.12)');
  g.addColorStop(1, 'rgba(40,36,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ============================================================
   Visualiseur
   ============================================================ */
function initViewer(root, hooks = {}) {
  const stage    = root.querySelector('#gcStage');
  const loading  = root.querySelector('#gcLoading');
  const fallback = root.querySelector('#gcFallback');
  const hint     = root.querySelector('#gcHint');
  const motifBtns = Array.from(root.querySelectorAll('.gc-motif'));

  // Remontage possible : on repart toujours de l'état « chargement ».
  window.__gcReady = false;
  if (loading) { loading.textContent = 'Chargement du modèle 3D…'; loading.hidden = false; }
  if (hint) hint.hidden = false;
  if (fallback) fallback.hidden = true;

  /* --- Détection WebGL : sinon repli propre --- */
  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  if (!webglAvailable()) {
    window.__gcReady = true;
    if (loading) loading.hidden = true;
    if (hint) hint.hidden = true;
    if (fallback) fallback.hidden = false;
    motifBtns.forEach(b => { b.disabled = true; b.setAttribute('aria-disabled', 'true'); });
    return { dispose() {}, webgl: false }; // pas de 3D
  }
  motifBtns.forEach(b => { b.disabled = false; b.removeAttribute('aria-disabled'); });

  /* --- Renderer / scène / caméra --- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.classList.add('gc-canvas');
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.appendChild(renderer.domElement);

  /* --- Perte du contexte WebGL (pression GPU, veille, onglet en arrière-plan) ---
     Sans preventDefault, le navigateur ne tente jamais de restaurer le contexte
     et le canvas reste figé jusqu'au rechargement de la page. */
  const canvasEl = renderer.domElement;
  function onContextLost(e) {
    e.preventDefault();
    stop();
    if (hooks.onLost) hooks.onLost();
  }
  function onContextRestored() {
    if (hooks.onRestored) hooks.onRestored();
  }
  canvasEl.addEventListener('webglcontextlost', onContextLost, false);
  canvasEl.addEventListener('webglcontextrestored', onContextRestored, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CREAM);

  const camera = new THREE.PerspectiveCamera(
    40, stage.clientWidth / stage.clientHeight, 0.1, 100);
  camera.position.set(2.1, 1.7, 4.3);   // vue frontale légèrement 3/4, plongeante sur le balcon

  /* --- Lumières : ciel doux + clé chaude (ombres) + remplissage froid --- */
  scene.add(new THREE.HemisphereLight(0xf3efe6, 0xcbc5b9, 0.9));
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const key = new THREE.DirectionalLight(0xfff2df, 1.4);
  key.position.set(3.6, 5.6, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = -3.6; key.shadow.camera.right = 3.6;
  key.shadow.camera.top = 3.6;  key.shadow.camera.bottom = -2;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 5;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdde6f0, 0.42);
  fill.position.set(-3.2, 2.2, 1.5);
  scene.add(fill);

  /* --- Contrôles --- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.0;
  controls.maxDistance = 7.0;
  controls.minPolarAngle = 0.42;
  controls.maxPolarAngle = Math.PI * 0.49;   // reste au-dessus du sol du balcon
  controls.target.set(0, 0.55, -0.15);
  controls.autoRotate = !prefersReduced;
  controls.autoRotateSpeed = 0.45;
  // Vertical = scroll page, horizontal = rotation (voir touch-action CSS)

  /* --- Construction du garde-corps de balcon d'angle (façade + retour latéral) --- */
  const group = new THREE.Group();
  scene.add(group);

  const BAY = 1.05;
  const FRONT_BAYS = 3;               // façade
  const SIDE_BAYS = 2;                // retour latéral (angle)
  const SPANX = FRONT_BAYS * BAY;     // ≈ 3.15
  const SPANZ = SIDE_BAYS * BAY;      // ≈ 2.10
  const RAIL_H = 1.02;                // hauteur garde-corps (norme balcon)
  const POST = 0.05;                  // montant élancé
  const SLAB_H = 0.22;
  const hx = SPANX / 2;               // demi-façade
  const frontZ = SPANZ / 2;           // bord avant (l'angle est en +x / +z)

  const metalMat = new THREE.MeshStandardMaterial({
    color: ANTHRACITE, roughness: 0.42, metalness: 0.55,
  });
  const slabMat = new THREE.MeshStandardMaterial({
    color: CONCRETE, roughness: 0.96, metalness: 0.0,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xe8e2d6, roughness: 0.9, metalness: 0.0,
  });

  // Dalle du balcon (couvre tout l'angle) + sol chaud qui reçoit les ombres
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(SPANX + 0.4, SLAB_H, SPANZ + 0.4), slabMat);
  slab.position.set(0, -SLAB_H / 2, 0);
  slab.receiveShadow = true;
  group.add(slab);
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(SPANX + 0.4, SPANZ + 0.4), deckMat);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.002, 0);
  deck.receiveShadow = true;
  group.add(deck);

  // Panneaux ajourés
  const panelTop = RAIL_H - 0.06;
  const panelBottom = 0.11;
  const panelH = panelTop - panelBottom;
  const panelW = BAY - POST;
  const panelMats = [];

  function addPost(x, z) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(POST, RAIL_H, POST), metalMat);
    p.position.set(x, RAIL_H / 2, z);
    p.castShadow = true;
    group.add(p);
  }
  function addPanel(x, z, alongZ) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.45, metalness: 0.4,
      side: THREE.DoubleSide, transparent: true, alphaTest: 0.5,
    });
    panelMats.push(mat);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), mat);
    panel.position.set(x, panelBottom + panelH / 2, z);
    if (alongZ) panel.rotation.y = Math.PI / 2;   // panneau du retour : face vers +X
    group.add(panel);
  }

  // FAÇADE — le long de X, au bord avant (z = frontZ)
  for (let i = 0; i <= FRONT_BAYS; i++) addPost(-hx + i * BAY, frontZ);
  for (let i = 0; i < FRONT_BAYS; i++) addPanel(-hx + i * BAY + BAY / 2, frontZ - 0.012, false);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(SPANX + 0.06, 0.06, 0.13), metalMat);
  rail.position.set(0, RAIL_H + 0.005, frontZ + 0.012);
  rail.castShadow = true; group.add(rail);
  const kick = new THREE.Mesh(new THREE.BoxGeometry(SPANX, 0.05, 0.09), metalMat);
  kick.position.set(0, 0.075, frontZ);
  kick.castShadow = true; group.add(kick);

  // RETOURS LATÉRAUX — le long de Z, aux DEUX bords (x = ±hx) : effet balcon en U
  for (const sx of [hx, -hx]) {
    const off = 0.012 * Math.sign(sx);
    for (let j = 1; j <= SIDE_BAYS; j++) addPost(sx, frontZ - j * BAY);   // j=0 = poteau d'angle déjà posé
    for (let j = 0; j < SIDE_BAYS; j++) addPanel(sx + off, frontZ - j * BAY - BAY / 2, true);
    const rS = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, SPANZ + 0.06), metalMat);
    rS.position.set(sx + off, RAIL_H + 0.005, frontZ - SPANZ / 2);
    rS.castShadow = true; group.add(rS);
    const kS = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, SPANZ), metalMat);
    kS.position.set(sx, 0.075, frontZ - SPANZ / 2);
    kS.castShadow = true; group.add(kS);
  }

  // Applique une texture de motif à tous les panneaux (façade + retours)
  function applyMotif(tex) {
    const ratio = panelW / panelH;     // garde des cellules ~carrées
    tex.repeat.set(ratio, 1);
    panelMats.forEach(m => { m.map = tex; m.needsUpdate = true; });
  }

  /* --- Boucle d'animation (pilotée par la visibilité) --- */
  let rafId = 0, running = false;
  function frame() {
    rafId = requestAnimationFrame(frame);
    controls.update();
    renderer.render(scene, camera);
  }
  function start() { if (!running) { running = true; frame(); } }
  function stop() { if (running) { running = false; cancelAnimationFrame(rafId); } }

  /* --- Redimensionnement --- */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  /* --- Sélection des motifs --- */
  function selectMotif(btn) {
    const src = btn.dataset.src;
    makePanelTexture(src).then(tex => {
      applyMotif(tex);
      lastMotifSrc = src;
      motifBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    }).catch(() => { /* image manquante : on garde le motif courant */ });
  }
  motifBtns.forEach(btn => {
    btn.addEventListener('click', () => selectMotif(btn));
  });

  /* --- Chargement initial : motif retenu, sinon 1er bouton --- */
  const initialBtn =
    motifBtns.find(b => b.dataset.src === lastMotifSrc) || motifBtns[0];
  makePanelTexture(initialBtn.dataset.src).then(tex => {
    applyMotif(tex);
    lastMotifSrc = initialBtn.dataset.src;
    motifBtns.forEach(b => b.setAttribute('aria-pressed', String(b === initialBtn)));
    window.__gcReady = true;
    if (loading) loading.hidden = true;
    renderer.render(scene, camera);
    if (stageVisible) start();
  }).catch(() => {
    window.__gcReady = true;
    if (loading) loading.textContent = 'Modèle indisponible.';
  });

  /* --- Boucle stoppée hors écran (perf) --- */
  let stageVisible = false;
  const runObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      stageVisible = e.isIntersecting;
      if (stageVisible) start(); else stop();
    });
  }, { threshold: 0.05 });
  runObserver.observe(stage);

  /* --- Dispose propre --- */
  function dispose() {
    stop();
    ro.disconnect();
    runObserver.disconnect();
    canvasEl.removeEventListener('webglcontextlost', onContextLost);
    canvasEl.removeEventListener('webglcontextrestored', onContextRestored);
    controls.dispose();
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    // Le cache est global : le vider, sinon un remontage réutiliserait des
    // textures détruites (liées au contexte WebGL perdu).
    textureCache.forEach(t => t.dispose());
    textureCache.clear();
    // Sur contexte perdu, ces appels peuvent lever : le démontage doit aboutir.
    try { renderer.dispose(); } catch (e) { /* contexte déjà mort */ }
    if (canvasEl.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    window.__gcReady = false;
  }

  return { dispose, webgl: true };
}

/* ============================================================
   Init différée : seulement quand la section entre à l'écran
   ============================================================ */
function boot() {
  const root = document.getElementById('gcViewer');
  if (!root) return;

  const reloadBtn = root.querySelector('#gcReload');
  let instance = null;
  let mounted  = false;

  const showReload = (show) => { if (reloadBtn) reloadBtn.hidden = !show; };

  function unmount() {
    if (instance) {
      try { instance.dispose(); } catch (e) { /* démontage best-effort */ }
      instance = null;
    }
    mounted = false;
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    showReload(false);
    instance = initViewer(root, {
      // Contexte perdu : on propose le remontage manuel si le navigateur
      // ne restaure pas de lui-même.
      onLost: () => showReload(true),
      onRestored: () => remount(),
    });
  }

  function remount() { unmount(); mount(); }

  if (reloadBtn) reloadBtn.addEventListener('click', remount);

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !mounted) {
        io.disconnect();
        mount();
      }
    });
  }, { rootMargin: '200px 0px' });
  io.observe(root);

  /* --- bfcache ---
     pagehide.persisted = la page est mise en cache (bouton Précédent), pas
     déchargée : la détruire la laisserait vide au retour, sans moyen de la
     relancer. On ne libère que sur un vrai déchargement. Au retour, si le
     canvas a disparu malgré tout, on remonte. */
  window.addEventListener('pagehide', (e) => { if (!e.persisted) unmount(); });
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    if (mounted && !root.querySelector('.gc-canvas')) remount();
  });
}

if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);
