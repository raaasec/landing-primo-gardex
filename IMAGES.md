# Images — Cercle Partenaire · Primo Gardex

Toutes les photos sont pour l'instant des **placeholders** (générés à la volée par
`placehold.co` aux couleurs de la charte). Pour utiliser vos vraies photos :
déposez un fichier portant **exactement le nom indiqué** dans le dossier `images/`.
La page l'affichera automatiquement (le placeholder ne sert que de repli si le
fichier est absent, via l'attribut `onerror`).

> Astuce format : privilégiez le **JPG** (ou WebP) optimisé, < 400 Ko par image.
> Respectez le ratio indiqué pour éviter les déformations (les images sont
> recadrées en `object-fit: cover`).

| Fichier attendu | Section | Contenu attendu | Format / ratio | Dimensions conseillées |
|---|---|---|---|---|
| `logo-primo-gardex.png` | Partout | **Logo Primo Gardex** (noir + or, fond blanc/transparent). *Déjà fourni.* | carré | ≈ 600×600 px |
| `hero-balcon.jpg` | Hero | Garde-corps de balcon en situation, remplissage tôle perforée | portrait 4/5 | ≈ 1200×1500 px |
| `hero-detail.jpg` | Hero (incrustation) | Détail de fixation sur platines / main courante | portrait 3/4 | ≈ 600×800 px |
| `contexte-terrasse.jpg` | Primo Gardex concrètement | Garde-corps de terrasse thermolaqué | paysage | ≈ 900×640 px |
| `contexte-detail.jpg` | Primo Gardex concrètement (incrustation) | Détail d'un remplissage perforé | carré | ≈ 420×420 px |
| `frise-chantier.jpg` | Frise / délai (fin) | Pose d'un garde-corps sur chantier | paysage large | ≈ 1600×700 px |
| `origine-programme.jpg` | Origine du programme | Garde-corps en situation, ambiance premium | portrait 5/6 | ≈ 1000×1200 px |
| `rea-balcon.jpg` | Réalisations (large) | Garde-corps de balcon | paysage | ≈ 1200×800 px |
| `rea-terrasse.jpg` | Réalisations | Garde-corps de terrasse | portrait | ≈ 600×800 px |
| `rea-escalier.jpg` | Réalisations | Rampe / garde-corps d'escalier | portrait | ≈ 600×800 px |
| `rea-mezzanine.jpg` | Réalisations | Garde-corps de mezzanine | portrait | ≈ 600×800 px |
| `rea-palier.jpg` | Réalisations | Garde-corps de palier d'étage | portrait | ≈ 600×800 px |
| `rea-coursive.jpg` | Réalisations (large) | Coursive / bâtiment collectif · ERP | paysage | ≈ 1200×800 px |
| `cta-fond.jpg` | CTA final (fond) | Garde-corps en situation, plan large (sera assombri) | paysage large | ≈ 1600×900 px |

## Motifs de remplissage (section « Motifs »)
Les 4 vignettes de motifs (**Tocima, Octopus, Agostine Magma, Artefact**) sont
dessinées en **SVG directement dans le HTML** — ce ne sont pas des images à fournir.
Pour les remplacer par de vraies photos de tôle perforée, dites-le-moi : je
transformerai les `<article class="uf-render-card">` de la section `#motifs`.

## Couleurs des placeholders (rappel charte)
- Fond noir `#1A1A1A` + texte or vif `#FFC349`
- Fond or foncé `#C4881B` + texte crème `#FAF6EE`
