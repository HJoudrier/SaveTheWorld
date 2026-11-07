// =====================================================================
//  ATTERRIR — plancher social du donut (aucune dépendance au DOM)
//  Les 12 dimensions de Kate Raworth, mesurées dans chaque région en part de la
//  population en manque ; plus la santé, l'éducation et la démographie qui les relient
//  au reste du modèle.
//
//  Valeurs de départ (ordres de grandeur régionaux, vers 2023-2025) :
//  - Sous-nutrition (FAO, SOFI 2025) : 8,2 % du monde en 2024 ; Afrique > 20 %, Asie 6,7 %,
//    Amérique latine 5,1 %. Méthode FAO : distribution log-normale des calories, seuil ~1 800 kcal.
//  - Espérance de vie (ONU, WPP 2024) : 73,3 ans dans le monde en 2024.
//  - Eau (ONU, rapport ODD 2025) : 2,2 milliards sans eau potable gérée de façon sûre, 3,4 milliards
//    sans assainissement sûr en 2024.
//  - Énergie (Tracking SDG7 2025) : ~92 % d'accès à l'électricité (~660 M sans), plus de 2 milliards
//    sans cuisson propre.
//  - Réseaux (ONU, 2025) : 68 % d'internautes en 2024.
//  - Logement : ~1,1 milliard d'habitants de bidonvilles (ONU-Habitat).
//  - Pauvreté : seuil de 6,85 $/jour (PPA 2017, Banque mondiale), ~44 % du monde vers 2022.
//  - Pollution de l'air : ~7 millions de décès par an (OMS) ; gain d'espérance de vie ~0,1 an
//    par µg/m³ de PM2,5 en moins (Air Quality Life Index).
//  Les valeurs régionales sont des agrégats approximatifs de ces sources ; les seuils suivent
//  Raworth (2017) et Fanning et Raworth (Nature, 2025).
// =====================================================================
(() => {
  'use strict';
  const A = typeof Atterrir !== 'undefined' ? Atterrir : require('./moteur.js');
  const fr = A.fr;

  // LE : espérance de vie ; pou : sous-nutrition ; pauv : sous 6,85 $/j ; educ : sans fin du collège ;
  // eau : sans eau ni assainissement sûrs (moyenne) ; ener : sans électricité ni cuisson propre (moyenne) ;
  // net : hors ligne ; bidon : en bidonville ; genre : écart de parité restant ; homi : violence hors guerre ;
  // pm : PM2,5 pondérées par la population (µg/m³) ; ambiant, menage : décès annuels par habitant dus à l'air extérieur
  // et à la cuisson au bois ou au charbon ; cv : coefficient de variation des calories (méthode FAO)
  const D0 = {
    nam: { LE: 79, pou: 0.015, pauv: 0.02, educ: 0.04, eau: 0.04, ener: 0.00, net: 0.07, bidon: 0.01, genre: 0.25, homi: 0.05, pm: 8, ambiant: 0.00012, menage: 0, cv: 0.20 },
    sam: { LE: 75.5, pou: 0.051, pauv: 0.25, educ: 0.18, eau: 0.40, ener: 0.075, net: 0.20, bidon: 0.14, genre: 0.26, homi: 0.35, pm: 15, ambiant: 0.00015, menage: 0.0001, cv: 0.27 },
    eur: { LE: 78.5, pou: 0.015, pauv: 0.04, educ: 0.04, eau: 0.10, ener: 0.01, net: 0.09, bidon: 0.01, genre: 0.25, homi: 0.03, pm: 13, ambiant: 0.00035, menage: 0.00002, cv: 0.20 },
    afr: { LE: 64, pou: 0.202, pauv: 0.78, educ: 0.50, eau: 0.62, ener: 0.53, net: 0.62, bidon: 0.21, genre: 0.33, homi: 0.15, pm: 35, ambiant: 0.00025, menage: 0.0007, cv: 0.30 },
    asi: { LE: 74, pou: 0.067, pauv: 0.45, educ: 0.18, eau: 0.32, ener: 0.11, net: 0.34, bidon: 0.13, genre: 0.33, homi: 0.02, pm: 40, ambiant: 0.00068, menage: 0.0004, cv: 0.27 },
    oce: { LE: 78, pou: 0.07, pauv: 0.15, educ: 0.12, eau: 0.20, ener: 0.06, net: 0.25, bidon: 0.05, genre: 0.26, homi: 0.02, pm: 8, ambiant: 0.0001, menage: 0.00005, cv: 0.25 },
  };
  const MDER = 1800, SEUIL_PAUVRETE = 6.85 * 365;
  const pct = x => `${fr(100 * x, 0)} %`;

  // Les 12 dimensions, dans l'ordre du donut de Raworth
  const DIMS = [
    { id: 'alim', nom: 'Alimentation', court: 'Faim', seuil: 'sous-nutrition (moins de ~1 800 kcal/jour)',
      desc: 'Part de la population qui ne mange pas assez pour une vie active (méthode de la FAO).',
      valeur: r => `${pct(r.manque.alim)} sous-alimentés` },
    { id: 'sante', nom: 'Santé', court: 'Santé', seuil: 'espérance de vie d’au moins 70 ans',
      desc: 'Part de la population vivant là où l’espérance de vie est inférieure à 70 ans. Elle dépend du revenu, de la nourriture, de l’eau, de l’air, de la chaleur, des épidémies et des guerres.',
      valeur: r => `espérance de vie ${fr(r.LE, 1)} ans` },
    { id: 'educ', nom: 'Éducation', court: 'Éducation', seuil: 'fin du premier cycle du secondaire',
      desc: 'Part des jeunes qui n’achèvent pas le collège.', valeur: r => `${pct(1 - r.edu)} sans collège` },
    { id: 'revenu', nom: 'Revenu et travail', court: 'Revenu', seuil: '6,85 $ par jour (PPA 2017)',
      desc: 'Part de la population sous le seuil de pauvreté de 6,85 $ par jour, plus le chômage dû aux récessions.',
      valeur: r => `${pct(r.pauvrete)} sous 6,85 $/jour` },
    { id: 'paix', nom: 'Paix et justice', court: 'Paix', seuil: 'vivre sans guerre ni violence endémique',
      desc: 'Part de la population exposée aux conflits armés, à la violence et à l’insécurité.', valeur: r => `tension ${Math.round(r.tension || 0)}/100` },
    { id: 'voix', nom: 'Expression politique', court: 'Voix', seuil: 'libertés et élections libres',
      desc: 'Part de la population vivant sous des régimes peu démocratiques.', valeur: r => `démocratie ${Math.round(r.demo || 0)}/100` },
    { id: 'equite', nom: 'Équité sociale', court: 'Équité', seuil: 'Gini sous 0,41 environ',
      desc: 'Part de la population vivant dans des sociétés très inégalitaires.', valeur: r => `Gini ${fr(r.gini || 0, 2)}` },
    { id: 'genre', nom: 'Égalité de genre', court: 'Genre', seuil: 'parité femmes-hommes',
      desc: 'Part de l’écart de parité entre femmes et hommes qui reste à combler (éducation, revenus, représentation).',
      valeur: r => `écart de parité ${pct(r.manque.genre)}` },
    { id: 'logement', nom: 'Logement', court: 'Logement', seuil: 'logement décent',
      desc: 'Part de la population vivant dans des bidonvilles ou des logements précaires.', valeur: r => `${pct(r.manque.logement)} en bidonville` },
    { id: 'reseaux', nom: 'Réseaux', court: 'Réseaux', seuil: 'accès à internet',
      desc: 'Part de la population hors ligne.', valeur: r => `${pct(r.manque.reseaux)} hors ligne` },
    { id: 'energie', nom: 'Énergie', court: 'Énergie', seuil: 'électricité et cuisson propre',
      desc: 'Part de la population sans électricité ou sans moyen de cuisson propre (moyenne des deux).',
      valeur: r => `${pct(r.manque.energie)} sans énergie moderne` },
    { id: 'eau', nom: 'Eau et assainissement', court: 'Eau', seuil: 'eau potable et assainissement sûrs',
      desc: 'Part de la population sans eau potable ou sans assainissement gérés de façon sûre (moyenne des deux).',
      valeur: r => `${pct(r.manque.eau)} sans eau ou assainissement sûrs` },
  ];
  for (const d of DIMS) A.PLANCHERS.push({ ...d, part: r => (r.manque ? r.manque[d.id] : 0) });

  // Sous-nutrition par la méthode FAO : calories log-normales de moyenne k et de coefficient de variation cv
  function sousNutrition(k, cv) {
    const s = Math.sqrt(Math.log(1 + cv * cv));
    return A.phi((Math.log(MDER) - Math.log(k) + s * s / 2) / s);
  }
  // Pauvreté : revenus log-normaux de moyenne c et d'indice de Gini G
  function pauvrete(c, G, phiInv) {
    const s = Math.SQRT2 * phiInv((Math.min(0.8, G) + 1) / 2);
    return A.phi((Math.log(SEUIL_PAUVRETE) - Math.log(c) + s * s / 2) / s);
  }

  function init(st, o) {
    for (const r of st.regions) {
      const d = D0[r.id];
      r.LE = d.LE; r.LE0 = d.LE; r.edu = 1 - d.educ; r.edu0 = r.edu; r.santeInv = 0; r.chomage = 0;
      r.accEau = 1 - d.eau; r.accEner = 1 - d.ener; r.net = 1 - d.net; r.bidon = d.bidon; r.genre = d.genre;
      r.pm = d.pm; r.aerEmis0 = r.E * (1 - r.s) * r.aer;
      // Calories moyennes réellement consommées, calées pour retrouver la sous-nutrition observée
      const s = Math.sqrt(Math.log(1 + d.cv * d.cv));
      r.kcal0 = Math.exp(Math.log(MDER) - s * o.phiInv(d.pou) + s * s / 2);
      r.cv = d.cv; r.y0 = r.yEff;
      // Revenus : facteur entre PIB par habitant et consommation, calé sur la pauvreté observée
      const G = r.gini || 0.4, sg = Math.SQRT2 * o.phiInv((G + 1) / 2);
      r.consoPart = Math.exp(Math.log(SEUIL_PAUVRETE) + sg * sg / 2 - sg * o.phiInv(d.pauv)) / r.yEff;
    }
    social(st, o, true);
    for (const r of st.regions) r.manque0 = { ...r.manque };
    st.g.mortsPollution0 = st.g.mortsPollution;
  }

  // --- Une année ------------------------------------------------------------------------------
  function social(st, o, initial) {
    const L = st.leviers, g = st.g;
    const kcal = A.kcalParHab;
    let mortsAir = 0;
    for (const r of st.regions) {
      const d = D0[r.id], P = o.PARAM[r.id];
      const pauvre = r.yEff < A.SEUIL_RICHE;
      const guerre = st.actifs.guerres.find(w => w.region === r.id);
      const gInt = guerre ? guerre.intensite : 0;
      const famine = st.actifs.famines.some(f => f.region === r.id);
      const epid = st.actifs.epidemies.filter(e => e.portee === 'monde' || e.portee === r.id).reduce((a, e) => a + e.gravite, 0);
      const gf = o.clamp(1 + 20 * (r.gEff || 0), 0.5, 1.5);          // la croissance finance écoles, réseaux, raccordements
      if (!initial) {
        // Éducation, eau, énergie, internet, logement, genre : progrès lents, reculs rapides en crise ou en guerre.
        // Rythmes de base calés sur 2000-2023 : achèvement du collège +0,6 pt/an, eau et assainissement sûrs
        // +0,6 à +0,8 pt/an, électricité +0,6 pt/an et cuisson propre +1 pt/an (ONU, rapports ODD).
        r.edu = o.clamp(r.edu + (0.025 + 0.006 * L.sante + (pauvre ? 0.004 * L.solidarite : 0)) * (1 - r.edu) * gf
          - 0.02 * gInt * (1 - r.edu) - (r.crise ? 0.02 : 0) - (famine ? 0.01 : 0), 0, 1);
        const secheresse = 0.0008 * P.vuln * Math.max(0, g.T - 1.37);
        r.accEau = o.clamp(r.accEau + (0.020 + 0.008 * L.eau + (pauvre ? 0.004 * L.solidarite : 0)) * (1 - r.accEau) * gf
          - secheresse - 0.1 * Math.max(0, (g.nappesPrec ?? g.nappes) - g.nappes) - 0.01 * gInt - (r.crise ? 0.01 : 0), 0, 1);
        r.accEner = o.clamp(r.accEner + (0.035 + (pauvre ? 0.006 * L.solidarite : 0) + 0.004 * L.bascarbone) * (1 - r.accEner) * gf
          - 0.3 * g.penuriePetrole * (1 - r.accEner) - (r.crise ? 0.01 : 0), 0, 1);
        r.net = o.clamp(r.net + 0.04 * (1 - r.net) * Math.min(1, r.accEner / 0.9) * gf - (r.crise ? 0.01 : 0), 0, 1);
        const deplaces = (r.depClim || 0) / r.pop;
        r.bidon = o.clamp(r.bidon - 0.008 * r.bidon * gf + 0.5 * deplaces + (r.crise ? 0.01 * (1 - r.bidon) : 0), 0, 1);
        r.genre = o.clamp(r.genre - 0.008 * r.genre * (1 + ((r.demo || 50) - 50) / 100 + (r.edu - r.edu0)) + (r.crise || gInt ? 0.002 : 0), 0, 1);
        r.chomage = o.clamp(r.chomage + 0.5 * (r.gRef - r.gEff) - 0.15 * r.chomage, 0, 0.25);
        // Investissements de santé publique : cumulatifs, plafonnés
        r.santeInv = Math.min(4, r.santeInv + 0.15 * L.sante);
      }
      // Pollution de l'air : particules des combustions (selon les filtres) et de la cuisson au bois ou au charbon
      const emis = r.E * (1 - r.s) * r.aer / r.aerEmis0;
      const cuisson = Math.max(0, 1 - r.accEner) / Math.max(0.01, d.ener);
      r.pm = d.pm * (0.25 + 0.55 * emis + 0.2 * Math.min(2, cuisson));
      r.mortsAir = r.pop * (d.ambiant * r.pm / d.pm + d.menage * Math.min(2, cuisson));
      mortsAir += r.mortsAir;

      // Alimentation : calories moyennes selon le revenu et l'accès, puis sous-nutrition (FAO)
      r.kcal = r.kcal0 * (kcal(r.yEff) / kcal(r.y0)) * Math.pow(r.food, 0.8) * (famine ? 0.95 : 1) * (1 - 0.03 * Math.max(0, gInt - (r.guerreInt0 || 0)));
      r.cv = d.cv * (1 + 1.5 * ((r.gini || 0.4) - (r.gini0 || r.gini || 0.4)));
      const pou = sousNutrition(r.kcal, r.cv);
      r.pauvrete = pauvrete(r.consoPart * r.yEff, r.gini || 0.4, o.phiInv);

      // Santé : l'espérance de vie tend vers un niveau fixé par le revenu, la nourriture, l'eau, l'air, la chaleur, les crises
      if (!initial) {
        // Progrès tendanciel, qui inclut déjà les gains habituels du développement (revenus, nutrition, eau) :
        // l'ONU prévoit 77 ans de moyenne mondiale vers 2054. S'y ajoutent les écarts à cette trajectoire.
        const ecart = Math.max(0, 85 - d.LE), t = st.year - o.ANNEE_DEBUT;
        const progres = ecart * (1 - Math.exp(-0.008 * t));
        const cible = d.LE + progres + r.santeInv * ecart / 20
          - 20 * (pou - d.pou) - 3 * ((1 - r.accEau) - d.eau) - 0.098 * (r.pm - d.pm)
          - 0.3 * P.vuln * Math.max(0, g.T - 1.37) - 0.3 * epid - 1.5 * Math.max(0, gInt - (r.guerreInt0 || 0)) - (famine ? 2 : 0);
        r.LE += 0.3 * (Math.min(86, cible) - r.LE);
      }

      r.manque = {
        alim: pou,
        sante: A.phi((70 - r.LE) / 5),
        educ: 1 - r.edu,
        revenu: o.clamp(r.pauvrete + 0.6 * r.chomage, 0, 1),
        // risque de conflit (tensions, guerre) et violence ordinaire (homicides), combinés comme deux risques indépendants
        paix: 1 - (1 - o.clamp(A.phi(((r.tension ?? 40) - 45) / 15) + 0.1 * gInt, 0, 1)) * (1 - d.homi),
        voix: A.phi((40 - (r.demo ?? 50)) / 18),
        equite: A.phi(((r.gini ?? 0.4) - 0.41) / 0.05),
        genre: r.genre,
        logement: r.bidon,
        reseaux: 1 - r.net,
        energie: 1 - r.accEner,
        eau: 1 - r.accEau,
      };

      // Démographie : la fécondité baisse plus vite avec l'éducation et la santé ; la mortalité suit l'espérance de vie
      if (!initial) {
        const kP = P.kP * (1 + 1.5 * (r.edu - r.edu0) + 0.1 * L.sante + (pauvre ? 0.15 * L.solidarite : 0));
        r.gP += kP * (P.gPf - r.gP);
        const croissance = r.gP - (1 / r.LE - 1 / r.LE0) - (r.crise ? 0.003 : 0);
        r.pop *= 1 + croissance;
      }
    }
    g.mortsPollution = mortsAir;
    g.nappesPrec = g.nappes;
  }

  function instantane(st) {
    const pop = st.regions.reduce((a, r) => a + r.pop, 0);
    return { LE: st.regions.reduce((a, r) => a + r.LE * r.pop, 0) / pop, mortsAir: st.g.mortsPollution };
  }

  A.enregistrer({ init, etapes: { social: (st, o) => social(st, o, false) }, instantane });
})();
