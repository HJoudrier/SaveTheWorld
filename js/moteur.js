// =====================================================================
//  ATTERRIR — moteur de simulation (aucune dépendance au DOM)
//  Ordres de grandeur arrondis (~2024), à remplacer par des séries sourcées
//  (Our World in Data, Global Carbon Budget, USGS, FAO, PIK…).
// =====================================================================
const Atterrir = (() => {
  'use strict';

  const ANNEE_DEBUT = 2025, ANNEE_FIN = 2100, PAS = 5;
  const COUTS = [0, 1, 2, 4];               // coût cumulé d'un levier selon son niveau
  const SEUIL_RICHE = 30000;                // $ PPA / hab.

  // --- Régions (découpage « continents » d'Our World in Data) ----------
  // pop : millions ; y : PIB/hab ($ PPA) ; gpc : énergie primaire (GJ/hab)
  // co2 : Gt CO2 fossile/an ; s : part bas-carbone de l'énergie ; hist : part du cumul historique
  const REGIONS = [
    { id: 'nam', nom: 'Amérique du Nord', pop: 610, y: 48000, gpc: 195, co2: 6.1, s: 0.20, hist: 0.27, S0: 58,
      gP0: 0.006, gPf: -0.001, kP: 0.03, gY0: 0.016, gYf: 0.010, vuln: 0.8, cote: 0.8 },
    { id: 'sam', nom: 'Amérique du Sud', pop: 440, y: 16000, gpc: 60, co2: 1.1, s: 0.33, hist: 0.03, S0: 50,
      gP0: 0.006, gPf: -0.006, kP: 0.03, gY0: 0.022, gYf: 0.012, vuln: 1.2, cote: 0.8 },
    { id: 'eur', nom: 'Europe (avec la Russie)', court: 'Europe', pop: 745, y: 38000, gpc: 135, co2: 4.9, s: 0.28, hist: 0.31, S0: 60,
      gP0: -0.001, gPf: -0.004, kP: 0.03, gY0: 0.013, gYf: 0.009, vuln: 0.7, cote: 0.7 },
    { id: 'afr', nom: 'Afrique', pop: 1500, y: 5500, gpc: 16, co2: 1.45, s: 0.10, hist: 0.03, S0: 46,
      gP0: 0.023, gPf: -0.002, kP: 0.018, gY0: 0.032, gYf: 0.015, vuln: 1.8, cote: 1.0 },
    { id: 'asi', nom: 'Asie', pop: 4800, y: 17000, gpc: 70, co2: 22.3, s: 0.15, hist: 0.33, S0: 62,
      gP0: 0.006, gPf: -0.005, kP: 0.03, gY0: 0.030, gYf: 0.010, vuln: 1.3, cote: 1.5 },
    { id: 'oce', nom: 'Océanie', pop: 46, y: 42000, gpc: 180, co2: 0.45, s: 0.15, hist: 0.013, S0: 64,
      gP0: 0.011, gPf: 0.001, kP: 0.03, gY0: 0.015, gYf: 0.010, vuln: 1.0, cote: 1.0 },
  ];
  const PARAM = Object.fromEntries(REGIONS.map(r => [r.id, r]));

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
      effet: 'Finance l’adaptation et la transition des régions vulnérables.',
      revers: 'Un peu moins de croissance et de stabilité dans les régions riches.' },
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

  // --- Limites planétaires : ratio = 1 à la limite, hr = début de la zone à haut risque
  const LIMITES = [
    { id: 'climat', nom: 'Changement climatique', court: 'Climat', hr: (450 - 280) / 70,
      ratio: g => (g.ppm - 280) / 70, val: g => `${Math.round(g.ppm)} ppm de CO₂`, seuil: 'limite : 350 ppm' },
    { id: 'biosphere', nom: 'Intégrité de la biosphère', court: 'Biosphère', hr: 2,
      ratio: g => (100 - g.bii) / 10, val: g => `${fr(g.bii, 1)} % d’intégrité`, seuil: 'limite : 90 %' },
    { id: 'sols', nom: 'Usage des sols', court: 'Forêts', hr: 46 / 25,
      ratio: g => (100 - g.foret) / 25, val: g => `${fr(g.foret, 1)} % du couvert forestier d’origine`, seuil: 'limite : 75 %' },
    { id: 'eau', nom: 'Eau douce', court: 'Eau douce', hr: 2,
      ratio: g => g.eau, val: g => `indice ${fr(g.eau, 2)}`, seuil: 'limite : 1' },
    { id: 'azote', nom: 'Azote et phosphore', court: 'Engrais', hr: 200 / 62,
      ratio: g => g.azote / 62, val: g => `${Math.round(g.azote)} Mt d’azote par an`, seuil: 'limite : 62 Mt' },
    { id: 'acid', nom: 'Acidification des océans', court: 'Acidité', hr: 2,
      ratio: g => (3.44 - g.omega) / 0.69, val: g => `Ω aragonite ${fr(g.omega, 2)}`, seuil: 'limite : 2,75' },
    { id: 'nouvelles', nom: 'Entités nouvelles', court: 'Pollutions', hr: 2.5,
      ratio: g => g.nouvelles, val: g => `indice ${fr(g.nouvelles, 2)} (plastiques, chimie)`, seuil: 'limite : 1' },
    { id: 'aerosols', nom: 'Aérosols atmosphériques', court: 'Aérosols', hr: 2,
      ratio: g => g.aerosols, val: g => `indice ${fr(g.aerosols, 2)}`, seuil: 'limite : 1' },
    { id: 'ozone', nom: 'Couche d’ozone', court: 'Ozone', hr: 2,
      ratio: g => g.ozone, val: g => `indice ${fr(g.ozone, 2)} (en reconstitution)`, seuil: 'limite : 1' },
  ];

  // --- Plancher social -------------------------------------------------------
  const PLANCHERS = [
    { id: 'revenu', court: 'Revenu', nom: 'Revenu', val: r => r.yEff / 12000, seuil: '12 000 $/hab.' },
    { id: 'alim', court: 'Alimentation', nom: 'Alimentation', val: r => r.food, seuil: 'indice 1' },
    { id: 'energie', court: 'Énergie', nom: 'Accès à l’énergie', val: r => servicesEnergie(r) / 30, seuil: '30 GJ/hab.' },
    { id: 'stab', court: 'Stabilité', nom: 'Stabilité sociale', val: r => r.S / 45, seuil: '45/100' },
  ];

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
  function energieParHab(r) { return r.E / r.pop * 1000; }    // GJ/hab.
  // Services énergétiques : énergie par habitant exprimée à l'efficacité de 2025
  function servicesEnergie(r) { return energieParHab(r) * (r.ei0 || r.ei) / r.ei; }
  function coutLevier(n) { return COUTS[n]; }
  function coutTotal(lev) { return Object.values(lev).reduce((a, n) => a + COUTS[n], 0); }
  const bascule = (st, id) => st.bascules.find(b => b.id === id).active;
  const popTotale = st => st.regions.reduce((a, r) => a + r.pop, 0);
  function stabiliteMoyenne(st) {
    return st.regions.reduce((a, r) => a + r.S * r.pop, 0) / popTotale(st);
  }

  // --- Nouvelle partie -------------------------------------------------------
  function nouvellePartie(seed) {
    seed = (seed >>> 0) || 1;
    const st = {
      version: 1, seed, rng: seed, year: ANNEE_DEBUT, tour: 0, fini: false,
      leviers: {}, leviersPrec: {}, journal: [], hist: [], flags: {}, regions: [], bascules: [], g: {},
    };
    for (const l of LEVIERS) { st.leviers[l.id] = 0; st.leviersPrec[l.id] = 0; }
    for (const b of BASCULES) {
      st.bascules.push({ id: b.id, seuil: triangulaire(st, b.lo, b.mode, b.hi), active: false, annee: null });
    }
    const g = st.g;
    Object.assign(g, {
      cum: 2650, T: 1.37, nonCO2: 0.18, mer: 0.23, ppm: 0, omega: 0,
      petrole0: 10200, petrole: 10200, eroi: 18, prodPetrole: 0, penuriePetrole: 0,
      metaux0: 150, metaux: 150, demMetaux: 1, penurieMetaux: 0,
      poissons: 420, K: 1000, effortBAU: 0.214, prises: 90,
      foret: 60, bii: 76, azote: 205, eau: 1.44, nouvelles: 1.5, aerosols: 0.7, ozone: 0.55,
      rendement: 1, luc: 4.0, chocPIB: 0, chocAlim: 0, bonusTech: 0, bonusCapital: 0, co2Evt: 0,
      rebond: 0.45, banquise: 0.5, tauxMer: 3.6, phi: 1.12,
    });
    let totE = 0, totFoss = 0, LC = 0, gdp = 0, co2 = 0;
    for (const d of REGIONS) {
      const E = d.pop * d.gpc / 1000;                               // EJ
      const r = {
        id: d.id, nom: d.nom, court: d.court || d.nom, pop: d.pop, gP: d.gP0, s: d.s, S: d.S0,
        food: 1, crise: false, nbCrises: 0, cumCO2: d.hist * 1800, dmgEvt: 0,
        ei: E / (d.pop * d.y), ei0: E / (d.pop * d.y), fc: d.co2 / (E * (1 - d.s)), E, co2: d.co2, yEff: d.y, gEff: d.gY0,
      };
      const dmg0 = d.vuln * 0.012 * Math.max(0, g.T - 0.8) ** 2;
      r.dmg = dmg0; r.yPot = d.y / (1 - dmg0);
      st.regions.push(r);
      totE += E; totFoss += E * (1 - d.s); LC += E * d.s; gdp += d.pop * d.y; co2 += d.co2;
    }
    g.foss0 = totFoss; g.pib0 = gdp; g.LCprec = LC; g.ajoutLC0 = 4.5;
    g.emissions = co2 * 1.033 + g.luc; g.prodPetrole = totFoss * 0.38;
    g.prod0 = 1 - 0.06 * Math.pow(Math.max(0, g.T - 1.2), 1.4);
    g.prod = g.prod0;
    let dem = 0;
    for (const r of st.regions) { r.regime = 0.85 + 0.1 * Math.log(r.yEff / 5000 + 1); dem += r.pop * r.regime; }
    g.demNorm = g.prod0 / (dem * 1.12);
    g.phi = 1.12;
    for (const r of st.regions) r.food = g.phi * acces(r, st.leviers);
    derive(st);
    st.budget = calculerBudget(st);
    st.hist.push(instantane(st));
    journaliser(st, 'debut', 'Le monde en 2025',
      'Sept des neuf limites planétaires sont déjà franchies. Le climat s’est réchauffé d’environ 1,4 °C. La population et l’économie continuent de croître.',
      'Vous avez 75 ans pour faire entrer le monde dans le donut : sous le plafond écologique, au-dessus du plancher social.', null);
    return st;
  }

  function acces(r, L) {
    return clamp(0.78 + 0.075 * Math.log(r.yEff / 2000), 0.55, 1.1) + (r.yEff < SEUIL_RICHE ? 0.02 * L.solidarite : 0);
  }

  function derive(st) {
    const g = st.g;
    g.ppm = 280 + 0.435 * g.cum / 7.81;
    g.omega = 3.44 - 0.0048 * (g.ppm - 280);
    g.acid = (3.44 - g.omega) / 0.69;
    g.banquise = clamp(1 - (g.T - 0.6) / 1.5, 0, 1);
  }

  // --- Une année de simulation ---------------------------------------------
  function stepAnnee(st) {
    const L = st.leviers, g = st.g, t = st.year - ANNEE_DEBUT;
    const rebond = Math.max(0, 0.45 - 0.12 * L.sobriete);
    g.rebond = rebond;
    let totE = 0, totFoss = 0, co2Reg = 0, LC = 0, gdp = 0;

    for (const r of st.regions) {
      const P = PARAM[r.id];
      const riche = r.yEff > SEUIL_RICHE;
      const fc = r.crise ? 0.5 : 1;
      // Démographie : transition plus rapide avec l'éducation et la solidarité
      const kP = P.kP * (1 + (riche ? 0 : 0.15 * L.solidarite));
      r.gP += kP * (P.gPf - r.gP);
      let gP = r.gP;
      if (r.food < 0.92) gP -= 0.03 * (0.92 - r.food);
      if (r.crise) gP -= 0.003;
      r.pop *= 1 + gP;
      // Croissance économique potentielle
      let gY = P.gYf + (P.gY0 - P.gYf) * Math.exp(-0.02 * t);
      if (riche) gY -= 0.006 * L.sobriete * fc;
      gY += riche ? -0.001 * L.solidarite : 0.002 * L.solidarite;
      gY += 0.004 * L.efficacite * rebond;
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
      r.fc *= 0.997;
      // Dommages climatiques et hausse des mers
      const adapt = clamp((riche ? 0.08 : 0.02) + 0.1 * L.solidarite * (riche ? 0.5 : 1.3), 0, 0.6);
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
    }

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
    if (!st.flags.pic && manque > 0.02 * demPetrole) {
      st.flags.pic = st.year;
      journaliser(st, 'ressource', 'Pic pétrolier',
        'La production mondiale de pétrole ne suit plus la demande. Une partie du manque est comblée par du charbon liquéfié, encore plus émetteur.',
        'Une ressource finie ne s’arrête pas net : elle devient de plus en plus coûteuse à extraire, en argent et en énergie.', 'Mécanisme bien établi, date débattue');
    }

    // Métaux : croissance économique + construction des infrastructures bas-carbone
    const ajoutLC = Math.max(0, LC - g.LCprec); g.LCprec = LC;
    const circ = 1 - 0.15 * L.circulaire;
    const demMet = (0.8 * Math.pow(gdp / g.pib0, 0.8) * Math.exp(-0.005 * t) + 0.2 * ajoutLC / g.ajoutLC0) * circ;
    const offreM = Math.min(demMet, g.metaux / 22);
    g.penurieMetaux = demMet > 0 ? 1 - offreM / demMet : 0;
    g.metaux -= offreM; g.demMetaux = demMet;
    if (!st.flags.metaux && g.penurieMetaux > 0.03) {
      st.flags.metaux = st.year;
      journaliser(st, 'ressource', 'Pénurie de métaux',
        'Cuivre, nickel, lithium : les mines ne suivent plus. Les chantiers d’éoliennes et de réseaux électriques ralentissent.',
        'La transition énergétique est aussi une transition matérielle : les limites se déplacent d’une sphère à l’autre.', 'Mécanisme établi, ampleur débattue');
    }

    // Pêches : croissance logistique, effondrement sous 20 % de la capacité
    g.K = 1000 * (1 - 0.12 * Math.max(0, g.T - 1.2)) * (bascule(st, 'coraux') ? 0.88 : 1) * (1 - 0.08 * Math.max(0, g.acid - 1));
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
        'Comme la morue de Terre-Neuve en 1992 : un stock surexploité peut s’effondrer brutalement et mettre des décennies à revenir.', 'Fait observé');
      for (const r of st.regions) r.S -= 3;
    }

    // Alimentation
    g.rendement *= 1 + (0.002 + 0.005 * Math.exp(-0.02 * t));
    const climF = 1 - 0.06 * Math.pow(Math.max(0, g.T - 1.2), 1.4) * (1 - 0.15 * L.agro);
    const solF = 1 + 0.6 * (60 - g.foret) / 100;
    const eauF = 1 - 0.12 * Math.max(0, g.eau - 1.6);
    const pecheF = 1 - 0.05 * (1 - Math.min(1, g.prises / 90));
    const amocF = bascule(st, 'amoc') ? 0.94 : 1;
    g.prod = g.rendement * climF * solF * eauF * pecheF * (1 - 0.02 * L.agro) * amocF * (1 - g.chocAlim);
    let dem = 0;
    for (const r of st.regions) {
      r.regime = (0.85 + 0.1 * Math.log(r.yEff / 5000 + 1)) * (1 - 0.04 * L.agro);
      dem += r.pop * r.regime;
    }
    g.phi = g.prod / (dem * g.demNorm);
    for (const r of st.regions) r.food = g.phi * acces(r, L);

    // Forêts et usage des sols
    let defor = 0.13 * (1 - 0.3 * L.forets);
    if (g.phi < 1.05) defor *= 1 + 3 * (1.05 - g.phi);
    const refor = 0.03 * Math.max(0, L.forets - 1) + 0.02 * L.agro;
    g.foret += -defor + refor - (bascule(st, 'amazonie') ? 0.1 : 0) - (bascule(st, 'boreale') ? 0.04 : 0);
    g.luc = 4.0 * defor / 0.13 - 15 * refor + (bascule(st, 'amazonie') ? 1.5 : 0);

    // Émissions totales et climat (réchauffement ∝ émissions cumulées)
    const retro = (bascule(st, 'pergelisol') ? 1.5 : 0) + (bascule(st, 'boreale') ? 1.0 : 0);
    g.emissions = co2Reg * 1.033 + charbon * 0.1 + g.luc + retro + g.co2Evt;
    g.co2Evt = 0;
    g.cum += g.emissions;
    const agriF = g.prod / g.prod0 * (1 - 0.06 * L.agro);
    const fossF = totFoss / g.foss0;
    g.nonCO2 = 0.22 * agriF + 0.13 * fossF - 0.17 * fossF;   // méthane, protoxyde d'azote, aérosols (refroidissants)
    g.T += (0.00045 * g.cum + g.nonCO2 - g.T) * 0.35;
    const tauxMer = 1.8 + 3.2 * Math.max(0, g.T - 0.85) + (bascule(st, 'groenland') ? 1.2 : 0) + (bascule(st, 'antarctique') ? 1.5 : 0);
    g.mer += tauxMer / 1000; g.tauxMer = tauxMer;
    derive(st);

    // Autres limites
    g.azote += 0.2 * (205 * (g.prod / g.prod0) * (1 - 0.18 * L.agro) - g.azote);
    g.eau = 1.0 + 0.35 * (g.prod / g.prod0) + 0.25 * Math.max(0, g.T - 1.0) - 0.08 * L.agro;
    g.nouvelles += 0.1 * (1.5 * Math.pow(gdp / g.pib0, 0.5) * (1 - 0.12 * L.circulaire) - g.nouvelles);
    g.aerosols = 0.7 * fossF;
    g.ozone = Math.max(0.35, g.ozone - 0.003);
    g.bii += -0.05 - 0.15 * (defor - refor) - 0.04 * Math.max(0, g.T - 1.2) - 0.03 * Math.max(0, g.nouvelles - 1.5)
      + 0.03 * L.forets + 0.01 * L.agro;
    g.bii = clamp(g.bii, 20, 100);

    // Stabilité sociale
    const sens = Math.max(0.3, 1 - 0.22 * L.protection);
    for (const r of st.regions) {
      let dS = 0.06 * (62 - r.S);
      if (!r.crise) dS += 120 * (r.gEff - 0.015) * sens;
      if (r.food < 1) dS += 40 * (r.food - 1);
      dS += r.yEff > SEUIL_RICHE ? -0.25 * L.solidarite : 0.4 * L.solidarite;
      dS -= 30 * g.penuriePetrole + 5 * g.penurieMetaux;
      r.S = clamp(r.S + dS, 0, 100);
      if (!r.crise && r.S < 20) {
        r.crise = true; r.nbCrises++;
        journaliser(st, 'crise', `${r.court} entre en crise`,
          'Pénuries, chômage, défiance : les institutions ne parviennent plus à répondre. L’économie recule de 3 % par an et vos politiques y sont deux fois moins efficaces.',
          'Un effondrement réduit les émissions… au prix de souffrances immenses. Ce n’est pas une stratégie.', null, r.id);
      } else if (r.crise && r.S > 38) {
        r.crise = false;
        journaliser(st, 'sortie', `${r.court} sort de la crise`,
          'La société se réorganise et retrouve un peu de stabilité.', null, null, r.id);
      }
    }
    st.hist.push(instantane(st));
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
          'Seuils incertains (Armstrong McKay et al., 2022)');
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

  const EVENEMENTS = [
    { id: 'canicule', poids: st => Math.max(0, (st.g.T - 1) * 2.2),
      jouer(st) {
        const r = choisirRegion(st, x => PARAM[x.id].vuln * Math.sqrt(x.pop));
        r.S -= 7; st.g.chocAlim += 0.02;
        return [`Canicule historique : ${r.court}`, 'Récoltes perdues, hôpitaux saturés, centrales électriques à l’arrêt faute d’eau de refroidissement.',
          'Chaque dixième de degré supplémentaire rend les vagues de chaleur extrêmes plus fréquentes et plus intenses.', 'Confiance très élevée (GIEC)', r.id];
      } },
    { id: 'secheresse', poids: st => Math.max(0, (st.g.T - 1.1) * 1.6),
      jouer(st) {
        st.g.chocAlim += 0.06;
        for (const r of st.regions) if (r.id === 'afr' || r.id === 'asi') r.S -= 3;
        return ['Sécheresses simultanées', 'Plusieurs greniers à blé du monde manquent d’eau la même année. Les prix alimentaires flambent.',
          'Quand plusieurs grandes régions agricoles sont touchées en même temps, les stocks mondiaux ne suffisent plus à amortir le choc.', 'Confiance moyenne (GIEC)', null];
      } },
    { id: 'inondation', poids: st => Math.max(0, (st.g.T - 1) * 1.5),
      jouer(st) {
        const r = choisirRegion(st, x => PARAM[x.id].cote * Math.sqrt(x.pop));
        r.S -= 5; r.dmgEvt += 0.02;
        return [`Inondations : ${r.court}`, 'Des pluies diluviennes et une mer plus haute submergent villes côtières et vallées.',
          'Un air plus chaud contient plus de vapeur d’eau, environ 7 % de plus par degré : les pluies extrêmes s’intensifient.', 'Confiance élevée (GIEC)', r.id];
      } },
    { id: 'feux', poids: st => Math.max(0, (st.g.T - 1) * 1.2),
      jouer(st) {
        st.g.foret -= 0.4; st.g.bii -= 0.3; st.g.co2Evt += 1.5;
        return ['Mégafeux', 'Des millions d’hectares de forêt brûlent en zone boréale et méditerranéenne.',
          'Les forêts qui brûlent relâchent leur carbone : une rétroaction qui amplifie le réchauffement.', 'Confiance élevée (GIEC)', null];
      } },
    { id: 'techno', poids: () => 1.0,
      jouer(st) {
        st.g.bonusTech += 0.0012;
        return ['Percée technologique', 'Le prix des panneaux solaires et des batteries chute encore.',
          'Une technologie moins chère accélère la transition, mais ne réduit pas à elle seule la consommation d’énergie.', 'Tendance observée', null];
      } },
    { id: 'gisement', poids: () => 0.6,
      jouer(st) {
        st.g.petrole += 600;
        return ['Nouveau gisement de pétrole', 'Un vaste gisement offshore est découvert : 100 milliards de barils.',
          'Plus de réserves, c’est un répit pour l’économie et plus de CO₂ en puissance. Les réserves fossiles connues dépassent déjà de loin le budget carbone.', 'Fait établi', null];
      } },
    { id: 'krach', poids: () => 0.5,
      jouer(st) {
        st.g.chocPIB += 0.012;
        for (const r of st.regions) r.S -= 5;
        return ['Krach financier mondial', 'Les marchés s’effondrent, le crédit se tarit, le chômage monte partout.',
          'Dans une économie mondialisée, un choc financier se propage en quelques semaines à tous les continents.', 'Fait observé (2008)', null];
      } },
    { id: 'pandemie', poids: st => 0.3 + Math.max(0, 90 - st.g.bii) / 40,
      jouer(st) {
        st.g.chocPIB += 0.008;
        for (const r of st.regions) r.S -= 6;
        return ['Pandémie', 'Un nouveau virus passé de l’animal à l’humain se propage dans le monde entier.',
          'La destruction des habitats multiplie les contacts entre faune sauvage, élevage et humains.', 'Confiance moyenne (IPBES)', null];
      } },
    { id: 'cop', poids: st => 0.4 + stabiliteMoyenne(st) / 100,
      jouer(st) {
        st.g.bonusCapital += 2;
        return ['Accord international ambitieux', 'Une COP aboutit à des engagements chiffrés et vérifiables.',
          'La coopération augmente ce que chaque pays est prêt à faire : +2 de capital politique pour ces 5 ans.', 'Règle du jeu', null];
      } },
    { id: 'conflit', poids: st => (st.g.penuriePetrole + st.g.penurieMetaux) * 20,
      jouer(st) {
        const a = choisirRegion(st, x => PARAM[x.id].vuln), b = choisirRegion(st, x => x.pop);
        a.S -= 8; b.S -= 5;
        return ['Conflits pour les ressources', `Des tensions armées éclatent autour de gisements et de routes d’approvisionnement (${a.court}, ${b.court}).`,
          'La rareté des ressources aggrave les tensions, surtout là où les institutions sont fragiles.', 'Confiance moyenne', a.id];
      } },
    { id: 'migrations', poids: st => Math.max(0, st.g.T - 1.6) + 0.5 * st.regions.filter(r => r.crise).length,
      jouer(st) {
        for (const r of st.regions) r.S -= (r.yEff > SEUIL_RICHE ? 4 : 2);
        return ['Déplacements de population', 'Des millions de personnes quittent des régions devenues trop chaudes, trop sèches ou submergées.',
          'La plupart des déplacés climatiques restent dans leur pays ou leur région : les pays pauvres en accueillent le plus.', 'Confiance élevée (GIEC)', null];
      } },
    { id: 'entraide', poids: st => 0.4 + 0.3 * st.leviers.protection + 0.2 * st.leviers.solidarite,
      jouer(st) {
        const r = st.regions.reduce((a, x) => (x.S < a.S ? x : a));
        r.S += 6;
        return [`Réseaux d’entraide : ${r.court}`, 'Coopératives, circuits courts et associations de quartier se multiplient.',
          'La résilience d’une société dépend aussi de sa cohésion et de sa capacité à s’organiser localement.', 'Observé', r.id];
      } },
  ];

  function tirerEvenements(st) {
    const n = alea(st) < 0.45 ? 2 : 1;
    const deja = new Set();
    for (let i = 0; i < n; i++) {
      const prec = st.flags.derniers || [];
      const dispo = EVENEMENTS.filter(e => !deja.has(e.id))
        .map(e => [e, e.poids(st) * (prec.includes(e.id) ? 0.35 : 1)]).filter(([, w]) => w > 0);
      const tot = dispo.reduce((a, [, w]) => a + w, 0);
      let u = alea(st) * tot;
      for (const [e, w] of dispo) {
        u -= w;
        if (u <= 0) {
          deja.add(e.id);
          const [titre, texte, lecon, conf, region] = e.jouer(st);
          journaliser(st, 'evenement', titre, texte, lecon, conf, region);
          break;
        }
      }
    }
    st.flags.derniers = [...deja];
    for (const r of st.regions) r.S = clamp(r.S, 0, 100);
  }

  function journaliser(st, type, titre, texte, lecon, confiance, region = null) {
    st.journal.push({ annee: st.year, type, titre, texte, lecon, confiance, region });
  }

  function calculerBudget(st) {
    const crises = st.regions.filter(r => r.crise).length;
    const b = Math.round(10 + (stabiliteMoyenne(st) - 55) / 7) + st.g.bonusCapital - 2 * crises;
    return clamp(b, 3, 16);
  }

  function instantane(st) {
    const g = st.g;
    const pop = popTotale(st);
    return {
      a: st.year, T: g.T, em: g.emissions, pop, pib: st.regions.reduce((a, r) => a + r.pop * r.yEff, 0) / 1e6,
      petrole: g.prodPetrole / 6, prises: g.prises, foret: g.foret, bii: g.bii, S: stabiliteMoyenne(st),
      mer: g.mer, metaux: g.metaux, poissons: g.poissons, K: g.K, phi: g.phi,
    };
  }

  // --- Tour de jeu ---------------------------------------------------------
  function peutAugmenter(st, id) {
    return st.leviers[id] < 3 && st.leviers[id] < st.leviersPrec[id] + 1;
  }

  function avancer(st) {
    if (st.fini) return { erreur: 'La partie est terminée.' };
    if (coutTotal(st.leviers) > st.budget) return { erreur: 'Vos politiques coûtent plus que votre capital politique.' };
    const avant = st.journal.length;
    st.g.bonusCapital = 0;
    for (let i = 0; i < PAS; i++) {
      st.year++;
      stepAnnee(st);
      verifierBascules(st);
    }
    st.g.chocPIB = 0; st.g.chocAlim = 0;
    for (const r of st.regions) r.dmgEvt = 0;
    st.tour++;
    st.leviersPrec = { ...st.leviers };
    if (st.year < ANNEE_FIN) tirerEvenements(st);
    st.budget = calculerBudget(st);
    if (st.year >= ANNEE_FIN) { st.fini = true; st.bilan = bilan(st); }
    return { nouveaux: st.journal.slice(avant) };
  }

  // --- Indicateurs agrégés pour l'interface ----------------------------------
  function manquesSociaux(st) {
    const pop = popTotale(st);
    return PLANCHERS.map(p => ({
      ...p,
      manque: st.regions.reduce((a, r) => a + r.pop * Math.max(0, 1 - p.val(r)), 0) / pop,
    }));
  }
  function partSousPlancher(st) {
    const pop = popTotale(st);
    return st.regions.filter(r => PLANCHERS.some(p => p.val(r) < 0.97)).reduce((a, r) => a + r.pop, 0) / pop;
  }
  function budgetCarbone(st) {          // budget pour +2 °C, approximatif
    const total = (2.0 - 0.2) / 0.00045 - 2650;
    const utilise = st.g.cum - 2650;
    return { total, utilise, part: utilise / total, anneesRestantes: (total - utilise) / Math.max(0.1, st.g.emissions) };
  }
  function croissanceMondiale(st) {
    const h = st.hist;
    if (h.length < 2) return 0.027;
    const a = h[h.length - 1], b = h[Math.max(0, h.length - 6)];
    return Math.pow(a.pib / b.pib, 1 / Math.max(1, a.a - b.a)) - 1;
  }

  function bilan(st) {
    const g = st.g;
    const franchies = LIMITES.filter(l => l.ratio(g) > 1).length;
    const rouges = LIMITES.filter(l => l.ratio(g) > l.hr).length;
    const crisesTotales = st.regions.reduce((a, r) => a + r.nbCrises, 0);
    const enCrise = st.regions.filter(r => r.crise).length;
    const sous = partSousPlancher(st);
    const bascules = st.bascules.filter(b => b.active).length;
    let issue;
    if (g.T <= 2.0 && enCrise === 0 && crisesTotales <= 1 && sous <= 0.25 && rouges <= 3) issue = 'donut';
    else if (g.T <= 2.6 && enCrise === 0 && crisesTotales <= 3 && sous <= 0.5) issue = 'descente';
    else if (enCrise >= 3 || crisesTotales >= 6 || g.T >= 3.6) issue = 'effondrement';
    else issue = 'declin';
    const h90 = st.hist.find(h => h.a === 2090) || st.hist[st.hist.length - 1];
    let ssp = SSP[0], ecart = Infinity;
    for (const s of SSP) { const d = Math.abs(s.pts[3][1] - h90.T); if (d < ecart) { ecart = d; ssp = s; } }
    return { issue, T: g.T, franchies, rouges, crisesTotales, enCrise, sous, bascules, ssp: ssp.id, mer: g.mer };
  }

  return {
    ANNEE_DEBUT, ANNEE_FIN, PAS, COUTS, REGIONS, LEVIERS, BASCULES, LIMITES, PLANCHERS, SSP, SEUIL_RICHE,
    nouvellePartie, avancer, coutTotal, coutLevier, peutAugmenter, manquesSociaux, partSousPlancher,
    budgetCarbone, croissanceMondiale, energieParHab, stabiliteMoyenne, fr,
  };
})();
if (typeof module !== 'undefined') module.exports = Atterrir;
