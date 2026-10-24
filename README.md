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

## Détails d'un événement

Chaque événement du journal a un bouton **Détails** (les notifications et les cartes « En ce moment » aussi) :
zones concernées sur une carte, population de ces zones, nombre de personnes touchées, morts, situation
(en cours ou terminé), contexte climatique et démographique de l'époque. Pour les guerres, les famines et
les épidémies, le bilan se met à jour tant que l'événement dure. Les nombres sont des estimations du jeu.

Une image d'illustration (photo, vue satellite ou visualisation scientifique) s'affiche en haut de la fiche,
avec sa légende, son auteur, sa licence et un lien vers sa source. Il y en a 48, pour 30 types d'événements
(voir « Crédits des images » plus bas). Elles se déclarent dans `js/photos.js` (le format y est expliqué) et se
placent dans `img/evenements/` ; pour un type d'événement sans image, la fiche s'affiche sans illustration.

## Structure

- `index.html` : la page (structure et boîtes de dialogue)
- `css/style.css` : styles, thèmes clair et sombre, mise en page mobile
- `js/moteur.js` : moteur de simulation (climat, énergie, ressources, événements), sans dépendance au DOM
- `js/societe.js` : module société (inégalités, démocratie, tensions, guerres, famines, épidémies, révoltes)
- `js/migrations.js` : module migrations (déplacés climatiques, de guerre et de faim ; flux entre régions ; accueil et fermeture des frontières)
- `js/carte.js` : contours simplifiés des régions pour la carte
- `js/photos.js` : banque de photos d'illustration des événements (`img/evenements/`)
- `js/panneaux.js` : panneaux Société, Population et Événements, et fiche de détail d'un événement (HTML généré à partir de l'état)
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

## Crédits des images

<!-- CREDITS:DEBUT -->
Les images d'illustration proviennent de Wikimedia Commons (domaine public ou licences libres). Elles sont redimensionnées et recompressées (800 px de large) ; chacune reste sous sa licence d'origine. Ce sont des images de lieux et d'événements réels, sans lien avec les événements simulés qu'elles illustrent.

| Fichier | Image | Auteur | Licence | Source |
|---|---|---|---|---|
| `img/evenements/canicule-1.jpg` | Thermomètre d’une pharmacie de Bammental (Allemagne) affichant 39 °C, le 5 juillet 2015 | Radosław Drożdżewski | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Bammental_-_Thermometer_an_der_Thomas_Apotheke_39_Grad_2015-07-05_16-15-18.JPG) |
| `img/evenements/chaleur-1.jpg` | Enseigne de pharmacie affichant 37 °C, boulevard de Ménilmontant, à Paris, le 26 juin 2026 | FreCha | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Enseigne_de_pharmacie_le_26_juin_2026_%C3%A0_Paris_03.jpg) |
| `img/evenements/secheresse-1.jpg` | Terre desséchée, typique d’une sécheresse | CSIRO (Atmospheric Research) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Commons](https://commons.wikimedia.org/wiki/File:CSIRO_ScienceImage_607_Effects_of_Drought_on_the_Soil.jpg) |
| `img/evenements/secheresse-2.jpg` | Sécheresse au Maroc : terre craquelée au pied d’une montagne | Houssain tork | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Drought_in_Morocco.jpg) |
| `img/evenements/inondation-1.jpg` | Bâtiment inondé et tronc d’un figuier sacré dans les eaux boueuses du Mékong, île de Don Som (Si Phan Don, Laos), septembre 2019 | Basile Morin | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Flooded_building_and_tree_trunk_in_the_muddy_water_of_the_Mekong_in_Si_Phan_Don,_Laos,_September_2019.jpg) |
| `img/evenements/inondation-2.jpg` | Arbre à pluie submergé dans le Mékong, près de l’île de Don Loppadi (Laos) | Basile Morin | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Flooded_Albizia_Saman_(rain_tree)_in_the_Mekong.jpg) |
| `img/evenements/cyclone-1.jpg` | Maison en bord de mer détruite par l’ouragan Ike, Shoreacres (Texas), septembre 2008 | Mike Moore (FEMA) | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:FEMA_-_38523_-_Waterfront_House_Destroyed_by_Hurricane_Ike.jpg) |
| `img/evenements/cyclone-2.jpg` | Maisons détruites par l’ouragan Michael à Panama City (Floride), octobre 2018 | VOA | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Destroyed_houses_in_Panama_City,_FL.jpg) |
| `img/evenements/feux-1.jpg` | Panache de fumée s’élevant d’un feu de forêt | U.S. Fish and Wildlife Service | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Huge_smoke_rising_from_forest_fire.jpg) |
| `img/evenements/feux-2.jpg` | Fumée des incendies du Québec sur New York, le 7 juin 2023 (Madison Avenue, près de la cathédrale Saint-Patrick) | Metropolitan Transportation Authority | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Wildfire_Smoke_-_52958896589.jpg) |
| `img/evenements/guerre-1.jpg` | Ruines de l’hôtel de ville d’Armentières (Nord, France), miné par les Allemands pendant la Première Guerre mondiale | Captain W. H. Moore | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Town_Hall_destroyed_by_German_mines_-_Ravages_de_la_Guerre_-_Ruines_-_Armenti%C3%A8res_(France-_d%C3%A9p._du_Nord)._Ruines_de_l%27h%C3%B4tel_de_ville_qui_fut_min%C3%A9_par_les_Allemands_-_NARA_-_31484001_(cropped).jpg) |
| `img/evenements/famine-1.jpg` | Un sac de pois cassés en attente de distribution sur un site du Programme alimentaire mondial et d’ACTED, à Bamako (Mali) | DFID – UK Department for International Development | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:A_sack_of_split_peas_awaits_distribution_at_a_joint_WFP_ACTED_site_in_central_Bamako,_Mali_(8511068596).jpg) |
| `img/evenements/epidemie-1.jpg` | Particule du virus Ebola vue au microscope électronique à transmission | Cynthia Goldsmith (CDC) | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Ebola_Virus_TEM_PHIL_1832_lores.jpg) |
| `img/evenements/epidemie-2.jpg` | Particules du virus de la variole du singe (colorisées en vert) vues au microscope électronique à transmission | NIAID (National Institute of Allergy and Infectious Diseases) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Colorized_transmission_electron_micrograph_of_monkeypox_virus_particles_(green).jpg) |
| `img/evenements/revolte-1.jpg` | Manifestation en faveur de l’Université d’Europe centrale, place des Héros, à Budapest, le 12 avril 2017 | Vauia Rex | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Budapest_protest_2017-04-12_19-02-34.jpg) |
| `img/evenements/revolution-1.jpg` | Foule place Tahrir, au Caire, lors de la « marche du million » pendant les manifestations égyptiennes de 2011 | Essam Sharaf | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Crowd_in_Midan_El-Tahrird_During_the_2011_Egyptian_Protests.jpg) |
| `img/evenements/migration-1.jpg` | Tentes du camp de réfugiés du port de Thessalonique (Grèce) | Sorneguer | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:View_of_the_tents_of_Thessaloniki_port_refugee_camp.jpg) |
| `img/evenements/migration-2.jpg` | Camp de réfugiés de Kibumba, près de Goma (Zaïre, aujourd’hui République démocratique du Congo), où avaient fui des réfugiés rwandais | TSGT Val Gempis (US Air Force) | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Kibumba_refugee_camp_at_Goma,_6506675,_330-CFD-DF-ST-99-05606.jpg) |
| `img/evenements/krach-1.jpg` | Foule dans le quartier de Wall Street, devant la Bourse de New York, le 24 octobre 1929 | Associated Press | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Crowds_gathering_outside_New_York_Stock_Exchange.jpg) |
| `img/evenements/krach-2.jpg` | Foule devant la Bourse de New York, le 24 octobre 1929, jour de la panique boursière | Associated Press | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Crowds_gathering_outside_New_York_Stock_Exchange_(2).jpg) |
| `img/evenements/techno-1.jpg` | Rangées de panneaux solaires dans la campagne britannique | Elizabeth Scott | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Arrays_of_solar_panels_-_geograph.org.uk_-_7498005.jpg) |
| `img/evenements/gisement-1.jpg` | Plateforme pétrolière Holstein au crépuscule, Green Canyon (golfe du Mexique) | GuavaTrain | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Holstein_at_Dusk.jpg) |
| `img/evenements/gisement-2.jpg` | Plateforme pétrolière au large de Vung Tau (Viêt Nam) | Genghiskhanviet | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:An_oil_rig_offshore_Vungtau.jpg) |
| `img/evenements/cop-1.jpg` | Délégués de la COP21 réunis en séance plénière au Bourget (Paris), le 12 décembre 2015 | U.S. Department of State | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Delegates_to_the_COP21_Climate_Change_Conference_Assemble_in_the_Plenary_Hall_Before_Speeches_By_French_President_Hollande,_Foreign_Minister_Fabius,_and_UN_Secretary-General_Ki-moon_(23069791503).jpg) |
| `img/evenements/entraide-1.jpg` | Journée de bénévolat au jardin communautaire de Parkdale | Oceanflynn | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Parkdale_Community_garden_volunteer_day.JPG) |
| `img/evenements/entraide-2.jpg` | Jardin communautaire Moore Jackson à Woodside (New York), géré par des bénévoles, 2025 | CastIronSeasoner | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Moore_Jackson_Community_Garden,_Woodside,_New_York,_2025.jpg) |
| `img/evenements/crise-1.jpg` | Pénurie d’essence : file de voitures devant une station-service | David Falconer (archives nationales des États-Unis) | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:AFTER_HOURS_IN_A_GASOLINE_LINE_A_DRIVER_COULD_ARRIVE_AT_THE_PUMPS_AND_FIND_OUT_THAT_THE_CAR_AHEAD_OF_HIM_WAS_THE_LAST..._-_NARA_-_555459.jpg) |
| `img/evenements/politique-1.jpg` | Hémicycle du Parlement européen à Bruxelles, 2024 | Profpcde | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:European_Parliament_Hemicycle_-_Brussels_2024.jpg) |
| `img/evenements/debut-1.jpg` | La Terre vue par l’équipage d’Apollo 17 en 1972 (« Blue Marble ») | Harrison Schmitt / NASA (Apollo 17) | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:The_Blue_Marble,_AS17-148-22727.jpg) |
| `img/evenements/ressource-petrole-1.jpg` | Pompe à balancier sur un puits de pétrole du bassin permien, près de Monahans (Texas) | Quintin Soloviev | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Oil_pumpjack_in_the_Permian_Basin.jpg) |
| `img/evenements/ressource-petrole-2.jpg` | Pompes à balancier du champ pétrolifère de Lost Hills (Californie), au coucher du soleil | Arne Hückelheim | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Pumpjacks.JPG) |
| `img/evenements/ressource-metaux-1.jpg` | Fonderie et mine de cuivre à ciel ouvert de Kennecott (Utah) | Bruce McAllister (archives nationales des États-Unis) | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:KENNECOTT_SMELTER_AND_MINE_-_THE_LARGEST_OPEN-PIT_COPPER_MINE_IN_THE_WORLD_-_NARA_-_544788.jpg) |
| `img/evenements/ressource-metaux-2.jpg` | Pelle mécanique dans la mine de cuivre à ciel ouvert de Bingham Canyon (Utah), 2012 | Jet6581 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Bingham_Canyon_Open_Pit_Copper_Mine_2012-09-17_21-25-59.jpg) |
| `img/evenements/ressource-peche-1.jpg` | Chalutier sortant du port de Port-en-Bessin (Calvados, France) | Jebulon | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Trawler_Port_en_Bessin.jpg) |
| `img/evenements/ressource-peche-2.jpg` | Mouettes au-dessus d’un chalutier de retour de pêche, à Sète (Hérault) | Christian Ferrer | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Gulls_over_a_fishing_trawler,_S%C3%A8te_01.jpg) |
| `img/evenements/bascule-coraux-1.jpg` | Colonies de corail de feu blanchies sur un récif au large d’Islamorada (Floride) | USGS | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Fire_Coral_Bleaching.jpg) |
| `img/evenements/bascule-coraux-2.jpg` | Corail corne de cerf blanchi sur la Grande Barrière de corail | Matt Kieffer | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Bleached_Staghorn_Coral.jpg) |
| `img/evenements/bascule-pergelisol-1.jpg` | Glissement de 300 m provoqué par le dégel du pergélisol dans la réserve nationale de Noatak (Alaska), après l’été exceptionnellement chaud de 2004 | NPS Climate Change Response (National Park Service) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:National_Park_Service_Thawing_permafrost_(27759123542).jpg) |
| `img/evenements/bascule-pergelisol-2.jpg` | Dégel du pergélisol sur l’île Herschel (Yukon), 2013 | Boris Radosavljevic | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Permafrost_in_Herschel_Island_001.jpg) |
| `img/evenements/bascule-groenland-1.jpg` | Fonte précoce sur la calotte glaciaire du Groenland, vue par le satellite EO-1 de la NASA le 15 juin 2016 | NASA Goddard Space Flight Center | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Early_Melt_on_the_Greenland_Ice_Sheet_(33354485670).jpg) |
| `img/evenements/bascule-groenland-2.jpg` | Lac de fonte gelé sur la côte nord-est du Groenland, vu d’un avion P-3B de la NASA le 7 mai 2012 | NASA Goddard Space Flight Center (Jim Yungel) | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Frozen_Greenland_Meltpond_(7166014680).jpg) |
| `img/evenements/bascule-antarctique-1.jpg` | Mares de fonte sur la plateforme de glace George VI (Antarctique), au pic de la saison de fonte 2019-2020 | NASA Earth Observatory (Lauren Dauphin, données Landsat) | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Widespread_Melt_on_the_George_VI_Ice_Shelf.jpeg) |
| `img/evenements/bascule-antarctique-2.jpg` | Désintégration d’une plateforme de glace de l’Antarctique de l’Est, mars 2022 (image satellite MODIS) | MODIS Land Rapid Response Team, NASA GSFC | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:East_Antarctica_Ice_Shelf_Collapse_(MODIS_2022-03-31).jpg) |
| `img/evenements/bascule-amazonie-1.jpg` | Vue aérienne d’une zone préparée pour la culture ou l’élevage, près de Porto Velho (Rondônia, Brésil), le 7 août 2020 | Bruno Kelly / Amazônia Real | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Commons](https://commons.wikimedia.org/wiki/File:SOBREVVO_EM_RONDONIA_DIA_07-08-2020_(FOTO_BRUNO_KELLY)_(62)_(50224604772).jpg) |
| `img/evenements/bascule-amoc-1.jpg` | Températures de surface de la mer autour du Gulf Stream en 2005 (image satellite) | NASA (données MODIS) | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:SST_Gulf_stream.jpeg) |
| `img/evenements/bascule-amoc-2.jpg` | Visualisation des courants et des températures de surface du Gulf Stream, du golfe du Mexique à l’Europe de l’Ouest | Greg Shirah / NASA Scientific Visualization Studio | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Gulf_Stream_Sea_Surface_Currents_and_Temperatures_NASA_SVS.jpg) |
| `img/evenements/bascule-boreale-1.jpg` | Fumée sur la Sibérie orientale, où des dizaines d’incendies ont ravagé la forêt boréale (image satellite MODIS) | MODIS Land Rapid Response Team, NASA GSFC | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:Siberia_Shrouded_in_Smoke_(MODIS_2021-07-05).jpg) |
| `img/evenements/bascule-boreale-2.jpg` | Forêt boréale russe en automne (concours photo EGAT 2011, USAID) | USAID | Domaine public | [Commons](https://commons.wikimedia.org/wiki/File:FrontLines-EGAT_2011_Environment_Photo_Contest_Top_Entry_(5842271713).jpg) |
<!-- CREDITS:FIN -->
