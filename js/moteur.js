// =====================================================================
//  ATTERRIR — moteur de simulation (aucune dépendance au DOM)
//  Le moteur porte l'économie, l'énergie, les ressources, la stabilité, les événements
//  et l'écoulement du temps. Chaque année, il appelle les étapes dans cet ordre :
//    économie et énergie → ressources → alimentation et sols (js/alimentation.js)
//    → système Terre et limites planétaires (js/terre.js) → points de bascule
//    → plancher social du donut (js/donut.js) → stabilité → société (js/societe.js)
//    → migrations (js/migrations.js) → événements → capital politique.
//  Ordres de grandeur arrondis (~2024) ; sources détaillées en tête de chaque module.
// =====================================================================
const Atterrir = (() => {
  'use strict';

  const ANNEE_DEBUT = 2025, ANNEE_FIN = 2100;
  const DELAI = 5;                          // ans avant de pouvoir relever à nouveau une même politique
  const CATEGORIES = [                      // catégories d'événements affichées dans le journal
    { id: 'climat', nom: 'Climat' }, { id: 'guerre', nom: 'Guerres' }, { id: 'famine', nom: 'Famines' },
    { id: 'epidemie', nom: 'Épidémies' }, { id: 'revolte', nom: 'Révoltes et révolutions' },
    { id: 'migration', nom: 'Migrations' }, { id: 'crise', nom: 'Crises régionales' }, { id: 'eco', nom: 'Économie et technologie' },
    { id: 'ressource', nom: 'Ressources' }, { id: 'bascule', nom: 'Points de bascule' }, { id: 'politique', nom: 'Politique et société' },
  ];
  const modules = [];                       // modules optionnels (société, etc.) branchés sur le moteur
  const COUTS = [0, 1, 2, 4];               // coût cumulé d'un levier selon son niveau
  const SEUIL_RICHE = 30000;                // $ PPA / hab.

  // --- Régions (découpage « continents » d'Our World in Data) ----------
  // pop : millions ; y : PIB/hab ($ PPA) ; gpc : énergie primaire (GJ/hab)
  // co2 : Gt CO2 fossile/an ; s : part bas-carbone de l'énergie ; hist : part du cumul historique
  const REGIONS = [
    { id: 'nam', nom: 'Amérique du Nord', pop: 610, y: 48000, gpc: 195, co2: 6.1, s: 0.20, hist: 0.27, S0: 58, aer: 0.5,
      gP0: 0.006, gPf: -0.001, kP: 0.03, gY0: 0.016, gYf: 0.010, vuln: 0.8, cote: 0.8 },
    { id: 'sam', nom: 'Amérique du Sud', pop: 440, y: 16000, gpc: 60, co2: 1.1, s: 0.33, hist: 0.03, S0: 50, aer: 0.8,
      gP0: 0.006, gPf: -0.006, kP: 0.03, gY0: 0.022, gYf: 0.012, vuln: 1.2, cote: 0.8 },
    { id: 'eur', nom: 'Europe (avec la Russie)', court: 'Europe', pop: 745, y: 38000, gpc: 135, co2: 4.9, s: 0.28, hist: 0.31, S0: 60, aer: 0.7,
      gP0: -0.001, gPf: -0.004, kP: 0.03, gY0: 0.013, gYf: 0.009, vuln: 0.7, cote: 0.7 },
    { id: 'afr', nom: 'Afrique', pop: 1500, y: 5500, gpc: 16, co2: 1.45, s: 0.10, hist: 0.03, S0: 46, aer: 1.3,
      gP0: 0.023, gPf: -0.002, kP: 0.018, gY0: 0.032, gYf: 0.015, vuln: 1.8, cote: 1.0 },
    { id: 'asi', nom: 'Asie', pop: 4800, y: 17000, gpc: 70, co2: 22.3, s: 0.15, hist: 0.33, S0: 62, aer: 1.6,
      gP0: 0.006, gPf: -0.005, kP: 0.03, gY0: 0.030, gYf: 0.010, vuln: 1.3, cote: 1.5 },
    { id: 'oce', nom: 'Océanie', pop: 46, y: 42000, gpc: 180, co2: 0.45, s: 0.15, hist: 0.013, S0: 64, aer: 0.8,
      gP0: 0.011, gPf: 0.001, kP: 0.03, gY0: 0.015, gYf: 0.010, vuln: 1.0, cote: 1.0 },
  ];
  const PARAM = Object.fromEntries(REGIONS.map(r => [r.id, r]));
  // Zones concernées par chaque point de bascule (null : le monde entier)
  const BASCULE_ZONES = {
    coraux: ['nam', 'sam', 'afr', 'asi', 'oce'], pergelisol: ['nam', 'eur', 'asi'], groenland: null, antarctique: null,
    amazonie: ['sam'], amoc: ['nam', 'eur', 'afr'], boreale: ['nam', 'eur', 'asi'],
  };

  // --- Leviers politiques ------------------------------------------------
  const LEVIERS = [
    { id: 'bascarbone', nom: 'Énergies bas-carbone', sphere: 'atmo',
      effet: 'Remplace le fossile par du solaire, de l’éolien, de l’hydraulique et du nucléaire.',
      revers: 'Consomme des métaux. Moins efficace en Afrique sans financements.' },
    { id: 'efficacite', nom: 'Efficacité énergétique', sphere: 'atmo',
      effet: 'Produit autant avec moins d’énergie : isolation, moteurs, procédés.',
      revers: 'Effet rebond : une partie des économies est reconsommée.' },
    { id: 'sobriete', nom: 'Sobriété des pays riches', sphere: 'anthropo',
      effet: 'Ralentit la consommation des régions au-dessus de 30 000 $/hab. et limite l’effet rebond.',
      revers: 'Moins de croissance : la stabilité sociale baisse sans protection sociale.' },
    { id: 'protection', nom: 'Protection sociale', sphere: 'anthropo',
      effet: 'Rend les sociétés moins dépendantes de la croissance pour rester stables.',
      revers: 'Ne réduit aucune pression écologique à elle seule.' },
    { id: 'forets', nom: 'Forêts et aires protégées', sphere: 'bio',
      effet: 'Freine la déforestation, puis reboise (niveau 2 et plus).',
      revers: 'Moins de terres agricoles : pression sur l’alimentation.' },
    { id: 'agro', nom: 'Agroécologie et alimentation', sphere: 'bio',
      effet: 'Moins d’engrais et de viande, sols plus résistants aux sécheresses.',
      revers: 'Rendements un peu plus faibles.' },
    { id: 'peche', nom: 'Pêche durable', sphere: 'hydro',
      effet: 'Quotas de pêche, puis réserves marines au niveau 3.',
      revers: 'Moins de prises à court terme.' },
    { id: 'circulaire', nom: 'Économie circulaire', sphere: 'litho',
      effet: 'Recyclage, réparation, réemploi : moins de métaux extraits et moins de pollutions.',
      revers: 'Effet lent, à anticiper.' },
    { id: 'solidarite', nom: 'Solidarité et adaptation', sphere: 'anthropo',
      effet: 'Finance l’adaptation, la transition et l’accueil des déplacés dans les régions vulnérables.',
      revers: 'Un peu moins de croissance et de stabilité dans les régions riches.' },
    { id: 'sante', nom: 'Santé et éducation publiques', sphere: 'anthropo',
      effet: 'Soins de base, vaccination, écoles : l’espérance de vie et la scolarisation progressent, la fécondité baisse plus vite.',
      revers: 'Effets lents : il faut une génération pour qu’ils se voient pleinement.' },
    { id: 'eau', nom: 'Gestion de l’eau', sphere: 'hydro',
      effet: 'Irrigation goutte-à-goutte, recharge des nappes, réseaux d’eau potable et d’assainissement.',
      revers: 'Investissements lourds ; ne crée pas d’eau là où il ne pleut plus.' },
    { id: 'air', nom: 'Air et chimie', sphere: 'litho',
      effet: 'Sortie du charbon, filtres sur les usines et les véhicules, interdiction des substances les plus toxiques.',
      revers: 'Moins d’aérosols : la pollution de l’air tue moins, mais leur effet refroidissant disparaît, donc le climat se réchauffe un peu plus vite à court terme.' },
  ];

  // --- Points de bascule (plages d'après Armstrong McKay et al., 2022) -----
  const BASCULES = [
    { id: 'coraux', nom: 'Récifs coralliens tropicaux', sphere: 'hydro', lo: 1.0, mode: 1.5, hi: 2.0,
      effet: 'Les récifs tropicaux dépérissent : moins de poissons, biodiversité en chute.' },
    { id: 'pergelisol', nom: 'Pergélisol', sphere: 'cryo', lo: 1.0, mode: 1.5, hi: 2.3,
      effet: 'Le sol gelé de l’Arctique dégèle brutalement et relâche du carbone : +1,5 Gt de CO₂ par an.' },
    { id: 'groenland', nom: 'Calotte du Groenland', sphere: 'cryo', lo: 0.8, mode: 1.5, hi: 3.0,
      effet: 'La fonte devient irréversible : la mer monte plus vite, et continuera pendant des siècles.' },
    { id: 'antarctique', nom: 'Antarctique de l’Ouest', sphere: 'cryo', lo: 1.0, mode: 1.5, hi: 3.0,
      effet: 'Les glaciers s’effondrent dans l’océan : la hausse du niveau de la mer s’accélère.' },
    { id: 'amazonie', nom: 'Forêt amazonienne', sphere: 'bio', lo: 2.0, mode: 3.5, hi: 6.0, foret: 54,
      effet: 'La forêt se transforme en savane : elle relâche son carbone au lieu d’en absorber.' },
    { id: 'amoc', nom: 'Circulation atlantique (AMOC)', sphere: 'hydro', lo: 1.4, mode: 4.0, hi: 8.0,
      effet: 'Le grand courant atlantique s’effondre : hivers rudes en Europe, moussons perturbées.' },
    { id: 'boreale', nom: 'Forêt boréale', sphere: 'bio', lo: 1.4, mode: 4.0, hi: 5.0,
      effet: 'Les forêts du Grand Nord dépérissent et brûlent : +1 Gt de CO₂ par an.' },
  ];

  // --- Limites planétaires et plancher social : définis par js/terre.js et js/donut.js
  // Limite : { id, nom, court, desc, ratio(g) (1 = limite, 2 = haut risque), depassement(g), val(g), seuil, controles }
  // Plancher : { id, nom, court, desc, seuil, part(r) (part de la population de la région en manque, 0 à 1), valeur(r) }
  const LIMITES = [];
  const PLANCHERS = [];

  // Scénarios du GIEC (AR6, valeurs centrales approximatives, °C vs 1850-1900)
  const SSP = [
    { id: 'SSP1-1.9', pts: [[2025, 1.35], [2030, 1.5], [2050, 1.6], [2090, 1.4]] },
    { id: 'SSP1-2.6', pts: [[2025, 1.35], [2030, 1.5], [2050, 1.7], [2090, 1.8]] },
    { id: 'SSP2-4.5', pts: [[2025, 1.35], [2030, 1.5], [2050, 2.0], [2090, 2.7]] },
    { id: 'SSP3-7.0', pts: [[2025, 1.35], [2030, 1.5], [2050, 2.1], [2090, 3.6]] },
    { id: 'SSP5-8.5', pts: [[2025, 1.35], [2030, 1.5], [2050, 2.4], [2090, 4.4]] },
  ];

  // --- Utilitaires -------------------------------------------------------------
  function fr(x, d = 0) {
    return Number(x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function alea(st) {                       // mulberry32, état sérialisable
    st.rng = (st.rng + 0x6D2B79F5) >>> 0;
    let t = st.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function triangulaire(st, a, c, b) {
    const u = alea(st), f = (c - a) / (b - a);
    return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
  }
  // Fonction de répartition de la loi normale (Abramowitz et Stegun 7.1.26) et sa réciproque
  function phi(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
  }
  function phiInv(p) {
    let lo = -8, hi = 8;
    for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (phi(m) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  function energieParHab(r) { return r.E / r.pop * 1000; }    // GJ/hab.
  // Services énergétiques : énergie par habitant exprimée à l'efficacité de 2025
  function servicesEnergie(r) { return energieParHab(r) * (r.ei0 || r.ei) / r.ei; }
  function coutLevier(n) { return COUTS[n]; }
  function coutTotal(lev) { return Object.values(lev).reduce((a, n) => a + COUTS[n], 0); }
  const bascule = (st, id) => st.bascules.find(b => b.id === id).active;
  const popTotale = st => st.regions.reduce((a, r) => a + r.pop, 0);
  const popDe = (st, ids) => st.regions.filter(r => ids.includes(r.id)).reduce((a, r) => a + r.pop, 0);
  function stabiliteMoyenne(st) {
    return st.regions.reduce((a, r) => a + r.S * r.pop, 0) / popTotale(st);
  }

  // --- Nouvelle partie -------------------------------------------------------
  function nouvellePartie(seed) {
    seed = (seed >>> 0) || 1;
    const st = {
      version: 3, seed, rng: seed, t: ANNEE_DEBUT, year: ANNEE_DEBUT, fini: false, pret: false, calcul: false, prec: null,
      leviers: {}, prochaine: {}, acquis: {}, bonus: [], journal: [], pendants: [], hist: [], flags: {}, regions: [], bascules: [], g: {},
      actifs: { guerres: [], famines: [], epidemies: [] }, stats: {},
      morts: { guerre: 0, famine: 0, epidemie: 0, climat: 0 },
    };
    for (const l of LEVIERS) { st.leviers[l.id] = 0; st.prochaine[l.id] = 0; st.acquis[l.id] = 0; }
    for (const b of BASCULES) {
      st.bascules.push({ id: b.id, seuil: triangulaire(st, b.lo, b.mode, b.hi), active: false, annee: null });
    }
    const g = st.g;
    Object.assign(g, {
      T: 1.37, petrole0: 10200, petrole: 10200, eroi: 18, prodPetrole: 0, penuriePetrole: 0,
      metaux0: 150, metaux: 150, demMetaux: 1, penurieMetaux: 0,
      poissons: 420, K: 1000, effortBAU: 0.214, prises: 90, zonesMortes: 1,
      chocPIB: 0, chocAlim: 0, bonusTech: 0, co2Evt: 0, rebond: 0.45,
    });
    let totE = 0, totFoss = 0, LC = 0, gdp = 0, co2 = 0, aer = 0, aerNord = 0;
    for (const d of REGIONS) {
      const E = d.pop * d.gpc / 1000;                               // EJ
      const r = {
        id: d.id, nom: d.nom, court: d.court || d.nom, pop: d.pop, gP: d.gP0, s: d.s, S: d.S0, S0: d.S0, gRef: d.gY0,
        food: 1, crise: false, nbCrises: 0, cumCO2: d.hist * 1800, dmgEvt: 0, aer: d.aer,
        ei: E / (d.pop * d.y), ei0: E / (d.pop * d.y), fc: d.co2 / (E * (1 - d.s)), E, co2: d.co2, yEff: d.y, gEff: d.gY0,
      };
      const dmg0 = d.vuln * 0.012 * Math.max(0, g.T - 0.8) ** 2;
      r.dmg = dmg0; r.yPot = d.y / (1 - dmg0);
      st.regions.push(r);
      const foss = E * (1 - d.s);
      totE += E; totFoss += foss; LC += E * d.s; gdp += d.pop * d.y; co2 += d.co2;
      aer += foss * d.aer; aerNord += foss * d.aer * POIDS_NORD[d.id];
    }
    Object.assign(g, {
      foss0: totFoss, pib0: gdp, LCprec: LC, ajoutLC0: 4.5, prodPetrole: totFoss * 0.38, aer0: aer, aerNord0: aerNord,
      pibIdx: 1, combustion: 1, aerosolsIdx: 1, aerosolsNordIdx: 1, co2Fossile: co2 * 1.033,
      ch4Fossile: 125, n2oAutre: 1.8,
    });
    for (const m of modules) if (m.init) m.init(st, OUTILS);
    st.budget = calculerBudget(st);
    st.hist.push(instantane(st));
    journaliser(st, 'debut', 'Le monde en 2025',
      'Sept des neuf limites planétaires sont franchies (bilan de santé planétaire 2025). Le climat s’est réchauffé d’environ 1,4 °C. Près de 700 millions de personnes ont faim, 2,2 milliards n’ont pas d’eau potable sûre, et la population comme l’économie continuent de croître.',
      'Vous avez 75 ans pour faire entrer le monde dans le donut : sous le plafond écologique, au-dessus du plancher social. Aucun pays n’y parvient aujourd’hui. Le temps s’écoule : à vitesse normale, une minute vaut une année.', null);
    liberer(st, []);
    return st;
  }

  // --- Économie et énergie ----------------------------------------------------------
  // Part des émissions d'aérosols de chaque région qui pèse sur la différence entre hémisphères
  const POIDS_NORD = { nam: 1, eur: 1, asi: 1, afr: 0.5, sam: 0, oce: 0 };
  function economie(st) {
    const L = st.leviers, g = st.g, t = st.year - ANNEE_DEBUT;
    const rebond = Math.max(0, 0.45 - 0.12 * L.sobriete);
    g.rebond = rebond;
    let totE = 0, totFoss = 0, co2Reg = 0, LC = 0, gdp = 0, aer = 0, aerNord = 0;
    for (const r of st.regions) {
      const P = PARAM[r.id];
      const riche = r.yEff > SEUIL_RICHE;
      const fc = r.crise ? 0.5 : 1;
      // Croissance économique potentielle
      let gY = P.gYf + (P.gY0 - P.gYf) * Math.exp(-0.02 * t);
      if (riche) gY -= 0.006 * L.sobriete * fc;
      gY += riche ? -0.001 * L.solidarite : 0.002 * L.solidarite;
      gY += 0.004 * L.efficacite * rebond;
      // Capital humain : la santé et l'éducation (js/donut.js) soutiennent la productivité
      if (r.edu0 !== undefined) gY += 0.04 * (r.edu - r.edu0) + 0.0004 * (r.LE - r.LE0);
      // Dommages climatiques sur la croissance elle-même (et pas seulement sur le niveau du PIB) :
      // ils s'accumulent d'année en année, surtout dans les régions chaudes et pauvres (Burke et al., 2015)
      const adapt = clamp((riche ? 0.08 : 0.02) + 0.1 * L.solidarite * (riche ? 0.5 : 1.3), 0, 0.6);
      gY -= 0.003 * P.vuln * Math.max(0, g.T - 1.37) * (1 - adapt);
      if (r.crise) gY = -0.03;
      gY -= g.chocPIB;
      r.yPot *= 1 + gY;
      // Intensité énergétique
      r.ei *= 1 - (0.011 + 0.005 * L.efficacite * fc * (1 - rebond));
      // Énergies bas-carbone
      const eff = riche ? 1.15 : (r.id === 'afr' ? 0.55 + 0.2 * L.solidarite : 0.9 + 0.05 * L.solidarite);
      let ds = 0.0045 + g.bonusTech + 0.007 * L.bascarbone * fc * eff;
      ds *= 1 - g.penurieMetaux;
      r.s = Math.min(0.97, r.s + ds);
      r.fc *= 0.997 * (1 - 0.004 * L.air);                       // sortie du charbon : moins de carbone par unité fossile
      r.aer *= 1 - 0.015 - 0.05 * L.air;                         // filtres et désulfuration : moins d'aérosols par EJ
      // Dommages sur le niveau du PIB : événements extrêmes et montée des mers
      const dClim = P.vuln * 0.012 * Math.max(0, g.T - 0.8) ** 2;
      const dMer = 0.03 * Math.max(0, g.mer - 0.25) * P.cote;
      r.dmg = Math.min(0.5, (dClim + dMer) * (1 - adapt) + r.dmgEvt);
      const penEnergie = 0.9 * g.penuriePetrole + 0.15 * g.penurieMetaux;
      const prec = r.yEff;
      r.yEff = r.yPot * (1 - r.dmg) * (1 - penEnergie);
      r.gEff = r.yEff / prec - 1;
      // Identité de Kaya : CO2 = pop × PIB/hab × énergie/PIB × CO2/énergie
      r.E = r.pop * r.yEff * r.ei;
      const foss = r.E * (1 - r.s);
      r.co2 = foss * r.fc;
      r.cumCO2 += r.co2;
      totE += r.E; totFoss += foss; co2Reg += r.co2; LC += r.E * r.s; gdp += r.pop * r.yEff;
      aer += foss * r.aer; aerNord += foss * r.aer * POIDS_NORD[r.id];
    }
    g.totE = totE; g.totFoss = totFoss; g.LC = LC; g.gdp = gdp; g.co2Reg = co2Reg;
    g.pibIdx = gdp / g.pib0;
    g.combustion = totFoss / g.foss0;
    g.aerosolsIdx = aer / g.aer0; g.aerosolsNordIdx = aerNord / g.aerNord0;
    g.ch4Fossile = 125 * g.combustion * (1 - 0.12 * L.air);      // fuites de méthane (charbon, pétrole, gaz)
    g.n2oAutre = 1.8 * g.combustion;                              // industrie et combustion
  }

  // --- Ressources : pétrole, métaux, poissons ----------------------------------------
  function ressources(st) {
    const L = st.leviers, g = st.g, t = st.year - ANNEE_DEBUT;
    const totFoss = g.totFoss, totE = g.totE;
    // Pétrole : le coût énergétique d'extraction monte quand le stock baisse
    const demPetrole = totFoss * 0.38;
    g.eroi = 3 + 15 * Math.pow(Math.max(0, g.petrole) / g.petrole0, 1.2);
    const plafond = g.petrole / 18;
    const offre = Math.min(demPetrole, plafond);
    const manque = demPetrole - offre;
    const perteNette = offre * Math.max(0, 1 / g.eroi - 1 / 18);
    const charbon = 0.4 * manque;                                   // substitution par le charbon
    g.penuriePetrole = Math.max(0, (manque - charbon + perteNette) / totE);
    g.petrole -= offre; g.prodPetrole = offre;
    g.co2Fossile = g.co2Reg * 1.033 + charbon * 0.1;               // + ciment, + charbon liquéfié
    if (!st.flags.pic && manque > 0.02 * demPetrole) {
      st.flags.pic = st.year;
      journaliser(st, 'ressource', 'Pic pétrolier',
        'La production mondiale de pétrole ne suit plus la demande. Une partie du manque est comblée par du charbon liquéfié, encore plus émetteur.',
        'Une ressource finie ne s’arrête pas net : elle devient de plus en plus coûteuse à extraire, en argent et en énergie.', 'Mécanisme bien établi, date débattue', null, { photo: 'ressource-petrole' });
    }

    // Métaux : croissance économique + construction des infrastructures bas-carbone
    const ajoutLC = Math.max(0, g.LC - g.LCprec); g.LCprec = g.LC;
    const circ = 1 - 0.15 * L.circulaire;
    const demMet = (0.8 * Math.pow(g.gdp / g.pib0, 0.8) * Math.exp(-0.005 * t) + 0.2 * ajoutLC / g.ajoutLC0) * circ;
    const offreM = Math.min(demMet, g.metaux / 22);
    g.penurieMetaux = demMet > 0 ? 1 - offreM / demMet : 0;
    g.metaux -= offreM; g.demMetaux = demMet;
    if (!st.flags.metaux && g.penurieMetaux > 0.03) {
      st.flags.metaux = st.year;
      journaliser(st, 'ressource', 'Pénurie de métaux',
        'Cuivre, nickel, lithium : les mines ne suivent plus. Les chantiers d’éoliennes et de réseaux électriques ralentissent.',
        'La transition énergétique est aussi une transition matérielle : les limites se déplacent d’une sphère à l’autre.', 'Mécanisme établi, ampleur débattue', null, { photo: 'ressource-metaux' });
    }

    // Pêches : croissance logistique, effondrement sous 20 % de la capacité. La capacité baisse avec
    // le réchauffement, les récifs, l'acidification et les zones mortes dues aux engrais azotés.
    const acid = (3.57 - g.omega) / 0.71;
    g.K = 1000 * (1 - 0.12 * Math.max(0, g.T - 1.2)) * (bascule(st, 'coraux') ? 0.88 : 1) * (1 - 0.08 * Math.max(0, acid - 1))
      * (1 - 0.06 * Math.max(0, g.zonesMortes - 1));
    const rP = 0.36 * (L.peche === 3 ? 1.1 : 1);
    const quota = [Infinity, 0.2, 0.17, 0.14][L.peche];
    const F = Math.min(g.effortBAU, quota);
    if (g.effortBAU > quota) g.effortBAU += 0.04 * (quota - g.effortBAU);   // la flotte se réduit sous quota
    else g.effortBAU *= 1.015;
    const B = g.poissons;
    const croissance = rP * B * (1 - B / g.K) * Math.min(1, B / (0.2 * g.K));
    g.prises = F * B;
    g.poissons = Math.max(1, B + croissance - g.prises);
    if (!st.flags.peche && g.poissons < 0.2 * g.K) {
      st.flags.peche = st.year;
      journaliser(st, 'ressource', 'Effondrement des pêcheries',
        'Les grands stocks de poissons s’effondrent les uns après les autres. Les flottes restent à quai.',
        'Comme la morue de Terre-Neuve en 1992 : un stock surexploité peut s’effondrer brutalement et mettre des décennies à revenir.', 'Fait observé', null, { photo: 'ressource-peche' });
    }
  }

  // --- Stabilité sociale ---------------------------------------------------------------
  // Pas de retour automatique à la normale : la stabilité tend vers un niveau fixé par les conditions de vie
  // (manques du donut, inégalités, démocratie, guerres, pénuries, croissance), comparées à celles de 2025.
  const POIDS_STABILITE = { alim: 0.8, revenu: 0.5, sante: 0.4, eau: 0.2, energie: 0.2, logement: 0.2, educ: 0.1, reseaux: 0.05 };
  function stabilite(st) {
    const L = st.leviers, g = st.g;
    const sens = Math.max(0.3, 1 - 0.22 * L.protection);
    for (const r of st.regions) {
      const riche = r.yEff > SEUIL_RICHE;
      let cible = r.S0;
      if (r.manque && r.manque0) for (const [d, w] of Object.entries(POIDS_STABILITE)) cible += 100 * w * (r.manque0[d] - r.manque[d]);
      if (r.gini0 !== undefined) cible += -80 * (r.gini - r.gini0) + 0.1 * (r.demo - r.demo0);
      cible -= 7 * ((r.guerreInt || 0) - (r.guerreInt0 || 0));
      cible += 300 * (r.gEff - r.gRef) * sens;
      cible -= 300 * g.penuriePetrole + 50 * g.penurieMetaux;
      cible += 2 * L.protection + (riche ? -2 : 3) * L.solidarite;
      r.Scible = cible;
      r.S = clamp(r.S + 0.1 * (cible - r.S), 0, 100);
      if (!r.crise && r.S < 20) {
        r.crise = true; r.nbCrises++;
        journaliser(st, 'crise', `${r.court} entre en crise`,
          'Pénuries, chômage, défiance : les institutions ne parviennent plus à répondre. L’économie recule de 3 % par an et vos politiques y sont deux fois moins efficaces.',
          'Un effondrement réduit les émissions… au prix de souffrances immenses. Ce n’est pas une stratégie.', null, r.id,
          { touches: r.pop, labelTouches: 'Population de la région', photo: 'crise' });
      } else if (r.crise && r.S > 38) {
        r.crise = false;
        journaliser(st, 'sortie', `${r.court} sort de la crise`,
          'La société se réorganise et retrouve un peu de stabilité.', null, null, r.id,
          { touches: r.pop, labelTouches: 'Population de la région', photo: 'crise' });
      }
    }
  }

  function verifierBascules(st) {
    const g = st.g;
    for (const b of st.bascules) {
      if (b.active) continue;
      const def = BASCULES.find(x => x.id === b.id);
      const depasse = g.T >= b.seuil || (def.foret && g.foret < def.foret);
      if (depasse && alea(st) < 0.3) {
        b.active = true; b.annee = st.year;
        if (b.id === 'coraux') g.bii -= 2;
        if (b.id === 'amazonie') { g.bii -= 3; st.regions.find(r => r.id === 'sam').S -= 10; }
        if (b.id === 'boreale') g.bii -= 1;
        if (b.id === 'amoc') { for (const r of st.regions) if (r.id === 'eur' || r.id === 'afr') r.S -= 8; }
        journaliser(st, 'bascule', `Point de bascule franchi : ${def.nom}`, def.effet,
          'Une fois franchi, un point de bascule s’entretient tout seul : réduire les émissions ne suffit plus à revenir en arrière.',
          'Seuils incertains (Armstrong McKay et al., 2022)', null, { regions: BASCULE_ZONES[b.id], photo: `bascule-${b.id}` });
      }
    }
  }

  // --- Événements --------------------------------------------------------
  function choisirRegion(st, poids) {
    const tot = st.regions.reduce((a, r) => a + poids(r), 0);
    let u = alea(st) * tot;
    for (const r of st.regions) { u -= poids(r); if (u <= 0) return r; }
    return st.regions[st.regions.length - 1];
  }
  function choisirParmi(st, liste, poids) {
    const tot = liste.reduce((a, x) => a + poids(x), 0);
    let u = alea(st) * tot;
    for (const x of liste) { u -= poids(x); if (u <= 0) return x; }
    return liste[liste.length - 1];
  }
  const variante = (st, textes) => textes[Math.floor(alea(st) * textes.length)];

  // Nombre d'occurrences sur une année pour un taux annuel donné (loi de Poisson)
  function poisson(st, taux) {
    if (taux <= 0) return 0;
    let k = 0, p = Math.exp(-taux), s = p;
    const u = alea(st);
    while (u > s && k < 6) { k++; p *= taux / k; s += p; }
    return k;
  }
  // Retire des morts (en millions) à une région et les compte par cause
  function tuer(st, r, morts, cause) {
    const m = Math.max(0, Math.min(morts, r.pop * 0.5));
    r.pop -= m; st.morts[cause] = (st.morts[cause] || 0) + m;
    return m;
  }

  const K_EVT = 0.05;                       // taux annuel = K_EVT × poids de l'événement
  const EVENEMENTS = [
    { id: 'canicule', cat: 'climat', gravite: 2, poids: st => Math.max(0, (st.g.T - 1) * 2.2),
      jouer(st) {
        const r = choisirRegion(st, x => PARAM[x.id].vuln * Math.sqrt(x.pop));
        r.S -= 7; st.g.chocAlim += 0.02;
        const morts = tuer(st, r, r.pop * 0.00004 * PARAM[r.id].vuln * st.g.T, 'climat');
        return [`Canicule historique : ${r.court}`, 'Récoltes perdues, hôpitaux saturés, centrales électriques à l’arrêt faute d’eau de refroidissement.',
          'Chaque dixième de degré supplémentaire rend les vagues de chaleur extrêmes plus fréquentes et plus intenses.', 'Confiance très élevée (GIEC)', r.id, morts, { touches: r.pop * 0.04 * PARAM[r.id].vuln }];
      } },
    { id: 'secheresse', cat: 'climat', gravite: 2, poids: st => Math.max(0, (st.g.T - 1.1) * 1.6),
      jouer(st) {
        st.g.chocAlim += 0.06;
        for (const r of st.regions) if (r.id === 'afr' || r.id === 'asi') r.S -= 3;
        return ['Sécheresses simultanées', 'Plusieurs greniers à blé du monde manquent d’eau la même année. Les prix alimentaires flambent.',
          'Quand plusieurs grandes régions agricoles sont touchées en même temps, les stocks mondiaux ne suffisent plus à amortir le choc.', 'Confiance moyenne (GIEC)', null, null, { regions: ['afr', 'asi'], touches: popDe(st, ['afr', 'asi']) * 0.03 }];
      } },
    { id: 'inondation', cat: 'climat', gravite: 2, poids: st => Math.max(0, (st.g.T - 1) * 1.5),
      jouer(st) {
        const r = choisirRegion(st, x => PARAM[x.id].cote * Math.sqrt(x.pop));
        r.S -= 5; r.dmgEvt += 0.02;
        const morts = tuer(st, r, r.pop * 0.00001 * PARAM[r.id].cote * PARAM[r.id].vuln, 'climat');
        return [`Inondations : ${r.court}`, 'Des pluies diluviennes et une mer plus haute submergent villes côtières et vallées.',
          'Un air plus chaud contient plus de vapeur d’eau, environ 7 % de plus par degré : les pluies extrêmes s’intensifient.', 'Confiance élevée (GIEC)', r.id, morts, { touches: r.pop * 0.003 * PARAM[r.id].cote * PARAM[r.id].vuln }];
      } },
    { id: 'cyclone', cat: 'climat', gravite: 2, poids: st => 0.2 + Math.max(0, (st.g.T - 1) * 1.2),
      jouer(st) {
        const r = choisirRegion(st, x => PARAM[x.id].cote * Math.sqrt(x.pop));
        r.S -= 4; r.dmgEvt += 0.015;
        const morts = tuer(st, r, r.pop * 0.000012 * PARAM[r.id].cote * PARAM[r.id].vuln * st.g.T, 'climat');
        return [`Cyclone dévastateur : ${r.court}`, 'Des vents de plus de 250 km/h et une onde de tempête rasent des villes côtières. Des millions de personnes sont déplacées.',
          'Les cyclones les plus puissants gagnent en fréquence avec le réchauffement, même si leur nombre total ne change guère.', 'Confiance moyenne (GIEC)', r.id, morts, { touches: r.pop * 0.004 * PARAM[r.id].cote * PARAM[r.id].vuln }];
      } },
    { id: 'feux', cat: 'climat', gravite: 2, poids: st => Math.max(0, (st.g.T - 1) * 1.2),
      jouer(st) {
        st.g.foret -= 0.4; st.g.bii -= 0.3; st.g.co2Evt += 1.5;
        return ['Mégafeux', 'Des millions d’hectares de forêt brûlent en zone boréale et méditerranéenne.',
          'Les forêts qui brûlent relâchent leur carbone : une rétroaction qui amplifie le réchauffement.', 'Confiance élevée (GIEC)', null, null, { regions: ['nam', 'eur'], touches: popDe(st, ['nam', 'eur']) * 0.004 }];
      } },
    { id: 'techno', cat: 'eco', gravite: 1, poids: () => 1.0,
      jouer(st) {
        st.g.bonusTech += 0.0012;
        return ['Percée technologique', 'Le prix des panneaux solaires et des batteries chute encore.',
          'Une technologie moins chère accélère la transition, mais ne réduit pas à elle seule la consommation d’énergie.', 'Tendance observée', null, null];
      } },
    { id: 'gisement', cat: 'ressource', gravite: 1, poids: () => 0.6,
      jouer(st) {
        st.g.petrole += 600;
        return ['Nouveau gisement de pétrole', 'Un vaste gisement offshore est découvert : 100 milliards de barils.',
          'Plus de réserves, c’est un répit pour l’économie et plus de CO₂ en puissance. Les réserves fossiles connues dépassent déjà de loin le budget carbone.', 'Fait établi', null, null];
      } },
    { id: 'krach', cat: 'eco', gravite: 2, poids: () => 0.5,
      jouer(st) {
        st.g.chocPIB += 0.012;
        for (const r of st.regions) r.S -= 5;
        return ['Krach financier mondial', 'Les marchés s’effondrent, le crédit se tarit, le chômage monte partout.',
          'Dans une économie mondialisée, un choc financier se propage en quelques semaines à tous les continents.', 'Fait observé (2008)', null, null, { touches: popTotale(st) * 0.01, labelTouches: 'Emplois perdus (estimation)' }];
      } },
    { id: 'cop', cat: 'politique', gravite: 2, poids: st => 0.4 + stabiliteMoyenne(st) / 100,
      jouer(st) {
        st.bonus.push({ n: 2, fin: st.year + 5 });
        return ['Accord international ambitieux', 'Une COP aboutit à des engagements chiffrés et vérifiables.',
          'La coopération augmente ce que chaque pays est prêt à faire : +2 de capital politique pendant 5 ans.', 'Règle du jeu', null, null];
      } },
    { id: 'migrations', cat: 'politique', gravite: 2, poids: st => Math.max(0, st.g.T - 1.6) + 0.5 * st.regions.filter(r => r.crise).length,
      jouer(st) {
        for (const r of st.regions) r.S -= (r.yEff > SEUIL_RICHE ? 4 : 2);
        return ['Déplacements de population', 'Des millions de personnes quittent des régions devenues trop chaudes, trop sèches ou submergées.',
          'La plupart des déplacés climatiques restent dans leur pays ou leur région : les pays pauvres en accueillent le plus.', 'Confiance élevée (GIEC)', null, null, { touches: popTotale(st) * 0.003, labelTouches: 'Personnes déplacées (estimation)' }];
      } },
    { id: 'entraide', cat: 'politique', gravite: 1, poids: st => 0.4 + 0.3 * st.leviers.protection + 0.2 * st.leviers.solidarite,
      jouer(st) {
        const r = st.regions.reduce((a, x) => (x.S < a.S ? x : a));
        r.S += 6;
        return [`Réseaux d’entraide : ${r.court}`, 'Coopératives, circuits courts et associations de quartier se multiplient.',
          'La résilience d’une société dépend aussi de sa cohésion et de sa capacité à s’organiser localement.', 'Observé', r.id, null, { touches: r.pop * 0.002, labelTouches: 'Personnes impliquées (estimation)' }];
      } },
  ];

  // Épisodes climatiques fréquents et de moindre portée : ils alimentent le journal sans bouleverser le modèle
  const MINEURS = [
    { poids: st => 1 + 2 * Math.max(0, st.g.T - 1), reg: r => PARAM[r.id].vuln * Math.sqrt(r.pop),
      cle: 'chaleur', touches: r => r.pop * 0.002 * PARAM[r.id].vuln,
      titre: r => `Vague de chaleur : ${r.court}`,
      textes: ['Plusieurs jours consécutifs à plus de 40 °C : hôpitaux et réseaux électriques sous tension.',
        'Des records de température tombent. Les personnes âgées et les travailleurs en plein air sont les plus touchés.'],
      morts: (r, T) => r.pop * 0.000004 * PARAM[r.id].vuln * T },
    { poids: st => 0.8 + 1.5 * Math.max(0, st.g.T - 1), reg: r => PARAM[r.id].cote * Math.sqrt(r.pop),
      cle: 'tempete', touches: r => r.pop * 0.0008 * PARAM[r.id].cote,
      titre: r => `Tempête violente : ${r.court}`,
      textes: ['Vents destructeurs et submersion de la côte : routes coupées, des milliers de sinistrés.',
        'Une tempête exceptionnelle arrache des toitures et prive des centaines de milliers de foyers d’électricité.'],
      morts: (r, T) => r.pop * 0.000002 * PARAM[r.id].cote * PARAM[r.id].vuln * T },
    { poids: st => 0.8 + 1.5 * Math.max(0, st.g.T - 1), reg: r => Math.sqrt(r.pop),
      cle: 'pluies', touches: r => r.pop * 0.0006,
      titre: r => `Pluies diluviennes : ${r.court}`,
      textes: ['Un mois de pluie en deux jours : rivières en crue, récoltes noyées, quartiers évacués.',
        'Des crues soudaines emportent des routes et des ponts.'],
      morts: (r) => r.pop * 0.000001 },
    { poids: st => 0.4 + 1.2 * Math.max(0, st.g.T - 1), reg: r => PARAM[r.id].vuln * Math.sqrt(r.pop),
      cle: 'secheresse', touches: r => r.pop * 0.004,
      titre: r => `Sécheresse prolongée : ${r.court}`,
      textes: ['Rivières à sec, réservoirs au plus bas, restrictions d’eau et récoltes en baisse.',
        'Plusieurs saisons sans pluie suffisante : le bétail meurt et les prix des céréales montent.'],
      morts: null },
    { poids: st => 0.4 + 1.2 * Math.max(0, st.g.T - 1), reg: r => Math.sqrt(r.pop),
      cle: 'feux', touches: r => r.pop * 0.0002,
      titre: r => `Incendies de forêt : ${r.court}`,
      textes: ['Des milliers d’hectares partent en fumée ; des villages sont évacués.',
        'Un été sec favorise des incendies hors de contrôle, avec des fumées visibles à des centaines de kilomètres.'],
      morts: (r) => r.pop * 0.0000005 },
  ];

  function tirerEvenements(st) {
    for (const e of EVENEMENTS) {
      const n = poisson(st, K_EVT * e.poids(st));
      for (let i = 0; i < n; i++) {
        const [titre, texte, lecon, conf, region, morts, details] = e.jouer(st);
        journaliser(st, e.cat, titre, texte, lecon, conf, region, { gravite: e.gravite, morts, photo: e.id, ...details });
      }
    }
    const n = poisson(st, 0.25 + 1.2 * Math.max(0, st.g.T - 1));
    for (let i = 0; i < n; i++) {
      const m = choisirParmi(st, MINEURS, x => x.poids(st));
      const r = choisirRegion(st, m.reg);
      r.S -= 0.5;
      const morts = m.morts ? tuer(st, r, m.morts(r, st.g.T), 'climat') : 0;
      journaliser(st, 'climat', m.titre(r), variante(st, m.textes), null, null, r.id, { gravite: 1, morts, photo: m.cle, touches: m.touches(r) });
    }
    for (const r of st.regions) r.S = clamp(r.S, 0, 100);
  }

  // --- Journal : les événements sont datés au mois près et révélés quand l'horloge les atteint
  const CAT_DE_TYPE = { debut: 'politique', sortie: 'crise' };
  const GRAVITE_DE_TYPE = { debut: 1, ressource: 2, crise: 3, sortie: 2, bascule: 3 };
  function journaliser(st, type, titre, texte, lecon, confiance, region = null, extra = {}) {
    const date = st.calcul ? st.year - 1 + alea(st) : st.t;
    st.nextId = (st.nextId || 0) + 1;
    const e = {
      id: st.nextId, annee: Math.floor(date), date, type, cat: extra.cat || CAT_DE_TYPE[type] || type,
      gravite: extra.gravite || GRAVITE_DE_TYPE[type] || 2, titre, texte, lecon, confiance, region,
      regions: extra.regions !== undefined ? extra.regions : (region ? [region] : null),   // null : le monde entier
      touches: extra.touches === undefined ? null : extra.touches, labelTouches: extra.labelTouches || null,
      photo: extra.photo || type, details: extra.details || null, enCours: extra.enCours === undefined ? null : extra.enCours,
      morts: extra.morts || null,
    };
    st.pendants.push(e);
    return e;
  }
  // Retrouve un événement du journal (révélé ou non) pour mettre à jour son bilan tant qu'il dure
  function trouverEvenement(st, id) {
    return st.journal.find(e => e.id === id) || st.pendants.find(e => e.id === id) || null;
  }
  function liberer(st, sortie) {
    if (!st.pendants.length) return;
    st.pendants.sort((a, b) => a.date - b.date);
    let n = 0;
    while (n < st.pendants.length && st.pendants[n].date <= st.t) n++;
    for (const e of st.pendants.splice(0, n)) { st.journal.push(e); sortie.push(e); }
  }

  // --- Capital politique -------------------------------------------------------
  const bonusCapital = st => st.bonus.filter(b => b.fin > st.year).reduce((a, b) => a + b.n, 0);
  function calculerBudget(st) {
    const crises = st.regions.filter(r => r.crise).length;
    const guerres = st.actifs.guerres.filter(w => w.intensite >= 2).length;
    const b = Math.round(10 + (stabiliteMoyenne(st) - 55) / 7) + bonusCapital(st) - 2 * crises - guerres;
    return clamp(b, 3, 16);
  }
  // Le capital politique varie d'un point par an au plus. S'il reste sous le coût des politiques pendant
  // deux ans, la plus coûteuse est abandonnée d'un niveau.
  function ajusterBudget(st) {
    const cible = calculerBudget(st);
    st.budget += clamp(cible - st.budget, -1, 1);
    if (coutTotal(st.leviers) <= st.budget) { st.deficit = 0; return; }
    st.deficit = (st.deficit || 0) + 1;
    if (st.deficit < 2) return;
    st.deficit = 0;
    const ids = Object.keys(st.leviers).filter(id => st.leviers[id] > 0);
    if (!ids.length) return;
    ids.sort((a, b) => st.leviers[b] - st.leviers[a] || st.prochaine[b] - st.prochaine[a]);
    const l = LEVIERS.find(x => x.id === ids[0]);
    st.leviers[l.id]--;
    journaliser(st, 'politique', `Politique abandonnée : ${l.nom}`,
      `Faute de capital politique, le niveau de cette politique est ramené à « ${['aucun', 'modéré', 'fort', 'maximal'][st.leviers[l.id]]} ». Vous pourrez le relever quand le capital sera revenu.`,
      'Guerres, crises et défiance réduisent la capacité des gouvernements à agir dans la durée.', null, null, { gravite: 2, photo: 'politique' });
  }
  function verifierReglage(st, id, n) {
    if (st.fini) return { ok: false, raison: 'La partie est terminée.' };
    const cur = st.leviers[id];
    if (n === cur) return { ok: true };
    if (n < cur) return { ok: true };
    if (coutTotal(st.leviers) - COUTS[cur] + COUTS[n] > st.budget) return { ok: false, raison: 'Capital politique insuffisant.' };
    if (n <= st.acquis[id]) return { ok: true };            // retour à un niveau déjà atteint : pas de délai
    if (n > st.acquis[id] + 1) return { ok: false, raison: 'Une politique ne monte que d’un niveau à la fois.' };
    if (st.t < st.prochaine[id]) return { ok: false, raison: `Prochaine hausse possible en ${Math.ceil(st.prochaine[id])}.` };
    return { ok: true };
  }
  function regler(st, id, n) {
    const v = verifierReglage(st, id, n);
    if (!v.ok) return v;
    if (n > st.acquis[id]) { st.acquis[id] = n; st.prochaine[id] = st.t + DELAI; }
    st.leviers[id] = n;
    return v;
  }

  function instantane(st) {
    const g = st.g;
    const pop = popTotale(st);
    const h = {
      a: st.year, T: g.T, em: g.emissions, pop, pib: st.regions.reduce((a, r) => a + r.pop * r.yEff, 0) / 1e6,
      petrole: g.prodPetrole / 6, prises: g.prises, foret: g.foret, bii: g.bii, S: stabiliteMoyenne(st),
      mer: g.mer, metaux: g.metaux, poissons: g.poissons, K: g.K, phi: g.phi,
      popR: st.regions.map(r => r.pop), res: (g.petrole / g.petrole0 + g.metaux / g.metaux0) / 2, nouv: g.nouvelles,
    };
    const m = mesures(st);
    Object.assign(h, { depasse: m.depassement, manque: m.manque, lim: m.parLimite.map(x => x.z), limDep: m.parLimite.map(x => x.dep), pl: m.parPlancher.map(x => x.part) });
    for (const m of modules) if (m.instantane) Object.assign(h, m.instantane(st));
    return h;
  }

  // --- Écoulement du temps ---------------------------------------------------
  // L'état `st` contient toujours l'année en cours de traversée déjà calculée (st.year) ; `st.prec` garde
  // l'état de l'année précédente, pour que l'interface affiche une évolution continue entre les deux.
  function snapshot(st) {
    return { g: structuredClone(st.g), regions: structuredClone(st.regions), morts: { ...st.morts },
      migr: st.migr ? { stock: { ...st.migr.stock }, cum: { ...st.migr.cum } } : null };
  }

  function etape(st, nom) {
    for (const m of modules) if (m.etapes && m.etapes[nom]) m.etapes[nom](st, OUTILS);
  }
  function calculerAnnee(st) {
    st.prec = snapshot(st);
    st.calcul = true;
    st.year++;
    economie(st);
    ressources(st);
    etape(st, 'alimentation');
    etape(st, 'terre');
    verifierBascules(st);
    etape(st, 'social');
    stabilite(st);
    st.g.chocPIB *= 0.75; st.g.chocAlim *= 0.75;               // les chocs s'estompent d'une année à l'autre
    for (const r of st.regions) r.dmgEvt *= 0.75;
    for (const m of modules) if (m.annee) m.annee(st, OUTILS);
    if (st.year < ANNEE_FIN) tirerEvenements(st);
    ajusterBudget(st);
    st.calcul = false; st.pret = true;
  }

  // Fait avancer l'horloge de `dt` années. Renvoie les événements révélés pendant ce laps de temps.
  function avancerTemps(st, dt) {
    const nouveaux = [];
    if (st.fini) return { nouveaux };
    st.t = Math.min(ANNEE_FIN, st.t + dt);
    for (let garde = 0; garde < 100; garde++) {
      if (!st.pret) calculerAnnee(st);
      liberer(st, nouveaux);
      if (st.t < st.year) break;
      st.hist.push(instantane(st));
      st.pret = false;
      if (st.year >= ANNEE_FIN) { st.fini = true; st.bilan = bilan(st); break; }
    }
    return { nouveaux };
  }

  // Vue de l'état à l'instant st.t : les grandeurs numériques sont interpolées entre l'année précédente et la suivante
  function vue(st) {
    if (!st.prec) return st;
    const f = clamp(st.t - (st.year - 1), 0, 1);
    const mix = (a, b) => {
      const o = { ...b };
      for (const k in b) {
        if (typeof b[k] === 'number' && typeof a[k] === 'number') o[k] = a[k] + (b[k] - a[k]) * f;
        else if (b[k] && a[k] && typeof b[k] === 'object' && typeof a[k] === 'object' && !Array.isArray(b[k])) o[k] = mix(a[k], b[k]);
      }
      return o;
    };
    const v = { ...st, g: mix(st.prec.g, st.g), regions: st.regions.map((r, i) => mix(st.prec.regions[i], r)), morts: mix(st.prec.morts, st.morts) };
    if (st.migr && st.prec.migr) v.migr = { ...st.migr, stock: mix(st.prec.migr.stock, st.migr.stock), cum: mix(st.prec.migr.cum, st.migr.cum) };
    return v;
  }

  // --- Indicateurs agrégés pour l'interface ----------------------------------
  // Mesures du donut, à la manière de Fanning et Raworth (Nature, 2025) :
  // - dépassement écologique : écart moyen des 9 limites à leur seuil (0 = dans la limite ; plafonné à 300 % par limite) ;
  // - manque social : part moyenne de la population mondiale en manque sur les 12 dimensions.
  function mesures(st) {
    const g = st.g, pop = popTotale(st);
    const parLimite = LIMITES.map(l => ({ id: l.id, z: l.ratio(g), dep: l.depassement(g) }));
    const parPlancher = PLANCHERS.map(p => ({ id: p.id, part: st.regions.reduce((a, r) => a + r.pop * p.part(r), 0) / pop }));
    const depassement = parLimite.reduce((a, x) => a + Math.min(3, x.dep), 0) / Math.max(1, parLimite.length);
    const manque = parPlancher.reduce((a, x) => a + x.part, 0) / Math.max(1, parPlancher.length);
    return { parLimite, parPlancher, depassement, manque };
  }
  function manquesSociaux(st) {
    const m = mesures(st);
    return PLANCHERS.map((p, i) => ({ ...p, manque: m.parPlancher[i].part }));
  }
  const partSousPlancher = st => mesures(st).manque;
  // Budget carbone restant depuis début 2025 : 130 Gt CO2 pour 1,5 °C (Forster et al., 2025) ; pour 2 °C,
  // environ 950 Gt CO2 (GIEC AR6 : 1 150 Gt depuis 2020 à 67 %, moins ~200 Gt émis de 2020 à 2024).
  function budgetCarbone(st) {
    const total = 950, utilise = st.g.cum - st.g.cum2025;
    return { total, utilise, part: utilise / total, anneesRestantes: (total - utilise) / Math.max(0.1, st.g.emissions), budget15: 130 };
  }
  function croissanceMondiale(st) {
    const h = st.hist;
    if (h.length < 2) return 0.027;
    const a = h[h.length - 1], b = h[Math.max(0, h.length - 6)];
    return Math.pow(a.pib / b.pib, 1 / Math.max(1, a.a - b.a)) - 1;
  }

  function bilan(st) {
    const g = st.g;
    const m = mesures(st), h0 = st.hist[0];
    const franchies = LIMITES.filter(l => l.ratio(g) > 1).length;
    const rouges = LIMITES.filter(l => l.ratio(g) > l.hr).length;
    const crisesTotales = st.regions.reduce((a, r) => a + r.nbCrises, 0);
    const enCrise = st.regions.filter(r => r.crise).length;
    const bascules = st.bascules.filter(b => b.active).length;
    const popMax = Math.max(...st.hist.map(h => h.pop)), popFin = popTotale(st);
    // Le dépassement écologique ne peut pas revenir à son niveau de 2025 en un siècle (CO2 accumulé, extinctions,
    // azote) : une « descente maîtrisée » demande qu'il ait passé son pic et décroisse.
    const pic = Math.max(...st.hist.filter(h => h.a >= ANNEE_FIN - 30).map(h => h.depasse));
    const enBaisse = m.depassement < pic - 0.02;
    let issue;
    if (m.manque <= 0.05 && m.depassement <= 0.10 && g.T <= 2.0 && enCrise === 0) issue = 'donut';
    else if (m.manque <= 0.8 * h0.manque && enBaisse && enCrise === 0 && g.T <= 2.5) issue = 'descente';
    else if (enCrise >= 3 || m.manque >= 1.3 * h0.manque || g.T >= 3.5 || popFin < 0.85 * popMax) issue = 'effondrement';
    else issue = 'declin';
    const h90 = st.hist.find(h => h.a === 2090) || st.hist[st.hist.length - 1];
    let ssp = SSP[0], ecart = Infinity;
    for (const s of SSP) { const d = Math.abs(s.pts[3][1] - h90.T); if (d < ecart) { ecart = d; ssp = s; } }
    const res = {
      issue, T: g.T, franchies, rouges, crisesTotales, enCrise, bascules, ssp: ssp.id, mer: g.mer, depassementPic: pic,
      depassement: m.depassement, manque: m.manque, depassement0: h0.depasse, manque0: h0.manque,
      parLimite: m.parLimite.map((x, i) => ({ ...x, z0: h0.lim[i], dep0: h0.limDep[i] })),
      parPlancher: m.parPlancher.map((x, i) => ({ ...x, part0: h0.pl[i] })),
    };
    for (const mo of modules) if (mo.bilan) Object.assign(res, mo.bilan(st));
    return res;
  }

  // Outils mis à disposition des modules (js/societe.js…)
  const OUTILS = {
    ANNEE_DEBUT, ANNEE_FIN, SEUIL_RICHE, PARAM, clamp, alea, triangulaire, choisirRegion, choisirParmi, variante, poisson,
    tuer, journaliser, trouverEvenement, popTotale, popDe, stabiliteMoyenne, bascule, fr, phi, phiInv, LEVIERS,
  };

  return {
    ANNEE_DEBUT, ANNEE_FIN, DELAI, CATEGORIES, COUTS, REGIONS, LEVIERS, BASCULES, LIMITES, PLANCHERS, SSP, SEUIL_RICHE,
    nouvellePartie, avancerTemps, vue, regler, verifierReglage, enregistrer: m => modules.push(m),
    coutTotal, coutLevier, manquesSociaux, partSousPlancher, mesures, phi, phiInv,
    budgetCarbone, croissanceMondiale, energieParHab, stabiliteMoyenne, fr,
  };
})();
if (typeof module !== 'undefined') module.exports = Atterrir;
