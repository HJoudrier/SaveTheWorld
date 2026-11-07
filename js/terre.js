// =====================================================================
//  ATTERRIR — système Terre (aucune dépendance au DOM)
//  Cycle du carbone, méthane, protoxyde d'azote, aérosols, forçage radiatif,
//  température, niveau de la mer, et les neuf limites planétaires.
//
//  Sources des valeurs de départ (2024-2025) :
//  - Global Carbon Budget 2025 : CO2 422,8 ppm (2024), 425,7 ppm prévus en 2025 ;
//    42,2 Gt CO2 émises en 2025 dont 4,1 par l'usage des sols ; puits océan 29 %, terres 21 %.
//  - Forster et al. 2025 (Indicators of Global Climate Change 2024) : réchauffement d'origine
//    humaine 1,36 °C en 2024, +0,27 °C par décennie ; budget restant pour 1,5 °C : 130 Gt CO2 début 2025.
//  - Planetary Health Check 2025 (PIK, Stockholm Resilience Centre) : 7 limites sur 9 franchies ;
//    forçage anthropique +2,97 W/m² (limite +1, haut risque +1,5) ; CO2 limite 350 ppm, haut risque 450 ;
//    Ω aragonite 2,84 pour une limite de 2,86 (préindustriel 3,57).
//  - Richardson et al. 2023 (Science Advances) : biosphère > 100 E/MSY (limite 10, haut risque 100),
//    appropriation de la production primaire ~30 % (limite 10 %, haut risque 20 %) ; forêts 60 % du
//    potentiel (limite 75 %, haut risque 54 %) ; eau bleue 18,2 % des terres (limite 10,2 %), eau verte
//    15,8 % (limite 11,1 %) ; azote 190 Tg N/an (limite 62) ; phosphore 22,6 Tg P/an (limite 11).
//    Aérosols (différence interhémisphérique d'épaisseur optique ~0,076, limite 0,1, haut risque 0,25)
//    et ozone (~285 unités Dobson, limite 276, haut risque 261) : valeurs approximatives à vérifier.
//  - Cycle du carbone : modèle d'impulsion à 4 réservoirs de FaIR (Millar et al., 2017).
//  - Forçages : formules simplifiées de Myhre et al. (1998), ajustées sur le GIEC AR6.
//  - Température : modèle à deux couches (Geoffroy et al., 2013), sensibilité climatique ~3 °C (AR6).
// =====================================================================
(() => {
  'use strict';
  const A = typeof Atterrir !== 'undefined' ? Atterrir : require('./moteur.js');

  const C0 = 278, GTC_PAR_PPM = 2.124, M0 = 722, N0 = 270;     // préindustriel : CO2 (ppm), CH4 (ppb), N2O (ppb)
  // FaIR 1.0 (Millar et al., 2017) : fractions, durées (ans) et paramètres de l'état du cycle du carbone
  const FAIR = { a: [0.2173, 0.2240, 0.2824, 0.2763], tau: [1e6, 394.4, 36.54, 4.304], r0: 32.4, rC: 0.019, rT: 4.165, max: 97 };
  // Modèle à deux couches : capacités (W·an/m²/K), rétroaction (W/m²/K), échange avec l'océan profond
  const CLIMAT = { C: 7.3, Cd: 106, lambda: 1.31, gamma: 0.73 };
  const VIE_CH4 = 9.3, VIE_N2O = 116, MT_CH4_PAR_PPB = 2.75, TGN_PAR_PPB = 4.81;
  // Émissions historiques totales de CO2 (fossile + sols, Gt C/an) et réchauffement d'origine humaine, pour la mise en route
  const HIST_CO2 = [[1850, 0.55], [1880, 0.9], [1900, 1.35], [1920, 1.7], [1940, 2.1], [1950, 2.5], [1960, 3.5], [1970, 4.9],
    [1980, 6.1], [1990, 7.2], [2000, 7.9], [2010, 10.2], [2020, 10.7], [2025, 11.5]];
  const HIST_T = [[1850, 0], [1900, 0.1], [1950, 0.3], [1980, 0.5], [2000, 0.85], [2010, 1.0], [2025, 1.37]];
  const CIBLES_2025 = { ppm: 424, forcage: 2.97, T: 1.37, ch4: 1930, n2o: 337 };

  const interp = (tab, x) => {
    if (x <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) {
      const [x0, y0] = tab[i - 1], [x1, y1] = tab[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return tab[tab.length - 1][1];
  };

  // --- Cycle du carbone (FaIR) -----------------------------------------------------------
  function iirf(alpha) {
    return FAIR.a.reduce((s, a, i) => s + a * alpha * FAIR.tau[i] * (1 - Math.exp(-100 / (alpha * FAIR.tau[i]))), 0);
  }
  function alphaPour(cible) {                       // résout iIRF100(α) = cible par dichotomie (en log)
    let lo = Math.log(1e-3), hi = Math.log(1e3);
    for (let k = 0; k < 50; k++) {
      const m = (lo + hi) / 2;
      if (iirf(Math.exp(m)) < cible) lo = m; else hi = m;
    }
    return Math.exp((lo + hi) / 2);
  }
  function pasCarbone(c, E, T) {                    // c : { R[4], absorbe } ; E en Gt C ; renvoie la hausse de l'atmosphère
    const cible = Math.min(FAIR.max, FAIR.r0 + FAIR.rC * c.absorbe + FAIR.rT * Math.max(0, T));
    const alpha = alphaPour(cible);
    const avant = c.R.reduce((a, b) => a + b, 0);
    c.R = c.R.map((R, i) => R * Math.exp(-1 / (alpha * FAIR.tau[i])) + FAIR.a[i] * E);
    const apres = c.R.reduce((a, b) => a + b, 0);
    c.absorbe += E - (apres - avant);
    c.alpha = alpha;
    return apres - avant;
  }

  // --- Forçages radiatifs ------------------------------------------------------------------
  const recouvrement = (M, N) => 0.47 * Math.log(1 + 2.01e-5 * Math.pow(M * N, 0.75) + 5.31e-15 * M * Math.pow(M * N, 1.52));
  function forcages(g) {
    const t = g.annee - 2025;
    const f = {};
    f.co2 = 5.57 * Math.log(g.ppm / C0);
    f.ch4 = 1.15 * (0.036 * (Math.sqrt(g.ch4) - Math.sqrt(M0)) - (recouvrement(g.ch4, N0) - recouvrement(M0, N0)));
    f.n2o = 0.12 * (Math.sqrt(g.n2o) - Math.sqrt(N0)) - (recouvrement(M0, g.n2o) - recouvrement(M0, N0));
    f.halo = 0.41 * Math.exp(-0.006 * t);                        // CFC en déclin (Montréal), HFC limités (Kigali)
    f.o3 = 0.47 * (0.55 * (g.ch4 - M0) / (1930 - M0) + 0.45 * g.combustion);
    f.h2o = 0.05 * (g.ch4 - M0) / (1930 - M0);
    f.suie = 0.12 * g.combustion;                                 // suie sur la neige, traînées des avions
    f.albedo = -0.20 - 0.005 * Math.max(0, 60 - (g.foret ?? 60));
    const a = g.aerosolsIdx;                                       // l'effet des aérosols sur les nuages sature
    f.aerosols = -(0.3 * a + 0.7 * Math.log(1 + (Math.E - 1) * a));
    f.autres = g.forcageResidu || 0;
    f.total = Object.values(f).reduce((s, v) => s + v, 0);
    return f;
  }

  // --- Mise en place ---------------------------------------------------------------------------
  function init(st) {
    const g = st.g;
    g.annee = 2025;
    // Mise en route du cycle du carbone avec les émissions historiques, puis calage sur 2025
    const c = { R: [0, 0, 0, 0], absorbe: 0 };
    let cumul = 0;
    for (let an = 1850; an < 2025; an++) {
      const E = interp(HIST_CO2, an);
      cumul += E;
      pasCarbone(c, E, interp(HIST_T, an));
    }
    const k = (CIBLES_2025.ppm - C0) * GTC_PAR_PPM / c.R.reduce((a, b) => a + b, 0);
    c.R = c.R.map(R => R * k);
    c.absorbe = cumul - (CIBLES_2025.ppm - C0) * GTC_PAR_PPM;
    g.carbone = c;
    g.cum = cumul * 3.664;                                         // émissions cumulées depuis 1850, Gt CO2
    g.cum2025 = g.cum;
    g.ppm = CIBLES_2025.ppm; g.ch4 = CIBLES_2025.ch4; g.n2o = CIBLES_2025.n2o;
    g.T = CIBLES_2025.T;
    g.combustion = 1; g.aerosolsIdx = 1;
    g.forcageResidu = 0;
    const f = forcages(g);
    g.forcageResidu = CIBLES_2025.forcage - f.total;               // petits forçages non représentés
    g.forcage = CIBLES_2025.forcage; g.forcages = forcages(g); g.ppmPrec = g.ppm; g.airborne = 0.47;
    // Océan profond réglé pour un réchauffement de +0,027 °C/an en 2025
    g.Td = g.T - (g.forcage - CLIMAT.lambda * g.T - CLIMAT.C * 0.027) / CLIMAT.gamma;
    g.desequilibre = g.forcage - CLIMAT.lambda * g.T;              // déséquilibre énergétique de la Terre (W/m²)
    g.mer = 0.23; g.tauxMer = 4.6;                                 // m depuis 1900 ; mm/an
    g.omega = 3.57 - 0.00511 * (g.ppm - 280);
    g.aod = 0.076; g.ozone = 284.6;
    g.nouvelles = 1.5; g.nouvellesFlux0 = 1.5 * 0.055;              // stock indicé (1 = limite) et apport annuel en 2025
    g.banquise = 0.49;
    g.emissions = 42.2;
  }

  // --- Une année ---------------------------------------------------------------------------------
  function terre(st, o) {
    const g = st.g, L = st.leviers, bas = id => o.bascule(st, id);
    g.annee = st.year;
    // Émissions de CO2 (Gt CO2) : fossile (économie) + sols (alimentation) + rétroactions des points de bascule
    const retro = (bas('pergelisol') ? 1.5 : 0) + (bas('boreale') ? 1.0 : 0);
    g.emissions = g.co2Fossile + g.co2Sols + retro + (g.co2Evt || 0);
    g.co2Evt = 0;
    g.cum += g.emissions;
    pasCarbone(g.carbone, g.emissions / 3.664, g.T);
    g.ppm = C0 + g.carbone.R.reduce((a, b) => a + b, 0) / GTC_PAR_PPM;
    g.airborne = g.emissions > 0 ? (g.ppm - (g.ppmPrec || g.ppm)) * GTC_PAR_PPM * 3.664 / g.emissions : 0;
    g.ppmPrec = g.ppm;

    // Méthane et protoxyde d'azote
    const ch4Nat = 220 * (1 + 0.05 * (g.T - 1.37)) + (bas('pergelisol') ? 15 : 0);
    g.ch4Emis = g.ch4Agri + g.ch4Fossile + ch4Nat;
    g.ch4 += g.ch4Emis / MT_CH4_PAR_PPB - g.ch4 / VIE_CH4;
    g.n2oEmis = 11 + g.n2oAgri + g.n2oAutre;
    g.n2o += g.n2oEmis / TGN_PAR_PPB - g.n2o / VIE_N2O;

    // Forçage et température (deux couches)
    g.forcages = forcages(g);
    g.forcage = g.forcages.total;
    const flux = CLIMAT.gamma * (g.T - g.Td);
    g.desequilibre = g.forcage - CLIMAT.lambda * g.T;
    g.T += (g.forcage - CLIMAT.lambda * g.T - flux) / CLIMAT.C;
    g.Td += flux / CLIMAT.Cd;

    // Mer, banquise, océan
    g.tauxMer = 4.6 + 4.0 * (g.T - 1.37) + (bas('groenland') ? 1.2 : 0) + (bas('antarctique') ? 1.5 : 0);
    g.mer += g.tauxMer / 1000;
    g.banquise = o.clamp(1 - (g.T - 0.6) / 1.5, 0, 1);
    g.omega = 3.57 - 0.00511 * (g.ppm - 280);

    // Entités nouvelles : stock persistant (plastiques, PFAS, pesticides…) alimenté par la production
    const flux0 = g.nouvellesFlux0 * Math.pow(g.pibIdx, 0.8) * (1 - 0.2 * L.air - 0.1 * L.circulaire);
    g.nouvelles += flux0 - 0.03 * g.nouvelles;
    // Aérosols : différence d'épaisseur optique entre hémisphères, portée par les émissions du Nord
    g.aod = 0.076 * g.aerosolsNordIdx;
    // Ozone stratosphérique : reconstitution (protocole de Montréal), freinée par le N2O
    g.ozone = Math.min(292, g.ozone + 0.14 - 0.002 * (g.n2o - 337));
  }

  // --- Les neuf limites planétaires -----------------------------------------------------------------
  // Pour chaque variable de contrôle : position s (0 = référence, 1 = limite) et position du haut risque.
  // La sévérité z vaut 1 à la limite et 2 au début de la zone à haut risque ; une limite prend la pire de ses variables.
  const fr = A.fr;
  const severite = (s, hr) => (s <= 1 ? s : 1 + (s - 1) / (hr - 1));
  const CONTROLES = {
    climat: [
      { nom: 'CO₂', s: g => (g.ppm - 280) / (350 - 280), hr: (450 - 280) / (350 - 280), val: g => `${Math.round(g.ppm)} ppm`, seuil: '350 ppm' },
      { nom: 'Forçage radiatif', s: g => g.forcage / 1, hr: 1.5, val: g => `+${fr(g.forcage, 2)} W/m²`, seuil: '+1 W/m²' },
    ],
    biosphere: [
      { nom: 'Extinctions', s: g => g.emsy / 10, hr: 10, val: g => `${Math.round(g.emsy)} E/MSY`, seuil: '10 E/MSY' },
      { nom: 'Production primaire appropriée', s: g => g.hanpp / 10, hr: 2, val: g => `${fr(g.hanpp, 1)} %`, seuil: '10 %' },
    ],
    sols: [
      { nom: 'Couvert forestier', s: g => (100 - g.foret) / 25, hr: 46 / 25, val: g => `${fr(g.foret, 1)} % du potentiel`, seuil: '75 %' },
    ],
    eau: [
      { nom: 'Eau bleue', s: g => g.eauBleue / 10.2, hr: 2, val: g => `${fr(g.eauBleue, 1)} % des terres perturbées`, seuil: '10,2 %' },
      { nom: 'Eau verte', s: g => g.eauVerte / 11.1, hr: 2, val: g => `${fr(g.eauVerte, 1)} % des terres perturbées`, seuil: '11,1 %' },
    ],
    azote: [
      { nom: 'Azote', s: g => g.azote / 62, hr: 82 / 62, val: g => `${Math.round(g.azote)} Tg N/an`, seuil: '62 Tg N' },
      { nom: 'Phosphore', s: g => g.phosphore / 11, hr: 2, val: g => `${fr(g.phosphore, 1)} Tg P/an`, seuil: '11 Tg P' },
    ],
    acid: [
      { nom: 'Ω aragonite', s: g => (3.57 - g.omega) / (3.57 - 2.86), hr: 1.5, val: g => `Ω ${fr(g.omega, 2)}`, seuil: 'Ω 2,86' },
    ],
    nouvelles: [
      { nom: 'Substances et plastiques', s: g => g.nouvelles, hr: 2.5, val: g => `indice ${fr(g.nouvelles, 2)}`, seuil: 'non quantifiée (indice 1)' },
    ],
    aerosols: [
      { nom: 'Épaisseur optique', s: g => g.aod / 0.1, hr: 2.5, val: g => `différence ${fr(g.aod, 3)}`, seuil: '0,1' },
    ],
    ozone: [
      { nom: 'Ozone', s: g => (290 - g.ozone) / (290 - 276), hr: (290 - 261) / (290 - 276), val: g => `${Math.round(g.ozone)} unités Dobson`, seuil: '276 UD' },
    ],
  };
  const DEFS = [
    ['climat', 'Changement climatique', 'Climat', 'Concentration de CO₂ et forçage radiatif de tous les gaz et particules émis par les activités humaines.'],
    ['biosphere', 'Intégrité de la biosphère', 'Biosphère', 'Rythme des extinctions et part de la production des écosystèmes accaparée par l’humanité.'],
    ['sols', 'Usage des sols', 'Forêts', 'Forêts restantes par rapport à leur surface potentielle.'],
    ['eau', 'Eau douce', 'Eau douce', 'Part des terres où le débit des rivières (eau bleue) ou l’humidité des sols (eau verte) sort de sa variabilité naturelle.'],
    ['azote', 'Azote et phosphore', 'Engrais', 'Azote fixé par l’industrie et les cultures, phosphore épandu : ils ruissellent vers les rivières et les mers.'],
    ['acid', 'Acidification des océans', 'Acidité', 'Le CO₂ dissous rend l’océan plus acide : coquillages, coraux et plancton calcaire en souffrent.'],
    ['nouvelles', 'Entités nouvelles', 'Pollutions', 'Plastiques, PFAS, pesticides et substances de synthèse rejetés sans évaluation suffisante. Limite non chiffrée : indice où 1 marque la limite.'],
    ['aerosols', 'Aérosols atmosphériques', 'Aérosols', 'Particules en suspension (fumées, sulfates) qui perturbent les moussons et tuent par pollution de l’air. Elles refroidissent aussi le climat.'],
    ['ozone', 'Couche d’ozone', 'Ozone', 'Grâce au protocole de Montréal (1987), la couche d’ozone se reconstitue : la preuve qu’une limite peut être réparée.'],
  ];
  for (const [id, nom, court, desc] of DEFS) {
    const ctl = CONTROLES[id];
    A.LIMITES.push({
      id, nom, court, desc, hr: 2, controles: ctl,
      ratio: g => Math.max(...ctl.map(c => severite(c.s(g), c.hr))),
      depassement: g => Math.max(0, ...ctl.map(c => c.s(g) - 1)),         // pour le bilan : écart relatif à la limite
      val: g => ctl.map(c => `${ctl.length > 1 ? `${c.nom} : ` : ''}${c.val(g)}`).join(' ; '),
      seuil: ctl.map(c => `${ctl.length > 1 ? `${c.nom} ` : ''}limite ${c.seuil}`).join(' ; '),
    });
  }

  function instantane(st) {
    const g = st.g;
    return { ppm: g.ppm, ch4: g.ch4, n2o: g.n2o, forcage: g.forcage, aer: g.forcages.aerosols };
  }

  A.enregistrer({ init, etapes: { terre }, instantane });
  A.climat = { forcages, CLIMAT };
})();
