// =====================================================================
//  ATTERRIR — module migrations (aucune dépendance au DOM)
//  Déplacements de population entre les six régions : réfugiés climatiques,
//  déplacés par la guerre et par la faim, accueil et fermeture des frontières.
//  Les ordres de grandeur sont arrondis ; la répartition entre départs
//  internes et internationaux, et les routes, sont volontairement schématiques.
// =====================================================================
(() => {
  'use strict';
  const A = typeof Atterrir !== 'undefined' ? Atterrir : require('./moteur.js');

  // Proximité des routes migratoires entre régions (poids relatifs, normalisés pour chaque région d'origine)
  const PROX = {
    nam: { sam: 0.50, eur: 0.12, afr: 0.04, asi: 0.28, oce: 0.06 },
    sam: { nam: 0.55, eur: 0.25, afr: 0.02, asi: 0.10, oce: 0.08 },
    eur: { nam: 0.20, sam: 0.15, afr: 0.25, asi: 0.35, oce: 0.05 },
    afr: { nam: 0.08, sam: 0.04, eur: 0.50, asi: 0.35, oce: 0.03 },
    asi: { nam: 0.15, sam: 0.02, eur: 0.25, afr: 0.08, oce: 0.20 },
    oce: { nam: 0.15, sam: 0.05, eur: 0.15, afr: 0.02, asi: 0.60 },
  };
  const PART_INTERNE = 0.70;                                   // la plupart des déplacés restent dans leur pays
  const RETOUR = { clim: 0.06, conflit: 0.22, autre: 0.15 };   // part du stock qui retrouve un foyer stable chaque année
  const SEUILS = [50, 100, 200, 500, 1000, 2000, 3000];        // jalons du cumul de déplacés climatiques (millions)

  const sum = l => l.reduce((a, b) => a + b, 0);
  function texteMillions(m, fr) {
    if (m >= 1000) return `${fr(m / 1000, 1)} milliard${m >= 2000 ? 's' : ''}`;
    return `${fr(Math.round(m), 0)} millions`;
  }

  // « Afrique 1,2 M, Asie 0,6 M » : les principaux flux sortants (depuis) ou entrants (vers) d'une région
  function principaux(st, o, id, sens) {
    const l = Object.entries(st.migr.flux).map(([k, v]) => { const [a, b] = k.split('>'); return { id: sens === 'depuis' ? b : a, ou: sens === 'depuis' ? a : b, v }; })
      .filter(f => f.ou === id && f.v >= 0.01).sort((x, y) => y.v - x.v).slice(0, 3);
    return l.length ? l.map(f => `${st.regions.find(r => r.id === f.id).court} ${o.fr(f.v, f.v < 1 ? 2 : 1)} M`).join(', ') : null;
  }

  function init(st) {
    st.migr = { stock: { clim: 10, conflit: 120, autre: 5 }, cum: { clim: 0, conflit: 0, autre: 0 }, flux: {}, seuil: 0, alertes: {} };
    for (const r of st.regions) {
      Object.assign(r, { rejet: 0, ouv: 0.8, dep: 0, depClim: 0, depConf: 0, depAutre: 0, arr: 0, solde: 0 });
      st.migr.alertes[r.id] = { exode: -99, afflux: -99, ferme: false };
    }
  }

  function annee(st, o) {
    const m = st.migr, L = st.leviers, R = st.regions;
    const attrait = r => o.clamp(Math.pow(r.yEff / 10000, 0.6) * (r.S / 50), 0.2, 3);
    m.flux = {};
    const admis = [];                                          // [origine, destination, millions]
    let nC = 0, nW = 0, nA = 0;
    for (const r of R) {
      const guerre = st.actifs.guerres.find(w => w.region === r.id);
      const famine = st.actifs.famines.some(f => f.region === r.id);
      r.depClim = r.pop * 0.04 * Math.max(0, r.dmg - 0.01);
      r.depConf = r.pop * (guerre ? 0.003 * guerre.intensite : 0);
      r.depAutre = r.pop * ((famine ? 0.003 : 0) + (r.crise ? 0.002 : 0));
      r.dep = r.depClim + r.depConf + r.depAutre;
      nC += r.depClim; nW += r.depConf; nA += r.depAutre;
      const dest = R.filter(d => d.id !== r.id);
      const w = dest.map(d => PROX[r.id][d.id] * attrait(d)), sw = sum(w);
      dest.forEach((d, i) => {
        const v = r.dep * (1 - PART_INTERNE) * w[i] / sw * d.ouv;   // la part refusée à la frontière reste bloquée sur place
        if (v > 0) admis.push([r.id, d.id, v]);
      });
    }
    for (const r of R) { r.arr = 0; r.solde = 0; }
    for (const [a, b, v] of admis) {
      const ra = R.find(r => r.id === a), rb = R.find(r => r.id === b);
      m.flux[`${a}>${b}`] = v;
      ra.pop -= v; rb.pop += v; ra.solde -= v; rb.solde += v; rb.arr += v;
    }
    m.stock.clim = m.stock.clim * (1 - RETOUR.clim) + nC;
    m.stock.conflit = m.stock.conflit * (1 - RETOUR.conflit) + nW;
    m.stock.autre = m.stock.autre * (1 - RETOUR.autre) + nA;
    m.cum.clim += nC; m.cum.conflit += nW; m.cum.autre += nA;

    // Effets sur les régions d'accueil : tensions, rejet, ouverture des frontières
    for (const r of R) {
      const part = r.arr / r.pop, al = m.alertes[r.id];
      r.S -= 80 * part;
      if (r.tension !== undefined) r.tension = o.clamp(r.tension + 150 * part, 0, 100);
      r.rejet = o.clamp(r.rejet * 0.85 + 25 * part, 0, 1);
      r.ouv = o.clamp(0.85 - 0.8 * r.rejet - 0.004 * Math.max(0, (r.tension === undefined ? 30 : r.tension) - 30) + 0.08 * L.solidarite, 0.05, 1);

      if (r.dep / r.pop > 0.012 && st.year - al.exode > 3) {
        al.exode = st.year;
        o.journaliser(st, 'migration', `Exode : ${r.court}`,
          `Environ ${texteMillions(r.dep, o.fr)} de personnes quittent leur foyer en un an, chassées par le climat, la guerre ou la faim. La plupart restent dans leur pays ou dans la région.`,
          'Les déplacements forcés sont d’abord internes : les pays pauvres accueillent la majorité des déplacés.', 'Confiance élevée (HCR, Banque mondiale)', r.id,
          { gravite: r.dep > 20 ? 3 : 2, photo: 'migration', touches: r.dep, labelTouches: 'Personnes déplacées sur l’année (estimation)',
            details: [['Part restée dans la région', `${Math.round(PART_INTERNE * 100)} %`], ['Principales destinations hors région', principaux(st, o, r.id, 'depuis') || 'aucune route ouverte']] });
      }
      if (part > 0.0035 && st.year - al.afflux > 3) {
        al.afflux = st.year;
        if (r.demo !== undefined) r.demo = o.clamp(r.demo - 1.5, 3, 97);
        o.journaliser(st, 'migration', `Afflux de réfugiés : ${r.court}`,
          `Environ ${texteMillions(r.arr, o.fr)} de personnes arrivent en un an. L’accueil devient un enjeu politique majeur et les tensions montent.`,
          'Un afflux rapide, même modeste en proportion, nourrit les mouvements de rejet quand les services publics sont déjà sous tension.', 'Observé', r.id,
          { gravite: 2, photo: 'migration', touches: r.arr, labelTouches: 'Personnes accueillies sur l’année (estimation)',
            details: [['Principales régions d’origine', principaux(st, o, r.id, 'vers') || 'diverses']] });
      }
      if (r.ouv < 0.3 && !al.ferme) {
        al.ferme = true;
        o.journaliser(st, 'migration', `Frontières fermées : ${r.court}`,
          'Face à l’afflux et aux tensions, la région durcit ses frontières. Une grande partie des candidats à l’exil reste bloquée dans des camps, sans perspective.',
          'Fermer les frontières réduit les arrivées, mais pas les causes des départs.', 'Tendance observée', r.id,
          { gravite: 2, photo: 'migration', touches: r.arr * (1 - r.ouv) / Math.max(0.05, r.ouv), labelTouches: 'Candidats à l’exil bloqués sur l’année (estimation)',
            details: [['Part des demandes acceptées', `${Math.round(r.ouv * 100)} %`]] });
      } else if (r.ouv > 0.5 && al.ferme) al.ferme = false;
    }

    // Jalons du cumul de déplacés climatiques
    while (m.seuil < SEUILS.length && m.cum.clim >= SEUILS[m.seuil]) {
      const s = SEUILS[m.seuil++];
      o.journaliser(st, 'migration', `${texteMillions(s, o.fr)} de déplacés climatiques depuis 2025`,
        `Depuis 2025, au moins ${texteMillions(s, o.fr)} de personnes ont dû quitter leur foyer à cause de la chaleur, des sécheresses, des tempêtes et de la montée des eaux.`,
        'Les migrations climatiques sont surtout internes. Elles dépendent autant de la pauvreté et de l’adaptation que du réchauffement lui-même.',
        'Estimations très incertaines : la Banque mondiale (2021) projette jusqu’à 216 millions de migrants climatiques internes d’ici 2050.', null,
        { gravite: s >= 500 ? 3 : 2, photo: 'migration', touches: s, labelTouches: 'Personnes déplacées depuis 2025 (estimation)' });
    }
  }

  function instantane(st) {
    return { refClim: st.migr.stock.clim, cumClim: st.migr.cum.clim, depConf: st.migr.stock.conflit + st.migr.stock.autre,
      fluxIntl: sum(Object.values(st.migr.flux)) };
  }
  function bilan(st) {
    return { cumClim: st.migr.cum.clim, cumConflit: st.migr.cum.conflit + st.migr.cum.autre, refClim: st.migr.stock.clim };
  }

  A.enregistrer({ init, annee, instantane, bilan });
})();
