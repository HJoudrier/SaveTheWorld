# SaveTheWorld

**Atterrir** — un jeu sur la collapsologie et les limites planétaires.

De 2025 à 2100, guidez le monde vers le « donut » : sous le plafond écologique des neuf limites
planétaires, au-dessus du plancher social. Le temps s'écoule **en continu** et vous réglez neuf
politiques (énergies bas-carbone, sobriété, protection sociale, forêts, agroécologie, pêche,
économie circulaire, solidarité…) pendant que le monde évolue : six régions, ressources finies
(pétrole, métaux, poissons), points de bascule climatiques aux seuils cachés et incertains.

## Lancer le jeu

Aucune installation : ouvrir `index.html` dans un navigateur (HTML, CSS et JS simples, sans build).
Seule la police Google Fonts est chargée en ligne ; sans réseau, des polices système la remplacent.

## Le temps

- À vitesse ×1, **une minute vaut une année** (la partie complète dure 75 minutes).
- Vitesses : ×1, ×2, ×5, ×15, ×60. Barre d'espace : lecture / pause.
- Les valeurs affichées évoluent de façon continue ; les événements sont datés au mois près.
- « Pause sur événement grave » (activée par défaut) arrête le temps quand un événement majeur survient.
- Chaque politique peut monter d'un niveau tous les 5 ans et baisser à tout moment. Le capital politique
  baisse avec les guerres et les crises ; s'il manque pendant deux ans, une politique est abandonnée.
- La partie est sauvegardée dans le navigateur.

## Ce que vous suivez

- **Événements** : liste des événements mondiaux (climat, guerres, famines, épidémies, révoltes et
  révolutions, économie, ressources, points de bascule) avec filtres, victimes estimées et ce qui est en cours.
- **Société** : inégalités (Gini), démocratie, tensions, stabilité et bilan humain, par région et dans le temps.
- **Population** : population mondiale, réfugiés climatiques, déplacés par la guerre et la faim, carte des flux
  migratoires entre régions, courbes à la manière de World3 (population, production, nourriture, ressources,
  pollution, stabilité en indice 100) et population empilée par région.
- **Politiques**, **Régions** (carte), **Ressources**, **Sphères** (système Terre et points de bascule).

## Structure

- `index.html` : la page (structure et boîtes de dialogue)
- `css/style.css` : styles, thèmes clair et sombre, mise en page mobile
- `js/moteur.js` : moteur de simulation (climat, énergie, ressources, événements), sans dépendance au DOM
- `js/societe.js` : module société (inégalités, démocratie, tensions, guerres, famines, épidémies, révoltes)
- `js/migrations.js` : module migrations (déplacés climatiques, de guerre et de faim ; flux entre régions ; accueil et fermeture des frontières)
- `js/carte.js` : contours simplifiés des régions pour la carte
- `js/panneaux.js` : panneaux Société, Population et Événements (HTML généré à partir de l'état)
- `js/interface.js` : interface (donut, onglets, horloge, dialogues, actions)

Les scripts se chargent dans cet ordre. Le moteur et le module société fonctionnent aussi sous Node :
`require('./js/moteur.js'); require('./js/societe.js'); require('./js/migrations.js')`.

## Statut

Prototype. Les chiffres de départ sont des ordres de grandeur arrondis (~2024) et le modèle est
volontairement simplifié, en particulier pour les guerres, les épidémies, les révolutions et les migrations.

Les déplacés climatiques sont un résultat du modèle, pas une donnée d'entrée : ils dépendent des dommages
climatiques subis par chaque région et de l'adaptation. À +2 °C, le jeu donne quelques dizaines à quelques
centaines de millions de déplacés d'ici 2050, dans l'ordre de grandeur de la Banque mondiale (Groundswell, 2021 :
jusqu'à 216 millions de migrants climatiques internes en 2050). Le réchauffement du jeu plafonne autour de +2,8 °C :
atteindre plusieurs milliards de déplacés demanderait un monde plus chaud.
