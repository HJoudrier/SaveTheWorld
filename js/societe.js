// =====================================================================
//  ATTERRIR — module société (aucune dépendance au DOM)
//  Inégalités, démocratie et tensions de chaque région, et ce qu'elles
//  produisent : guerres, famines, épidémies, révoltes et révolutions.
//  Les taux de départ sont des ordres de grandeur arrondis (Banque mondiale,
//  V-Dem, UCDP) ; la dynamique est volontairement simplifiée.
// =====================================================================
(() => {
  'use strict';
  const A = typeof Atterrir !== 'undefined' ? Atterrir : require('./moteur.js');

  // gini : inégalités de revenu (0 = égalité parfaite, 1 = un seul détient tout)
  // demo : démocratie, de 0 à 100 (inspiré de l'indice de démocratie électorale de V-Dem)
  // tens : risque de conflit armé, de 0 à 100
  const INIT = {
    nam: { gini: 0.41, demo: 78, tens: 15, sante: 0.9 },
    sam: { gini: 0.50, demo: 62, tens: 25, sante: 1.2 },
    eur: { gini: 0.33, demo: 62, tens: 32, sante: 0.9 },
    afr: { gini: 0.43, demo: 38, tens: 52, sante: 1.4 },
    asi: { gini: 0.39, demo: 33, tens: 42, sante: 1.0 },
    oce: { gini: 0.34, demo: 85, tens: 8, sante: 0.6 },
  };
  const GUERRES_INITIALES = [
    { region: 'eur', debut: 2022, intensite: 2, cause: 'geo',
      titre: 'Guerre en cours en Europe de l’Est', texte: 'Un conflit entre États se poursuit depuis 2022 aux portes de l’Union européenne.' },
    { region: 'afr', debut: 2023, intensite: 2, cause: 'civile',
      titre: 'Conflits au Soudan et au Sahel', texte: 'Plusieurs guerres civiles et insurrections armées font des milliers de morts et des millions de déplacés.' },
    { region: 'asi', debut: 2023, intensite: 1, cause: 'geo',
      titre: 'Conflits au Moyen-Orient et en Asie', texte: 'Des guerres localisées se poursuivent, avec un risque d’extension régionale.' },
  ];
  const INTENSITES = ['', 'locale', 'majeure', 'totale'];
  const MORT_GUERRE = [0, 1e-4, 4e-4, 1.5e-3];            // part de la population régionale tuée par an

  const CAUSES = {
    ressources: {
      titre: r => `Guerre pour les ressources : ${r.court}`,
      texte: 'Des armées s’affrontent autour de gisements, de points d’eau et de routes d’approvisionnement.',
      lecon: 'Quand le pétrole ou les métaux se raréfient, les États qui en dépendent sont tentés de les prendre par la force.',
      conf: 'Confiance moyenne',
    },
    climat: {
      titre: r => `Conflit lié au stress climatique : ${r.court}`,
      texte: 'Sécheresses, récoltes perdues et déplacements de population exacerbent des rivalités pour l’eau et la terre, jusqu’aux affrontements armés.',
      lecon: 'Le climat est rarement la cause unique d’une guerre, mais il aggrave les tensions là où les institutions sont fragiles.',
      conf: 'Facteur aggravant, rarement unique (Mach et al., 2019)',
    },
    civile: {
      titre: r => `Guerre civile : ${r.court}`,
      texte: 'L’État perd le contrôle d’une partie du territoire. Des milices et des armées rivales se disputent le pouvoir.',
      lecon: 'Pauvreté, inégalités et défiance envers les institutions comptent parmi les meilleurs prédicteurs des guerres civiles.',
      conf: 'Consensus de la recherche sur les conflits',
    },
    geo: {
      titre: r => `Guerre entre États : ${r.court}`,
      texte: 'Un conflit frontalier dégénère en guerre ouverte entre deux États.',
      lecon: 'Les rivalités entre puissances s’aiguisent quand l’économie ralentit et que chacun protège ses approvisionnements.',
      conf: 'Tendance historique',
    },
  };

  // Part de la population d'une région vivant dans la zone des combats, selon l'intensité de la guerre
  const PART_ZONE = [0, 0.02, 0.06, 0.25];
  const LBL_GUERRE = 'Population de la zone de combats (estimation)';
  const LBL_FAIM = 'Personnes en insécurité alimentaire grave (estimation)';
  const LBL_INFECTES = 'Personnes infectées (estimation)';
  const reg = (st, id) => st.regions.find(r => r.id === id);
  // Met à jour le bilan d'un événement qui dure (guerre, famine, épidémie) : l'entrée du journal reste à jour
  const majEvt = (st, o, id, champs) => { const ev = id && o.trouverEvenement(st, id); if (ev) Object.assign(ev, champs); };
  const penuries = g => g.penuriePetrole + g.penurieMetaux;
  const moyenne = (st, f) => st.regions.reduce((a, r) => a + f(r) * r.pop, 0) / st.regions.reduce((a, r) => a + r.pop, 0);
  const guerreDe = (st, id) => st.actifs.guerres.find(w => w.region === id);

  // Niveaux visés par chaque indicateur : ils évoluent lentement vers ces cibles
  function cibleDemo(r, st) {
    const L = st.leviers, riche = r.yEff > A.SEUIL_RICHE;
    return 15 + 17 * Math.log(r.yEff / 2000) - 80 * Math.max(0, r.gini - 0.40) - 0.25 * r.tension - (r.crise ? 15 : 0)
      + 1.5 * L.protection + (riche ? 0.3 : 1) * L.solidarite;
  }
  function cibleTension(r, st) {
    const g = st.g, L = st.leviers;
    const guerre = guerreDe(st, r.id);
    const autres = st.actifs.guerres.filter(w => w.region !== r.id).length;
    return 0.3 * Math.max(0, 55 - r.S) + 120 * Math.max(0, 0.95 - r.food) + 150 * penuries(g)
      + 60 * Math.max(0, r.gini - 0.35) + 12 * Math.min(3, Math.max(0, g.T - 1.4)) - 0.15 * (r.demo - 50)
      - 3 * L.solidarite - 2 * L.protection + (guerre ? 8 * guerre.intensite : 0) + 2 * Math.min(autres, 3);
  }
  function cibleGini(r, st) {
    const L = st.leviers, riche = r.yEff > A.SEUIL_RICHE, P = INIT[r.id];
    return P.gini + 0.05 - 0.035 * L.protection - 0.015 * L.solidarite * (riche ? 0.3 : 1) - (riche ? 0.02 * L.sobriete : 0)
      + 0.25 * penuries(st.g) + 0.1 * Math.max(0, 0.95 - r.food) + (r.crise ? 0.03 : 0) + 0.015 * (50 - r.demo) / 50;
  }

  // --- Mise en place -----------------------------------------------------------
  function init(st, o) {
    st.stats = { guerres: 0, famines: 0, epidemies: 0, revoltes: 0, revolutions: 0 };
    st.morts.revolte = 0;
    st.actifs.guerres = GUERRES_INITIALES.map(w => ({ region: w.region, debut: w.debut, intensite: w.intensite, cause: w.cause, morts: 0, base: w.intensite }));
    for (const r of st.regions) {
      const P = INIT[r.id];
      r.gini = P.gini; r.demo = P.demo; r.tension = P.tens; r.derniereRev = -99;
    }
    for (const r of st.regions) {                // décalages pour que les niveaux de départ soient à l'équilibre
      r.demoOff = r.demo - cibleDemo(r, st);
      r.tensOff = r.tension - cibleTension(r, st);
    }
    GUERRES_INITIALES.forEach((w, i) => {
      st.stats.guerres++;
      const e = o.journaliser(st, 'guerre', w.titre, w.texte,
        `Intensité ${INTENSITES[w.intensite]}. Les guerres réduisent le capital politique : les gouvernements en guerre ont moins de ressources pour agir sur le climat.`,
        'Situation en 2025, résumée', w.region,
        { gravite: 2, photo: 'guerre', enCours: true, touches: reg(st, w.region).pop * PART_ZONE[w.intensite], labelTouches: LBL_GUERRE });
      st.actifs.guerres[i].evtId = e.id;
    });
  }

  // --- Guerres -------------------------------------------------------------------
  function demarrerGuerre(st, o, r) {
    const g = st.g;
    const cause = o.choisirParmi(st, Object.keys(CAUSES), c => ({
      ressources: 0.3 + 10 * penuries(g),
      climat: 0.2 + 0.6 * Math.max(0, g.T - 1.5),
      civile: 0.4 + Math.max(0, (50 - r.S) / 25) + 6 * Math.max(0, r.gini - 0.45) + (r.demo < 35 ? 0.5 : 0),
      geo: 0.8 + Math.max(0, (r.tension - 30) / 50),
    }[c]));
    const u = o.alea(st), p3 = 0.07 + Math.max(0, r.tension - 70) / 200;
    const intensite = u < p3 ? 3 : u < p3 + 0.38 ? 2 : 1;
    const rec = { region: r.id, debut: st.year, intensite, cause, morts: 0, base: 0 };
    st.actifs.guerres.push(rec);
    st.stats.guerres++;
    r.S -= 4; r.tension += 6;
    const c = CAUSES[cause];
    const e = o.journaliser(st, 'guerre', c.titre(r), `${c.texte} Intensité ${INTENSITES[intensite]}.`, c.lecon, c.conf, r.id,
      { gravite: intensite >= 2 ? 3 : 2, photo: 'guerre', enCours: true, touches: r.pop * PART_ZONE[intensite], labelTouches: LBL_GUERRE });
    rec.evtId = e.id;
  }

  function guerres(st, o) {
    const liste = st.actifs.guerres;
    for (const w of [...liste]) {
      const r = reg(st, w.region);
      const m = o.tuer(st, r, r.pop * MORT_GUERRE[w.intensite] * (0.6 + 0.8 * o.alea(st)), 'guerre');
      w.morts += m;
      majEvt(st, o, w.evtId, { morts: w.morts, touches: r.pop * PART_ZONE[w.intensite] });
      const sup = Math.max(0, w.intensite - w.base);       // les guerres déjà en cours en 2025 sont comprises dans la stabilité de départ
      r.S -= 0.7 * sup; r.dmgEvt += 0.004 * sup;
      if (w.intensite < 3 && r.tension > 65 && o.alea(st) < 0.06) {
        w.intensite++;
        o.journaliser(st, 'guerre', `La guerre s’aggrave : ${r.court}`,
          `Le conflit s’étend et s’intensifie : l’intensité est désormais ${INTENSITES[w.intensite]}.`,
          'Plus un conflit dure, plus il détruit les institutions qui pourraient y mettre fin.', null, r.id,
          { gravite: w.intensite === 3 ? 3 : 2, photo: 'guerre', touches: r.pop * PART_ZONE[w.intensite], labelTouches: LBL_GUERRE, morts: w.morts });
      } else if (o.alea(st) < 0.12 * (w.intensite === 3 ? 0.7 : 1)) {
        liste.splice(liste.indexOf(w), 1);
        r.tension = Math.max(0, r.tension - 8);
        const duree = Math.max(1, st.year - w.debut);
        majEvt(st, o, w.evtId, { enCours: false, fin: st.year });
        o.journaliser(st, 'paix', `Fin des combats : ${r.court}`,
          `Après ${duree} ans de guerre, un cessez-le-feu est signé. La reconstruction commence.`,
          'La plupart des guerres civiles se terminent par un accord négocié plutôt que par une victoire totale.', null, r.id,
          { gravite: 2, cat: 'guerre', morts: w.morts, photo: 'paix', touches: r.pop * PART_ZONE[w.intensite], labelTouches: LBL_GUERRE,
            details: [['Durée du conflit', `${duree} an${duree > 1 ? 's' : ''}`]] });
      }
    }
    for (const r of st.regions) {
      if (guerreDe(st, r.id)) continue;
      if (o.alea(st) < Math.min(0.35, 2.1e-5 * Math.pow(r.tension, 2.14))) demarrerGuerre(st, o, r);
    }
  }

  // --- Famines -------------------------------------------------------------------
  function famines(st, o) {
    const liste = st.actifs.famines, g = st.g;
    for (const r of st.regions) {
      const f = liste.find(x => x.region === r.id);
      const deficit = Math.max(0, 0.92 - r.food);
      if (f) {
        // le moteur retire déjà ces décès de la population : ici, on les compte seulement
        const m = r.pop * 0.5 * 0.03 * deficit;
        st.morts.famine += m; f.morts += m;
        const touches = r.pop * o.clamp((0.95 - r.food) * 1.2, 0.02, 0.4);
        majEvt(st, o, f.evtId, { morts: f.morts, touches });
        if (r.food > 0.93) {
          liste.splice(liste.indexOf(f), 1);
          const duree = Math.max(1, st.year - f.debut);
          majEvt(st, o, f.evtId, { enCours: false, fin: st.year });
          o.journaliser(st, 'famine', `Fin de la famine : ${r.court}`,
            `Après ${duree} ans, les récoltes et les importations rétablissent l’approvisionnement.`,
            null, null, r.id, { gravite: 1, cat: 'famine', morts: f.morts, photo: 'famine',
              details: [['Durée de la famine', `${duree} an${duree > 1 ? 's' : ''}`]] });
        }
      } else if (r.food < 0.90 && o.alea(st) < 0.6) {
        const cause = guerreDe(st, r.id) ? 'guerre' : penuries(g) > 0.05 ? 'energie' : g.T > 1.8 ? 'climat' : 'prix';
        const txt = {
          guerre: 'Les combats détruisent les récoltes et bloquent l’aide alimentaire.',
          energie: 'Faute de carburant et d’engrais, les récoltes et les transports s’effondrent.',
          climat: 'Sécheresses et canicules répétées ruinent les récoltes, et les stocks sont épuisés.',
          prix: 'Les prix des céréales s’envolent et une partie de la population ne peut plus se nourrir.',
        }[cause];
        const rec = { region: r.id, debut: st.year, morts: 0 };
        liste.push(rec);
        st.stats.famines++;
        r.tension += 5;
        const e = o.journaliser(st, 'famine', `Famine : ${r.court}`, txt,
          'Les famines modernes sont rarement dues à un manque absolu de nourriture : elles résultent de pauvreté, de guerres et de prix.',
          'Confiance élevée (FAO)', r.id, { gravite: deficit > 0.15 || r.pop > 1000 ? 3 : 2, photo: 'famine', enCours: true, labelTouches: LBL_FAIM,
            touches: r.pop * o.clamp((0.95 - r.food) * 1.2, 0.02, 0.4) });
        rec.evtId = e.id;
      }
    }
  }

  // --- Épidémies -------------------------------------------------------------------
  // regions : où la maladie est plausible ; tropical : ailleurs, elle n'apparaît qu'avec un climat nettement plus chaud
  const MALADIES = [
    { nom: 'choléra', regions: ['afr', 'asi', 'sam'], chaud: 0.5,
      texte: 'Une épidémie de choléra se propage dans des quartiers sans eau potable ni assainissement.' },
    { nom: 'dengue', regions: ['afr', 'asi', 'sam', 'oce'], tropical: true, chaud: 2,
      texte: 'Une flambée de dengue touche des millions de personnes : les moustiques gagnent des régions autrefois trop fraîches.' },
    { nom: 'fièvre hémorragique', regions: ['afr', 'asi', 'sam'], chaud: 0.5,
      texte: 'Une fièvre hémorragique se propage depuis un foyer rural vers les villes.' },
    { nom: 'paludisme', regions: ['afr', 'asi', 'sam', 'oce'], tropical: true, chaud: 2,
      texte: 'Le paludisme progresse vers des régions où il avait presque disparu.' },
    { nom: 'grippe aviaire', regions: ['nam', 'sam', 'eur', 'afr', 'asi', 'oce'], chaud: 0.5,
      texte: 'Un virus de grippe aviaire passe à l’humain et se transmet de personne à personne.' },
  ];
  const poidsMaladie = (m, r, T) => (m.regions.includes(r.id) ? 1 + m.chaud * Math.max(0, T - 1.2)
    : m.tropical ? Math.max(0, T - 1.8) * m.chaud : 0);

  function epidemies(st, o) {
    const liste = st.actifs.epidemies, L = st.leviers, g = st.g;
    const vf = r => INIT[r.id].sante * (1 - 0.1 * L.protection - 0.06 * L.solidarite * (r.yEff > A.SEUIL_RICHE ? 0.3 : 1));
    for (const e of [...liste]) {
      const cibles = e.portee === 'monde' ? st.regions : [reg(st, e.portee)];
      for (const r of cibles) {
        const m = o.tuer(st, r, r.pop * e.mort / e.duree * vf(r), 'epidemie');
        e.morts += m; r.S -= 0.6 * e.gravite;
      }
      if (e.portee === 'monde') g.chocPIB += 0.004 * e.gravite;
      majEvt(st, o, e.evtId, { morts: e.morts, touches: e.morts / e.ifr });
      if (st.year >= e.fin) {
        liste.splice(liste.indexOf(e), 1);
        majEvt(st, o, e.evtId, { enCours: false, fin: st.year });
        o.journaliser(st, 'epidemie', `Fin de l’épidémie : ${e.nom}`,
          e.portee === 'monde' ? 'La circulation du virus ralentit grâce à l’immunité acquise, aux traitements et aux restrictions.'
            : 'Les derniers foyers sont maîtrisés.', null, null, e.portee === 'monde' ? null : e.portee,
          { gravite: 1, cat: 'epidemie', morts: e.morts, photo: 'epidemie', touches: e.morts / e.ifr, labelTouches: LBL_INFECTES,
            regions: e.portee === 'monde' ? null : [e.portee] });
      }
    }
    const pop = st.regions.reduce((a, r) => a + r.pop, 0);
    // pandémie : plus probable quand la biodiversité recule, que le climat se réchauffe et que la population grandit
    if (!liste.some(e => e.portee === 'monde')) {
      const lam = 0.012 * (1 + Math.max(0, 90 - g.bii) / 20) * (1 + 0.4 * Math.max(0, g.T - 1.2)) * (pop / 8100);
      if (o.alea(st) < lam) {
        const u = o.alea(st);
        if (u < 0.75) {
          const gravite = 2;
          const rec = { nom: 'pandémie', portee: 'monde', gravite, debut: st.year, fin: st.year + 2, duree: 2, mort: 0.0009, ifr: 0.005, morts: 0 };
          liste.push(rec);
          st.stats.epidemies++;
          rec.evtId = o.journaliser(st, 'epidemie', 'Pandémie', 'Un nouveau virus se propage sur tous les continents en quelques mois : frontières fermées, hôpitaux saturés.',
            'La destruction des habitats multiplie les contacts entre faune sauvage, élevage et humains.', 'Confiance moyenne (IPBES)', null,
            { gravite: 3, photo: 'epidemie', enCours: true, labelTouches: LBL_INFECTES, touches: 0 }).id;
        } else {
          const rec = { nom: 'pandémie meurtrière', portee: 'monde', gravite: 3, debut: st.year, fin: st.year + 3, duree: 3, mort: 0.008, ifr: 0.02, morts: 0 };
          liste.push(rec);
          st.stats.epidemies++;
          rec.evtId = o.journaliser(st, 'epidemie', 'Pandémie meurtrière', 'Un virus très contagieux et très létal se répand dans le monde. Les systèmes de santé sont dépassés et l’économie se fige.',
            'La grippe de 1918 a tué environ 2 à 3 % de la population mondiale.', 'Précédent historique', null,
            { gravite: 3, photo: 'epidemie', enCours: true, labelTouches: LBL_INFECTES, touches: 0 }).id;
        }
      }
    }
    // épidémies régionales : choléra, dengue, fièvres hémorragiques, paludisme…
    for (const r of st.regions) {
      if (liste.some(e => e.portee === r.id)) continue;
      const lam = 0.008 + 0.04 * Math.max(0, 55 - r.S) / 55 + 0.008 * Math.max(0, g.T - 1.2);
      if (o.alea(st) < lam) {
        const mal = o.choisirParmi(st, MALADIES, m => poidsMaladie(m, r, g.T) + 1e-9);
        const rec = { nom: mal.nom, portee: r.id, gravite: 1, debut: st.year, fin: st.year + 1, duree: 1, mort: 5e-5, ifr: 0.01, morts: 0 };
        liste.push(rec);
        st.stats.epidemies++;
        rec.evtId = o.journaliser(st, 'epidemie', `Épidémie de ${mal.nom} : ${r.court}`, mal.texte,
          mal.chaud > 1 ? 'Le réchauffement étend l’aire des moustiques et de plusieurs maladies à transmission vectorielle.' : null,
          mal.chaud > 1 ? 'Confiance élevée (GIEC)' : null, r.id,
          { gravite: 1, photo: 'epidemie', enCours: true, labelTouches: LBL_INFECTES, touches: 0 }).id;
      }
    }
  }

  // --- Révoltes et révolutions ------------------------------------------------------
  function revolte(st, o, r) {
    const cause = r.food < 0.93 ? 'faim' : r.gini > 0.45 ? 'inegalites' : r.demo < 40 ? 'libertes' : r.S < 35 ? 'vie' : 'social';
    const c = {
      faim: ['Émeutes de la faim', 'Les prix de la nourriture explosent et des foules pillent les entrepôts.', 'Les émeutes de la faim de 2008 et 2011 ont précédé plusieurs soulèvements du « printemps arabe ».'],
      inegalites: ['Soulèvement contre les inégalités', 'Des manifestations massives dénoncent la concentration des richesses et le coût de la vie.', 'Des inégalités fortes réduisent la confiance dans les institutions et nourrissent la contestation.'],
      libertes: ['Mouvement pour les libertés', 'Des mois de manifestations réclament des élections libres et la fin de la censure.', 'Les régimes autoritaires paraissent stables jusqu’au moment où ils ne le sont plus.'],
      vie: ['Révolte contre la vie chère', 'Services publics défaillants, pénuries et chômage jettent des foules dans la rue.', 'Quand l’État ne protège plus, les gens cessent de lui obéir.'],
      social: ['Mouvement social', 'Grèves et manifestations paralysent le pays.', 'Les mouvements sociaux sont un signal : ils précèdent souvent des réformes, ou une répression.'],
    }[cause];
    const concede = o.alea(st) < 0.35 + r.demo / 200;
    r.S -= 4; r.tension = Math.min(100, r.tension + 6);
    const morts = o.tuer(st, r, r.pop * 5e-6, 'revolte');
    if (concede) { r.gini = Math.max(0.22, r.gini - 0.012); r.demo = Math.min(97, r.demo + 1.5); }
    else { r.demo = Math.max(3, r.demo - 3); r.S += 2; }
    st.stats.revoltes++;
    return o.journaliser(st, 'revolte', `${c[0]} : ${r.court}`,
      `${c[1]} ${concede ? 'Le gouvernement fait des concessions.' : 'Le pouvoir réprime la contestation.'}`, c[2], null, r.id,
      { gravite: 2, morts, photo: 'revolte', touches: r.pop * 0.01, labelTouches: 'Participants (estimation)' });
  }

  function revolution(st, o, r, precedent) {
    const demo = r.demo;
    const poids = demo < 50 ? { dem: 0.45 + (r.gini > 0.42 ? 0 : 0.1), aut: 0.35, soc: r.gini > 0.42 ? 0.2 : 0.1 }
      : { dem: 0.1, aut: r.gini > 0.42 ? 0.3 : 0.5, soc: r.gini > 0.42 ? 0.6 : 0.4 };
    const issue = o.choisirParmi(st, ['dem', 'aut', 'soc'], k => poids[k]);
    let titre, texte, lecon, conf = 'Tendance historique, résultats très variables', morts;
    if (issue === 'dem') {
      r.demo = Math.min(88, r.demo + 25); r.gini = Math.max(0.22, r.gini - 0.02); r.tension = Math.max(0, r.tension - 10);
      morts = o.tuer(st, r, r.pop * 5e-5, 'revolte');
      titre = `Révolution démocratique : ${r.court}`;
      texte = 'Des mois de manifestations renversent le pouvoir en place. Une transition vers des institutions plus ouvertes s’engage.';
      lecon = 'Les transitions démocratiques naissent souvent d’une crise économique, mais elles ne durent que si les inégalités restent contenues.';
    } else if (issue === 'aut') {
      r.demo = Math.max(8, r.demo - 25); r.gini = Math.min(0.7, r.gini + 0.02); r.tension = Math.max(0, r.tension - 5);
      morts = o.tuer(st, r, r.pop * 1e-4, 'revolte');
      titre = `Coup de force : ${r.court}`;
      texte = 'Face au chaos, l’armée prend le pouvoir et rétablit l’ordre par la force. Les libertés sont suspendues.';
      lecon = 'Dans les crises prolongées, la promesse d’ordre ouvre souvent la voie à des régimes autoritaires.';
    } else {
      r.gini = Math.max(0.24, r.gini - 0.08); r.demo = Math.min(90, r.demo + 8); r.tension = Math.max(0, r.tension - 10);
      st.g.chocPIB += 0.004;
      morts = o.tuer(st, r, r.pop * 8e-5, 'revolte');
      titre = `Révolution sociale : ${r.court}`;
      texte = 'Le pouvoir change de mains et les richesses sont redistribuées : impôts sur les grandes fortunes, nationalisations, réforme agraire.';
      lecon = 'Les révolutions sociales réduisent souvent les inégalités, mais au prix de violences et de ruptures durables.';
    }
    r.S = Math.max(r.S, issue === 'aut' ? 40 : 45);
    r.crise = false; r.derniereRev = st.year;
    st.stats.revolutions++;
    const e = o.journaliser(st, 'revolution', titre, texte, lecon, conf, r.id,
      { gravite: 3, cat: 'revolte', morts, photo: 'revolution', touches: r.pop * 0.02, labelTouches: 'Participants (estimation)' });
    if (precedent) e.date = Math.max(e.date, Math.min(st.year - 0.001, precedent.date + 0.05));
    // une révolution dégénère parfois en guerre civile
    if (!guerreDe(st, r.id) && o.alea(st) < 0.25) {
      const rec = { region: r.id, debut: st.year, intensite: 2, cause: 'civile', morts: 0, base: 0 };
      st.actifs.guerres.push(rec);
      st.stats.guerres++;
      const c = CAUSES.civile;
      const g = o.journaliser(st, 'guerre', c.titre(r), `${c.texte} La transition n’a pas tenu. Intensité ${INTENSITES[2]}.`, c.lecon, c.conf, r.id,
        { gravite: 3, photo: 'guerre', enCours: true, touches: r.pop * PART_ZONE[2], labelTouches: LBL_GUERRE });
      rec.evtId = g.id;
      g.date = Math.max(g.date, Math.min(st.year - 0.001, e.date + 0.05));
    }
  }

  function revoltes(st, o) {
    for (const r of st.regions) {
      if (st.year - r.derniereRev < 4) continue;      // pas de nouvelle révolte juste après une révolution
      let rev = r.crise && o.alea(st) < 0.08, precedent = null;
      const f = o.clamp((62 - r.S) / 30 + (r.gini - 0.38) * 6 + (45 - r.demo) / 120 + Math.max(0, 0.95 - r.food) * 6, 0, 4);
      if (!rev && o.alea(st) < 0.035 * f) {
        precedent = revolte(st, o, r);
        const p = o.clamp(0.1 + (45 - r.S) / 80 + (r.crise ? 0.25 : 0) + (r.demo < 40 ? 0.1 : 0), 0, 0.75);
        rev = o.alea(st) < p;
      }
      if (rev) revolution(st, o, r, precedent);
    }
  }

  // --- Une année ------------------------------------------------------------------------
  function annee(st, o) {
    for (const r of st.regions) {
      const P = INIT[r.id];
      r.gini = o.clamp(r.gini + 0.05 * (cibleGini(r, st) - r.gini), 0.22, 0.70);
      r.demo = o.clamp(r.demo + 0.05 * (cibleDemo(r, st) + r.demoOff - r.demo) - 0.08, 3, 97);
      r.tension = o.clamp(r.tension + 0.15 * (cibleTension(r, st) + r.tensOff - r.tension), 0, 100);
      // inégalités et démocratie pèsent sur la stabilité sociale, par rapport à la situation de départ
      r.S += -8 * (r.gini - (P.gini + 0.03)) + 0.03 * (r.demo - P.demo);
    }
    guerres(st, o);
    famines(st, o);
    epidemies(st, o);
    revoltes(st, o);
    for (const r of st.regions) r.S = o.clamp(r.S, 0, 100);
  }

  function instantane(st) {
    return {
      gini: moyenne(st, r => r.gini), demo: moyenne(st, r => r.demo), tens: moyenne(st, r => r.tension),
      giniR: st.regions.map(r => r.gini), demoR: st.regions.map(r => r.demo), tensR: st.regions.map(r => r.tension),
      morts: Object.values(st.morts).reduce((a, b) => a + b, 0), guerres: st.actifs.guerres.length,
    };
  }
  function bilan(st) {
    return {
      morts: { ...st.morts }, mortsTotal: Object.values(st.morts).reduce((a, b) => a + b, 0), stats: { ...st.stats },
      gini: moyenne(st, r => r.gini), demo: moyenne(st, r => r.demo), tension: moyenne(st, r => r.tension),
      guerresEnCours: st.actifs.guerres.length,
    };
  }

  A.enregistrer({ init, annee, instantane, bilan });
})();
