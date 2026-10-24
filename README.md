# SaveTheWorld

**Atterrir** — un jeu sur la collapsologie et les limites planétaires.

De 2025 à 2100, par tours de 5 ans, répartissez votre capital politique entre neuf politiques
(énergies bas-carbone, sobriété, protection sociale, forêts, agroécologie, pêche, économie circulaire,
solidarité…) pour faire entrer le monde dans le « donut » : sous le plafond écologique des neuf limites
planétaires, au-dessus du plancher social. Six régions, ressources finies (pétrole, métaux, poissons),
points de bascule climatiques aux seuils cachés et incertains.

## Lancer le jeu

Aucune installation : ouvrir `index.html` dans un navigateur (HTML, CSS et JS simples, sans build).
Seule la police Google Fonts est chargée en ligne ; sans réseau, des polices système la remplacent.

## Structure

- `index.html` : la page (structure et boîtes de dialogue)
- `css/style.css` : styles, thèmes clair et sombre, mise en page mobile
- `js/moteur.js` : moteur de simulation (modèle, leviers, événements), sans dépendance au DOM
- `js/carte.js` : contours simplifiés des régions pour la carte
- `js/interface.js` : interface (donut, onglets, dialogues, actions)

Les scripts se chargent dans cet ordre.

## Statut

Prototype. Les chiffres de départ sont des ordres de grandeur arrondis (~2024) et le modèle est
volontairement simplifié.
