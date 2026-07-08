/* ============================================================
   Cercle Partenaire — Primo Gardex · Visualiseur 3D garde-corps
   Three.js (CDN via import map). Aucune autre librairie.

   - Construit un garde-corps simple : base béton + montants +
     main courante + panneaux de remplissage ajourés (motifs).
   - Rotation souris / doigt (OrbitControls), zoom limité, pas de pan.
   - Les 3 motifs (dossier Motifs/) sont traités dans un <canvas> :
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
];

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
function initViewer(root) {
  const stage    = root.querySelector('#gcStage');
  const loading  = root.querySelector('#gcLoading');
  const fallback = root.querySelector('#gcFallback');
  const hint     = root.querySelector('#gcHint');
  const motifBtns = Array.from(root.querySelectorAll('.gc-motif'));

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
    return; // pas de 3D
  }

  /* --- Renderer / scène / caméra --- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  renderer.domElement.classList.add('gc-canvas');
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(CREAM);

  const camera = new THREE.PerspectiveCamera(
    40, stage.clientWidth / stage.clientHeight, 0.1, 100);
  camera.position.set(2.4, 1.15, 3.3);

  /* --- Lumières douces --- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfd8cc, 0.85));
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  /* --- Contrôles --- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.3;
  controls.maxDistance = 5.5;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI * 0.52;   // ne passe pas sous le sol
  controls.target.set(0, 0.55, 0);
  controls.autoRotate = !prefersReduced;
  controls.autoRotateSpeed = 0.7;
  // Vertical = scroll page, horizontal = rotation (voir touch-action CSS)

  /* --- Construction du garde-corps --- */
  const group = new THREE.Group();
  scene.add(group);

  const BAYS = 3;
  const BAY_W = 1.15;
  const SPAN = BAYS * BAY_W;                 // largeur totale
  const RAIL_H = 1.0;                         // hauteur main courante
  const POST = 0.06;                          // section montant
  const BASE_H = 0.16;                        // hauteur base béton

  const metalMat = new THREE.MeshStandardMaterial({
    color: ANTHRACITE, roughness: 0.55, metalness: 0.35,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: CONCRETE, roughness: 0.95, metalness: 0.0,
  });

  // Base béton (sous le garde-corps)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(SPAN + 0.3, BASE_H, 0.24), concreteMat);
  base.position.set(0, -BASE_H / 2, 0);
  group.add(base);

  // Montants
  for (let i = 0; i <= BAYS; i++) {
    const x = -SPAN / 2 + i * BAY_W;
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(POST, RAIL_H, POST), metalMat);
    post.position.set(x, RAIL_H / 2, 0);
    group.add(post);
  }

  // Main courante
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(SPAN + 0.16, 0.05, 0.09), metalMat);
  rail.position.set(0, RAIL_H + 0.02, 0);
  group.add(rail);

  // Lisse basse (fin liseré au ras de la base)
  const kick = new THREE.Mesh(
    new THREE.BoxGeometry(SPAN, 0.04, 0.07), metalMat);
  kick.position.set(0, 0.05, 0);
  group.add(kick);

  // Panneaux de remplissage (plans) — reçoivent le motif
  const panelH = RAIL_H - 0.14;
  const panelMats = [];
  for (let i = 0; i < BAYS; i++) {
    const x = -SPAN / 2 + i * BAY_W + BAY_W / 2;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.5, metalness: 0.3,
      side: THREE.DoubleSide, transparent: true, alphaTest: 0.5,
    });
    panelMats.push(mat);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(BAY_W - POST * 0.5, panelH), mat);
    panel.position.set(x, 0.05 + panelH / 2, 0);
    group.add(panel);
  }

  // Ombre de contact
  const shadowTex = makeShadowTexture();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(SPAN + 1.0, 0.9),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -BASE_H - 0.001, 0);
  group.add(shadow);

  // Applique une texture de motif à tous les panneaux
  function applyMotif(tex) {
    const ratio = (BAY_W - POST * 0.5) / panelH;     // garde des cellules ~carrées
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
      motifBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    }).catch(() => { /* image manquante : on garde le motif courant */ });
  }
  motifBtns.forEach(btn => {
    btn.addEventListener('click', () => selectMotif(btn));
  });

  /* --- Chargement initial : motif par défaut (1er bouton) --- */
  const firstBtn = motifBtns[0];
  makePanelTexture(firstBtn.dataset.src).then(tex => {
    applyMotif(tex);
    firstBtn.setAttribute('aria-pressed', 'true');
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
    controls.dispose();
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    textureCache.forEach(t => t.dispose());
    textureCache.clear();
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
  window.addEventListener('pagehide', dispose, { once: true });
}

/* ============================================================
   Init différée : seulement quand la section entre à l'écran
   ============================================================ */
function boot() {
  const root = document.getElementById('gcViewer');
  if (!root) return;
  let started = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !started) {
        started = true;
        io.disconnect();
        initViewer(root);
      }
    });
  }, { rootMargin: '200px 0px' });
  io.observe(root);
}

if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);
