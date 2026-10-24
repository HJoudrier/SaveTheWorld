// =====================================================================
//  ATTERRIR — photos d'illustration des événements
//  Chaque clé d'illustration (canicule, inondation, guerre, famine…) est associée à une
//  ou plusieurs photos du dossier img/evenements/. Sans photo pour une clé, la fiche de
//  l'événement s'affiche simplement sans illustration.
//
//  Pour ajouter une photo, copier le fichier dans img/evenements/ et ajouter une entrée :
//    inondation: [{
//      fichier: 'img/evenements/inondation-1.jpg',
//      legende: 'Ce que montre vraiment la photo (lieu, date, événement réel)',
//      auteur: 'Nom de l’auteur ou de l’agence',
//      licence: 'CC BY-SA 4.0',                      // ou « Domaine public »
//      lienLicence: 'https://creativecommons.org/licenses/by-sa/4.0/',
//      source: 'https://commons.wikimedia.org/wiki/File:…',
//    }],
//  La légende, l'auteur et la licence s'affichent sous la photo.
// =====================================================================
const Photos = (() => {
  'use strict';

  // BANQUE:DEBUT (bloc généré : voir le README pour ajouter une photo à la main)
  const BANQUE = {
    'canicule': [
      { fichier: "img/evenements/canicule-1.jpg", legende: "Thermomètre d’une pharmacie de Bammental (Allemagne) affichant 39 °C, le 5 juillet 2015", auteur: "Radosław Drożdżewski", licence: "CC BY-SA 4.0", lienLicence: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Bammental_-_Thermometer_an_der_Thomas_Apotheke_39_Grad_2015-07-05_16-15-18.JPG" },
    ],
    'chaleur': [
      { fichier: "img/evenements/chaleur-1.jpg", legende: "Enseigne de pharmacie affichant 37 °C, boulevard de Ménilmontant, à Paris, le 26 juin 2026", auteur: "FreCha", licence: "CC BY-SA 4.0", lienLicence: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Enseigne_de_pharmacie_le_26_juin_2026_%C3%A0_Paris_03.jpg" },
    ],
    'secheresse': [
      { fichier: "img/evenements/secheresse-1.jpg", legende: "Terre desséchée, typique d’une sécheresse", auteur: "CSIRO (Atmospheric Research)", licence: "CC BY 3.0", lienLicence: "https://creativecommons.org/licenses/by/3.0/", source: "https://commons.wikimedia.org/wiki/File:CSIRO_ScienceImage_607_Effects_of_Drought_on_the_Soil.jpg" },
      { fichier: "img/evenements/secheresse-2.jpg", legende: "Sécheresse au Maroc : terre craquelée au pied d’une montagne", auteur: "Houssain tork", licence: "CC BY-SA 4.0", lienLicence: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Drought_in_Morocco.jpg" },
    ],
    'inondation': [
      { fichier: "img/evenements/inondation-1.jpg", legende: "Bâtiment inondé et tronc d’un figuier sacré dans les eaux boueuses du Mékong, île de Don Som (Si Phan Don, Laos), septembre 2019", auteur: "Basile Morin", licence: "CC BY-SA 4.0", lienLicence: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Flooded_building_and_tree_trunk_in_the_muddy_water_of_the_Mekong_in_Si_Phan_Don,_Laos,_September_2019.jpg" },
      { fichier: "img/evenements/inondation-2.jpg", legende: "Arbre à pluie submergé dans le Mékong, près de l’île de Don Loppadi (Laos)", auteur: "Basile Morin", licence: "CC BY-SA 4.0", lienLicence: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Flooded_Albizia_Saman_(rain_tree)_in_the_Mekong.jpg" },
    ],
    'cyclone': [
      { fichier: "img/evenements/cyclone-1.jpg", legende: "Maison en bord de mer détruite par l’ouragan Ike, Shoreacres (Texas), septembre 2008", auteur: "Mike Moore (FEMA)", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:FEMA_-_38523_-_Waterfront_House_Destroyed_by_Hurricane_Ike.jpg" },
      { fichier: "img/evenements/cyclone-2.jpg", legende: "Maisons détruites par l’ouragan Michael à Panama City (Floride), octobre 2018", auteur: "VOA", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Destroyed_houses_in_Panama_City,_FL.jpg" },
    ],
    'feux': [
      { fichier: "img/evenements/feux-1.jpg", legende: "Panache de fumée s’élevant d’un feu de forêt", auteur: "U.S. Fish and Wildlife Service", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Huge_smoke_rising_from_forest_fire.jpg" },
      { fichier: "img/evenements/feux-2.jpg", legende: "Fumée des incendies du Québec sur New York, le 7 juin 2023 (Madison Avenue, près de la cathédrale Saint-Patrick)", auteur: "Metropolitan Transportation Authority", licence: "CC BY 2.0", lienLicence: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:Wildfire_Smoke_-_52958896589.jpg" },
    ],
    'guerre': [
      { fichier: "img/evenements/guerre-1.jpg", legende: "Ruines de l’hôtel de ville d’Armentières (Nord, France), miné par les Allemands pendant la Première Guerre mondiale", auteur: "Captain W. H. Moore", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Town_Hall_destroyed_by_German_mines_-_Ravages_de_la_Guerre_-_Ruines_-_Armenti%C3%A8res_(France-_d%C3%A9p._du_Nord)._Ruines_de_l%27h%C3%B4tel_de_ville_qui_fut_min%C3%A9_par_les_Allemands_-_NARA_-_31484001_(cropped).jpg" },
    ],
    'famine': [
      { fichier: "img/evenements/famine-1.jpg", legende: "Un sac de pois cassés en attente de distribution sur un site du Programme alimentaire mondial et d’ACTED, à Bamako (Mali)", auteur: "DFID – UK Department for International Development", licence: "CC BY 2.0", lienLicence: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:A_sack_of_split_peas_awaits_distribution_at_a_joint_WFP_ACTED_site_in_central_Bamako,_Mali_(8511068596).jpg" },
    ],
    'epidemie': [
      { fichier: "img/evenements/epidemie-1.jpg", legende: "Particule du virus Ebola vue au microscope électronique à transmission", auteur: "Cynthia Goldsmith (CDC)", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Ebola_Virus_TEM_PHIL_1832_lores.jpg" },
      { fichier: "img/evenements/epidemie-2.jpg", legende: "Particules du virus de la variole du singe (colorisées en vert) vues au microscope électronique à transmission", auteur: "NIAID (National Institute of Allergy and Infectious Diseases)", licence: "CC BY 2.0", lienLicence: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:Colorized_transmission_electron_micrograph_of_monkeypox_virus_particles_(green).jpg" },
    ],
    'revolte': [
      { fichier: "img/evenements/revolte-1.jpg", legende: "Manifestation en faveur de l’Université d’Europe centrale, place des Héros, à Budapest, le 12 avril 2017", auteur: "Vauia Rex", licence: "CC0", lienLicence: "https://creativecommons.org/publicdomain/zero/1.0/", source: "https://commons.wikimedia.org/wiki/File:Budapest_protest_2017-04-12_19-02-34.jpg" },
    ],
    'revolution': [
      { fichier: "img/evenements/revolution-1.jpg", legende: "Foule place Tahrir, au Caire, lors de la « marche du million » pendant les manifestations égyptiennes de 2011", auteur: "Essam Sharaf", licence: "CC BY-SA 3.0", lienLicence: "https://creativecommons.org/licenses/by-sa/3.0/", source: "https://commons.wikimedia.org/wiki/File:Crowd_in_Midan_El-Tahrird_During_the_2011_Egyptian_Protests.jpg" },
    ],
    'migration': [
      { fichier: "img/evenements/migration-1.jpg", legende: "Tentes du camp de réfugiés du port de Thessalonique (Grèce)", auteur: "Sorneguer", licence: "CC BY-SA 4.0", lienLicence: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:View_of_the_tents_of_Thessaloniki_port_refugee_camp.jpg" },
      { fichier: "img/evenements/migration-2.jpg", legende: "Camp de réfugiés de Kibumba, près de Goma (Zaïre, aujourd’hui République démocratique du Congo), où avaient fui des réfugiés rwandais", auteur: "TSGT Val Gempis (US Air Force)", licence: "CC0", lienLicence: "https://creativecommons.org/publicdomain/zero/1.0/", source: "https://commons.wikimedia.org/wiki/File:Kibumba_refugee_camp_at_Goma,_6506675,_330-CFD-DF-ST-99-05606.jpg" },
    ],
    'krach': [
      { fichier: "img/evenements/krach-1.jpg", legende: "Foule dans le quartier de Wall Street, devant la Bourse de New York, le 24 octobre 1929", auteur: "Associated Press", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Crowds_gathering_outside_New_York_Stock_Exchange.jpg" },
      { fichier: "img/evenements/krach-2.jpg", legende: "Foule devant la Bourse de New York, le 24 octobre 1929, jour de la panique boursière", auteur: "Associated Press", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Crowds_gathering_outside_New_York_Stock_Exchange_(2).jpg" },
    ],
    'techno': [
      { fichier: "img/evenements/techno-1.jpg", legende: "Rangées de panneaux solaires dans la campagne britannique", auteur: "Elizabeth Scott", licence: "CC BY-SA 2.0", lienLicence: "https://creativecommons.org/licenses/by-sa/2.0/", source: "https://commons.wikimedia.org/wiki/File:Arrays_of_solar_panels_-_geograph.org.uk_-_7498005.jpg" },
    ],
    'gisement': [
      { fichier: "img/evenements/gisement-1.jpg", legende: "Plateforme pétrolière Holstein au crépuscule, Green Canyon (golfe du Mexique)", auteur: "GuavaTrain", licence: "CC0", lienLicence: "https://creativecommons.org/publicdomain/zero/1.0/", source: "https://commons.wikimedia.org/wiki/File:Holstein_at_Dusk.jpg" },
      { fichier: "img/evenements/gisement-2.jpg", legende: "Plateforme pétrolière au large de Vung Tau (Viêt Nam)", auteur: "Genghiskhanviet", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:An_oil_rig_offshore_Vungtau.jpg" },
    ],
    'cop': [
      { fichier: "img/evenements/cop-1.jpg", legende: "Délégués de la COP21 réunis en séance plénière au Bourget (Paris), le 12 décembre 2015", auteur: "U.S. Department of State", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Delegates_to_the_COP21_Climate_Change_Conference_Assemble_in_the_Plenary_Hall_Before_Speeches_By_French_President_Hollande,_Foreign_Minister_Fabius,_and_UN_Secretary-General_Ki-moon_(23069791503).jpg" },
    ],
    'entraide': [
      { fichier: "img/evenements/entraide-1.jpg", legende: "Journée de bénévolat au jardin communautaire de Parkdale", auteur: "Oceanflynn", licence: "CC BY-SA 4.0", lienLicence: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Parkdale_Community_garden_volunteer_day.JPG" },
      { fichier: "img/evenements/entraide-2.jpg", legende: "Jardin communautaire Moore Jackson à Woodside (New York), géré par des bénévoles, 2025", auteur: "CastIronSeasoner", licence: "CC BY 4.0", lienLicence: "https://creativecommons.org/licenses/by/4.0/", source: "https://commons.wikimedia.org/wiki/File:Moore_Jackson_Community_Garden,_Woodside,_New_York,_2025.jpg" },
    ],
    'crise': [
      { fichier: "img/evenements/crise-1.jpg", legende: "Pénurie d’essence : file de voitures devant une station-service", auteur: "David Falconer (archives nationales des États-Unis)", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:AFTER_HOURS_IN_A_GASOLINE_LINE_A_DRIVER_COULD_ARRIVE_AT_THE_PUMPS_AND_FIND_OUT_THAT_THE_CAR_AHEAD_OF_HIM_WAS_THE_LAST..._-_NARA_-_555459.jpg" },
    ],
    'politique': [
      { fichier: "img/evenements/politique-1.jpg", legende: "Hémicycle du Parlement européen à Bruxelles, 2024", auteur: "Profpcde", licence: "CC0", lienLicence: "https://creativecommons.org/publicdomain/zero/1.0/", source: "https://commons.wikimedia.org/wiki/File:European_Parliament_Hemicycle_-_Brussels_2024.jpg" },
    ],
    'debut': [
      { fichier: "img/evenements/debut-1.jpg", legende: "La Terre vue par l’équipage d’Apollo 17 en 1972 (« Blue Marble »)", auteur: "Harrison Schmitt / NASA (Apollo 17)", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:The_Blue_Marble,_AS17-148-22727.jpg" },
    ],
    'ressource-petrole': [
      { fichier: "img/evenements/ressource-petrole-1.jpg", legende: "Pompe à balancier sur un puits de pétrole du bassin permien, près de Monahans (Texas)", auteur: "Quintin Soloviev", licence: "CC BY 4.0", lienLicence: "https://creativecommons.org/licenses/by/4.0/", source: "https://commons.wikimedia.org/wiki/File:Oil_pumpjack_in_the_Permian_Basin.jpg" },
      { fichier: "img/evenements/ressource-petrole-2.jpg", legende: "Pompes à balancier du champ pétrolifère de Lost Hills (Californie), au coucher du soleil", auteur: "Arne Hückelheim", licence: "CC BY-SA 3.0", lienLicence: "https://creativecommons.org/licenses/by-sa/3.0/", source: "https://commons.wikimedia.org/wiki/File:Pumpjacks.JPG" },
    ],
    'ressource-metaux': [
      { fichier: "img/evenements/ressource-metaux-1.jpg", legende: "Fonderie et mine de cuivre à ciel ouvert de Kennecott (Utah)", auteur: "Bruce McAllister (archives nationales des États-Unis)", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:KENNECOTT_SMELTER_AND_MINE_-_THE_LARGEST_OPEN-PIT_COPPER_MINE_IN_THE_WORLD_-_NARA_-_544788.jpg" },
      { fichier: "img/evenements/ressource-metaux-2.jpg", legende: "Pelle mécanique dans la mine de cuivre à ciel ouvert de Bingham Canyon (Utah), 2012", auteur: "Jet6581", licence: "CC BY-SA 3.0", lienLicence: "https://creativecommons.org/licenses/by-sa/3.0/", source: "https://commons.wikimedia.org/wiki/File:Bingham_Canyon_Open_Pit_Copper_Mine_2012-09-17_21-25-59.jpg" },
    ],
    'ressource-peche': [
      { fichier: "img/evenements/ressource-peche-1.jpg", legende: "Chalutier sortant du port de Port-en-Bessin (Calvados, France)", auteur: "Jebulon", licence: "CC0", lienLicence: "https://creativecommons.org/publicdomain/zero/1.0/", source: "https://commons.wikimedia.org/wiki/File:Trawler_Port_en_Bessin.jpg" },
      { fichier: "img/evenements/ressource-peche-2.jpg", legende: "Mouettes au-dessus d’un chalutier de retour de pêche, à Sète (Hérault)", auteur: "Christian Ferrer", licence: "CC BY-SA 4.0", lienLicence: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Gulls_over_a_fishing_trawler,_S%C3%A8te_01.jpg" },
    ],
    'bascule-coraux': [
      { fichier: "img/evenements/bascule-coraux-1.jpg", legende: "Colonies de corail de feu blanchies sur un récif au large d’Islamorada (Floride)", auteur: "USGS", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Fire_Coral_Bleaching.jpg" },
      { fichier: "img/evenements/bascule-coraux-2.jpg", legende: "Corail corne de cerf blanchi sur la Grande Barrière de corail", auteur: "Matt Kieffer", licence: "CC BY-SA 2.0", lienLicence: "https://creativecommons.org/licenses/by-sa/2.0/", source: "https://commons.wikimedia.org/wiki/File:Bleached_Staghorn_Coral.jpg" },
    ],
    'bascule-pergelisol': [
      { fichier: "img/evenements/bascule-pergelisol-1.jpg", legende: "Glissement de 300 m provoqué par le dégel du pergélisol dans la réserve nationale de Noatak (Alaska), après l’été exceptionnellement chaud de 2004", auteur: "NPS Climate Change Response (National Park Service)", licence: "CC BY 2.0", lienLicence: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:National_Park_Service_Thawing_permafrost_(27759123542).jpg" },
      { fichier: "img/evenements/bascule-pergelisol-2.jpg", legende: "Dégel du pergélisol sur l’île Herschel (Yukon), 2013", auteur: "Boris Radosavljevic", licence: "CC BY 2.0", lienLicence: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:Permafrost_in_Herschel_Island_001.jpg" },
    ],
    'bascule-groenland': [
      { fichier: "img/evenements/bascule-groenland-1.jpg", legende: "Fonte précoce sur la calotte glaciaire du Groenland, vue par le satellite EO-1 de la NASA le 15 juin 2016", auteur: "NASA Goddard Space Flight Center", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Early_Melt_on_the_Greenland_Ice_Sheet_(33354485670).jpg" },
      { fichier: "img/evenements/bascule-groenland-2.jpg", legende: "Lac de fonte gelé sur la côte nord-est du Groenland, vu d’un avion P-3B de la NASA le 7 mai 2012", auteur: "NASA Goddard Space Flight Center (Jim Yungel)", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Frozen_Greenland_Meltpond_(7166014680).jpg" },
    ],
    'bascule-antarctique': [
      { fichier: "img/evenements/bascule-antarctique-1.jpg", legende: "Mares de fonte sur la plateforme de glace George VI (Antarctique), au pic de la saison de fonte 2019-2020", auteur: "NASA Earth Observatory (Lauren Dauphin, données Landsat)", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Widespread_Melt_on_the_George_VI_Ice_Shelf.jpeg" },
      { fichier: "img/evenements/bascule-antarctique-2.jpg", legende: "Désintégration d’une plateforme de glace de l’Antarctique de l’Est, mars 2022 (image satellite MODIS)", auteur: "MODIS Land Rapid Response Team, NASA GSFC", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:East_Antarctica_Ice_Shelf_Collapse_(MODIS_2022-03-31).jpg" },
    ],
    'bascule-amazonie': [
      { fichier: "img/evenements/bascule-amazonie-1.jpg", legende: "Vue aérienne d’une zone préparée pour la culture ou l’élevage, près de Porto Velho (Rondônia, Brésil), le 7 août 2020", auteur: "Bruno Kelly / Amazônia Real", licence: "CC BY 2.0", lienLicence: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:SOBREVVO_EM_RONDONIA_DIA_07-08-2020_(FOTO_BRUNO_KELLY)_(62)_(50224604772).jpg" },
    ],
    'bascule-amoc': [
      { fichier: "img/evenements/bascule-amoc-1.jpg", legende: "Températures de surface de la mer autour du Gulf Stream en 2005 (image satellite)", auteur: "NASA (données MODIS)", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:SST_Gulf_stream.jpeg" },
      { fichier: "img/evenements/bascule-amoc-2.jpg", legende: "Visualisation des courants et des températures de surface du Gulf Stream, du golfe du Mexique à l’Europe de l’Ouest", auteur: "Greg Shirah / NASA Scientific Visualization Studio", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Gulf_Stream_Sea_Surface_Currents_and_Temperatures_NASA_SVS.jpg" },
    ],
    'bascule-boreale': [
      { fichier: "img/evenements/bascule-boreale-1.jpg", legende: "Fumée sur la Sibérie orientale, où des dizaines d’incendies ont ravagé la forêt boréale (image satellite MODIS)", auteur: "MODIS Land Rapid Response Team, NASA GSFC", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:Siberia_Shrouded_in_Smoke_(MODIS_2021-07-05).jpg" },
      { fichier: "img/evenements/bascule-boreale-2.jpg", legende: "Forêt boréale russe en automne (concours photo EGAT 2011, USAID)", auteur: "USAID", licence: "Domaine public", source: "https://commons.wikimedia.org/wiki/File:FrontLines-EGAT_2011_Environment_Photo_Contest_Top_Entry_(5842271713).jpg" },
    ],
  };
  // BANQUE:FIN

  // Clés d'illustration produites par le jeu
  const CLES = [
    'canicule', 'chaleur', 'secheresse', 'inondation', 'pluies', 'cyclone', 'tempete', 'feux',
    'guerre', 'paix', 'famine', 'epidemie', 'revolte', 'revolution', 'migration',
    'krach', 'techno', 'gisement', 'cop', 'migrations', 'entraide', 'crise', 'politique', 'debut',
    'ressource-petrole', 'ressource-metaux', 'ressource-peche',
    'bascule-coraux', 'bascule-pergelisol', 'bascule-groenland', 'bascule-antarctique',
    'bascule-amazonie', 'bascule-amoc', 'bascule-boreale',
  ];

  // Si aucune photo n'existe pour une clé précise, on cherche dans sa famille
  const FAMILLE = {
    chaleur: 'canicule', tempete: 'cyclone', pluies: 'inondation', paix: 'guerre', revolution: 'revolte', migrations: 'migration',
    'ressource-petrole': 'ressource', 'ressource-metaux': 'ressource', 'ressource-peche': 'ressource',
  };

  function pour(cle, id) {
    const liste = c => (c && BANQUE[c] && BANQUE[c].length ? BANQUE[c] : null);
    const l = liste(cle) || liste(FAMILLE[cle]) || (String(cle).startsWith('bascule-') ? liste('bascule') : null);
    return l ? l[Math.abs(id | 0) % l.length] : null;
  }

  return { BANQUE, CLES, pour };
})();
