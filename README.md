# Cercle Partenaire — Primo Gardex

Landing page « Cercle Partenaire » pour Primo Gardex (kits garde-corps sur mesure,
prêts à poser). Page statique, **sans aucune librairie**, en HTML / CSS / JS purs.

## Prévisualiser la page

Deux façons, au choix :

1. **Le plus simple** : double-cliquez sur `index.html` pour l'ouvrir dans votre
   navigateur.
2. **Recommandé (rechargement auto)** : dans Cursor / VS Code, installez
   l'extension **« Live Server »**, faites un clic droit sur `index.html` →
   *« Open with Live Server »*.

👉 Testez **en plein écran** puis **en fenêtre réduite** (ou l'inspecteur mobile,
touche F12) pour vérifier le responsive.

## Arborescence

```
index.html          → la page (structure + contenu)
css/styles.css      → tout le style (design system + charte Primo Gardex)
js/script.js        → animations & configurateur (aucune dépendance)
images/             → logo (fourni) + vos photos (voir IMAGES.md)
IMAGES.md           → liste des images attendues (noms + dimensions)
README.md           → ce fichier
```

C'est un site **100 % statique** : pas de build, pas de dépendance à installer.

## Où est quoi (dans `index.html`)

La page suit cet ordre de sections (chacune est balisée par un commentaire
`<!-- ===== NOM ===== -->` dans le HTML) :

1. **Hero** — accroche + 2 photos + CTA « Mon compte Primo Gardex »
2. **Primo Gardex, concrètement** — le produit + 3 piliers
3. **Vos avantages partenaires** — les 6 leviers (dont la remise 15 %)
4. **Configurateur** — aperçu interactif (longueur, hauteur, pose, remplissage, RAL)
5. **Motifs & remplissages** — 4 vignettes SVG
6. **Frise / délai** — parcours projet (production ≈ 3 semaines)
7. **Origine du programme** — pourquoi le Cercle Partenaire
8. **Réalisations** — mosaïque de cas d'usage
9. **Conditions** — 3 étapes animées au scroll
10. **CTA final** — « Mon compte Primo Gardex »

### Zones réservées DSI
`<div id="dsi-topbar">` (en haut) et `<footer id="dsi-footer">` (en bas) sont
**laissés vides volontairement** : le header et le footer du vrai site Primo
Gardex y seront injectés par la DSI.

## Remplacer les images
Voir **`IMAGES.md`** : déposez vos fichiers dans `images/` avec les noms exacts
indiqués, la page les affiche automatiquement.

## Charte & choix techniques
- **Couleurs** : or `#E4A52D` / or clair `#FFC349` / or foncé `#C4881B` (accents),
  noir `#1A1A1A`, crème `#FAF6EE`, blanc.
- **Règle de contraste** : les boutons principaux sont **noir + texte blanc**
  (l'or reste un accent) ; les aplats or portent toujours du **texte noir** ;
  les petits textes accent utilisent un **bronze** foncé pour rester lisibles
  (jamais de texte blanc sur or).
- **Polices** : Poppins (titres) + Inter (corps), chargées via Google Fonts.
- **Accessibilité** : focus clavier visible, `prefers-reduced-motion` respecté,
  textes alternatifs sur les images.

## Liens en dur (à vérifier)
- CTA compte → `https://primo-gardex.com/mon-compte/`
- CTA configurateur → `https://primo-gardex.com/configurateur/`

## À compléter (placeholders `[…]`)
Cherchez les mentions `[à valider côté métier]`, `[à valider]` et `[à confirmer]`
dans `index.html` : ce sont les points à faire valider avant mise en ligne
(normes de sécurité, avantages du programme, interlocuteur dédié…).

## Déploiement (GitHub + Vercel)

Le projet est hébergé sur GitHub et déployé automatiquement via **Vercel**.

### Mise à jour du site
Chaque `git push` sur la branche `main` déclenche un **redéploiement automatique**
sur Vercel (aucune commande à lancer). Workflow habituel :

```bash
git add .
git commit -m "Décrivez votre modification"
git push
```

### Première connexion à Vercel (à faire une fois)
1. Allez sur [vercel.com](https://vercel.com) → connectez-vous **avec GitHub**.
2. *Add New… → Project* → importez le dépôt **landing-primo-gardex**.
3. Framework Preset : **Other** (site statique) — laissez les réglages par défaut
   (pas de build command, output = racine du projet).
4. *Deploy*. Vercel fournit une URL de preview, puis l'URL de production.

> Chaque branche / pull request obtient aussi une **URL de preview** dédiée,
> pratique pour faire valider une version avant de la publier.
