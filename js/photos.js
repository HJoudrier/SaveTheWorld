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

  const BANQUE = {};

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
