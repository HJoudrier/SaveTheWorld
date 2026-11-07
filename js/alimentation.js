// =====================================================================
//  ATTERRIR — alimentation, sols, eau et nutriments (aucune dépendance au DOM)
//  La demande alimentaire (population, revenus, régimes, gaspillage) fixe les surfaces
//  cultivées et pâturées ; la déforestation en découle. Les rendements dépendent des engrais
//  (donc du gaz fossile), de l'eau des nappes, des pollinisateurs, du climat, du CO2 et des sols.
//
//  Ordres de grandeur (vers 2020-2025) :
//  - FAO : ~1,58 milliard d'ha cultivés, ~3,2 milliards d'ha de prairies et pâturages permanents,
//    ~4,06 milliards d'ha de forêts (FRA 2020), perte nette ~4,7 Mha/an (2015-2020).
//  - Global Carbon Budget 2025 : émissions liées à l'usage des sols ~4,1 Gt CO2 en 2025.
//  - Azote fixé intentionnellement ~190 Tg N/an, phosphore ~22,6 Tg P/an (Richardson et al., 2023).
//  - Irrigation : ~40 % de la production sur ~20 % des terres cultivées ; une part vient de nappes
//    qui s'épuisent (Inde du Nord-Ouest, plaine de Chine du Nord, Ogallala).
//  - Climat : −7 % (maïs), −6 % (blé), −3 % (riz, soja) par °C sans adaptation (Zhao et al., 2017).
//  - Pollinisateurs : 5 à 8 % de la production agricole en volume en dépend (Aizen et al., 2009).
//  - Agroécologie et bio : rendements inférieurs de 8 à 20 % selon les pratiques (Ponisio et al., 2015).
// =====================================================================
(() => {
  'use strict';
  const A = typeof Atterrir !== 'undefined' ? Atterrir : require('./moteur.js');

  const MHA_PAR_PT_FORET = 67.7;               // 1 point de couvert forestier (% du potentiel) ≈ 67,7 Mha
  const CULTURES0 = 1580, PATURAGES0 = 3200;   // Mha
  const AZOTE_SYNTH0 = 110, AZOTE_BNF0 = 80;   // Tg N/an : engrais de synthèse, fixation par les cultures

  // Calories disponibles par habitant (kcal/jour) et part d'origine animale selon le revenu
  const kcal = y => Math.min(3700, 2050 + 360 * Math.log(y / 1000));
  const partAnimale = y => Math.max(0.04, Math.min(0.30, 0.02 + 0.07 * Math.log(y / 2000)));

  function demande(st) {
    const L = st.leviers, g = st.g;
    let total = 0, ruminants = 0, animal = 0;
    const gaspillage = 0.30 * (1 - 0.07 * L.agro);
    for (const r of st.regions) {
      const riche = r.yEff > A.SEUIL_RICHE;
      const a = partAnimale(r.yEff) * (1 - (riche ? 0.10 : 0.04) * L.agro);   // régimes moins carnés
      const kc = r.pop * kcal(r.yEff);
      total += kc * ((1 - a) + a * 4) / (1 - gaspillage);      // 4 kcal végétales par kcal animale (fourrage)
      ruminants += kc * a * 0.4; animal += kc * a;
    }
    const bio = 0.035 * Math.sqrt(Math.max(0.1, (g.LC ?? g.LC0) / g.LC0));  // cultures énergétiques, croissantes avec la transition
    return { total: total * (1 + bio), ruminants, animal };
  }

  function rendement(st, o) {
    const L = st.leviers, g = st.g, t = st.year - o.ANNEE_DEBUT;
    const dT = g.T - 1.37;
    // Engrais azotés : demande liée aux surfaces et aux rendements, offre limitée par le gaz fossile
    const besoinN = AZOTE_SYNTH0 * (g.cultures / CULTURES0) * (1 - 0.12 * L.agro) * Math.sqrt(g.rendTech);
    g.azoteSynth = besoinN * Math.max(0.3, 1 - 1.5 * g.penuriePetrole);
    const n = (g.azoteSynth / g.cultures) / (AZOTE_SYNTH0 / CULTURES0) + 0.15 * L.agro;   // légumineuses, fumier
    const fN = (1 - Math.exp(-1.5 * n)) / (1 - Math.exp(-1.5));
    // Eau : 8 % de la production dépend de nappes non renouvelables ; sécheresses accrues
    const fW = 1 - 0.08 * (1 - g.nappes) - 0.03 * Math.max(0, dT) + 0.015 * L.eau;
    // Pollinisateurs : biodiversité et pesticides
    const pol = (g.bii / 76) * (1 - 0.15 * (g.nouvelles / 1.5 - 1));
    const fPoll = 1 - 0.08 * (1 - Math.min(1.1, pol));
    // Climat (avec adaptation partielle) et fertilisation par le CO2
    const adapt = 0.2 * L.agro / 3 + 0.1 * L.solidarite / 3;
    const fClim = 1 - (0.05 - 0.015 * adapt) * dT - 0.015 * Math.max(0, dT - 1) ** 2;
    const fCO2 = 1 + 0.035 * (g.ppm - 424) / 100;
    const fAgro = 1 - 0.04 * L.agro;
    const fAmoc = o.bascule(st, 'amoc') ? 0.94 : 1;
    g.facteurs = { azote: fN, eau: fW, pollinisateurs: fPoll, climat: fClim, co2: fCO2, sols: g.sol, agroecologie: fAgro };
    g.rendTech *= 1 + 0.010 * Math.exp(-0.012 * t) + 0.003;
    return g.rendTech * fN * fW * fPoll * fClim * fCO2 * g.sol * fAgro * fAmoc * (1 - g.chocAlim);
  }

  function init(st) {
    const g = st.g;
    Object.assign(g, {
      cultures: CULTURES0, paturages: PATURAGES0, foret: 60, rendTech: 1, sol: 1, nappes: 1, reboise: 0,
      azoteSynth: AZOTE_SYNTH0, azote: AZOTE_SYNTH0 + AZOTE_BNF0, phosphore: 22.6, zonesMortes: 1,
      bii: 76, hanpp: 30, emsy: 110, eauBleue: 18.2, eauVerte: 15.8,
      prod: 1, dem: 1, phi: 1, rendement: 1, co2Sols: 4.1, ch4Agri: 253, n2oAgri: 6.0, LC0: g.LCprec,
      deforestation: 0, perteForet: 0,
    });
    const d = demande(st);
    g.dem0 = d.total; g.rum0 = d.ruminants; g.ani0 = d.animal; g.pop0 = st.regions.reduce((a, r) => a + r.pop, 0);
    for (const r of st.regions) r.food = 1;
  }

  function alimentation(st, o) {
    const L = st.leviers, g = st.g, t = st.year - o.ANNEE_DEBUT;
    const d = demande(st);
    g.dem = d.total / g.dem0;
    g.rendement = rendement(st, o);
    const prisesF = 1 - 0.02 * (1 - Math.min(1, g.prises / 90));   // poisson : ~2 % des calories
    g.prod = (g.cultures / CULTURES0) * g.rendement * prisesF;
    g.phi = g.prod / g.dem;

    // Accès à la nourriture : quand l'offre mondiale manque, les prix montent et les plus pauvres décrochent les premiers
    for (const r of st.regions) {
      const elasticite = 1 + Math.max(0, 1 - r.yEff / 30000);
      r.food = Math.pow(g.phi, elasticite) * (r.yEff < A.SEUIL_RICHE ? 1 + 0.02 * L.solidarite : 1);
    }

    // Surfaces : les cultures tendent vers la surface nécessaire, les pâturages suivent la demande de ruminants
    const protege = 1 - 0.25 * L.forets;
    const besoinC = CULTURES0 * g.dem / g.rendement;
    const dC = o.clamp(0.15 * (besoinC - g.cultures), -0.004 * g.cultures, 0.012 * g.cultures);
    const besoinP = PATURAGES0 * (d.ruminants / g.rum0) / Math.pow(1.012, t);
    const dP = o.clamp(0.1 * (besoinP - g.paturages), -0.01 * g.paturages, 0.01 * g.paturages);
    g.cultures += dC; g.paturages += dP;
    // Déforestation (Mha) : expansion agricole, exploitation et incendies, points de bascule
    let defor = Math.max(0, dC) * 0.45 * protege + Math.max(0, dP) * 0.5 * protege + 0.025 * MHA_PAR_PT_FORET * (1 - 0.3 * L.forets);
    if (g.phi < 0.95) defor *= 1 + 2 * (0.95 - g.phi);            // la faim pousse à défricher
    const repousse = 0.4 * (Math.max(0, -dC) + Math.max(0, -dP)) + 0.05 * MHA_PAR_PT_FORET * Math.max(0, L.forets - 1);
    g.reboise = g.reboise * 0.98 + repousse;                       // les jeunes forêts absorbent du carbone, puis mûrissent
    g.deforestation = defor;
    const pertePts = (defor - repousse) / MHA_PAR_PT_FORET + (o.bascule(st, 'amazonie') ? 0.1 : 0) + (o.bascule(st, 'boreale') ? 0.04 : 0);
    g.perteForet = pertePts * MHA_PAR_PT_FORET;
    g.foret -= pertePts;
    // Émissions liées aux sols (Gt CO2), calées sur 4,1 Gt en 2025 pour ~4,5 Mha/an de déforestation nette (FAO) ;
    // le reste vient de la dégradation des forêts, des tourbières et des incendies
    g.co2Sols = 4.1 * (0.7 * defor / 4.5 + 0.3 * (1 - 0.15 * L.forets)) - 0.015 * g.reboise + (o.bascule(st, 'amazonie') ? 1.5 : 0);

    // Sols, nappes et nutriments
    g.sol = Math.min(1.05, g.sol * (1 - 0.0015 + 0.0008 * L.agro));
    g.nappes = o.clamp(g.nappes - 0.012 * (1 + 0.3 * (g.T - 1.37)) * (1 - 0.3 * L.eau) * (g.cultures / CULTURES0) + 0.004 * L.eau, 0, 1);
    g.azote = g.azoteSynth + AZOTE_BNF0 * (g.cultures / CULTURES0) * (1 + 0.15 * L.agro);
    g.phosphore = 22.6 * Math.pow(g.prod, 0.8) * (1 - 0.1 * L.agro - 0.08 * L.circulaire);
    g.zonesMortes = g.azoteSynth / AZOTE_SYNTH0;
    const animal = d.animal / g.ani0, pop = st.regions.reduce((a, r) => a + r.pop, 0) / g.pop0;
    g.n2oAgri = 6.0 * (0.7 * g.azoteSynth / AZOTE_SYNTH0 + 0.3 * animal);
    g.ch4Agri = 253 * (0.5 * animal * (1 - 0.05 * L.agro) + 0.15 * g.prod + 0.35 * pop);

    // Eau douce : prélèvements (irrigation, villes, industrie) et climat ; humidité des sols et forêts
    const prelev = 0.7 * (g.cultures / CULTURES0) * (1 - 0.08 * L.eau) + 0.3 * Math.pow(g.pibIdx, 0.3);
    g.eauBleue = 18.2 * Math.pow(prelev, 0.6) * (1 + 0.12 * (g.T - 1.37));
    g.eauVerte = 15.8 * (1 + 0.5 * (60 - g.foret) / 60 + 0.1 * (g.cultures / CULTURES0 - 1)) * (1 + 0.15 * (g.T - 1.37));

    // Biosphère : appropriation de la production primaire, extinctions, intégrité des écosystèmes
    g.hanpp = 30 * (0.55 * (g.cultures / CULTURES0) * Math.pow(g.rendement, 0.3) + 0.35 * g.paturages / PATURAGES0 + 0.10);
    const habitat = Math.pow((g.cultures + g.paturages + (60 - g.foret) * MHA_PAR_PT_FORET) / (CULTURES0 + PATURAGES0), 3);
    g.emsy = 110 * habitat * (1 + 0.5 * Math.max(0, g.T - 1.37)) * (1 + 0.15 * (g.nouvelles / 1.5 - 1))
      * (1 + 0.05 * (g.zonesMortes - 1)) * (1 - 0.15 * L.forets);
    const expansion = 100 * (dC + dP + g.perteForet) / (g.cultures + g.paturages);
    g.bii = o.clamp(g.bii - 0.04 - 0.15 * Math.max(0, expansion) - 0.04 * Math.max(0, g.T - 1.2) - 0.03 * Math.max(0, g.nouvelles - 1.5)
      + 0.04 * L.forets + 0.015 * L.agro, 20, 100);
  }

  function instantane(st) {
    const g = st.g;
    return { cultures: g.cultures, rendement: g.rendement, nappes: g.nappes, azoteN: g.azote };
  }

  A.kcalParHab = kcal;
  A.enregistrer({ init, etapes: { alimentation }, instantane });
})();
