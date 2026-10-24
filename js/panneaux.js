// =====================================================================
//  ATTERRIR — panneaux « Société » et « Événements »
//  Fonctions pures : elles reçoivent un contexte (état, outils de mise en forme,
//  tracé des courbes) et renvoient du HTML. L'interface les insère dans la page.
// =====================================================================
const Panneaux = (() => {
  'use strict';
  const NB = ' ';
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  const COUL_TYPE = {
    debut: 'var(--encre-2)', politique: 'var(--encre-2)', climat: 'var(--atmo)', guerre: 'var(--alerte)', paix: 'var(--donut)',
    famine: 'var(--ocre)', epidemie: 'var(--manque)', revolte: 'var(--anthropo)', revolution: 'var(--anthropo)',
    eco: 'var(--hydro)', ressource: 'var(--litho)', bascule: 'var(--alerte)', crise: 'var(--manque)', sortie: 'var(--donut)',
  };
  const COUL_REGION = { nam: 'var(--hydro)', sam: 'var(--donut)', eur: 'var(--manque)', afr: 'var(--ocre)', asi: 'var(--alerte)', oce: 'var(--cryo)' };
  const INTENSITES = ['', 'locale', 'majeure', 'totale'];
  const CAUSES = { ressources: 'ressources', climat: 'stress climatique', civile: 'guerre civile', geo: 'conflit entre États' };

  function dateTexte(t) {
    const a = Math.floor(t), m = Math.min(11, Math.floor((t - a) * 12));
    return `${MOIS[m]} ${a}`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const moy = (st, f) => st.regions.reduce((a, r) => a + f(r) * r.pop, 0) / st.regions.reduce((a, r) => a + r.pop, 0);

  // Victimes, en millions
  function morts(m, fr) {
    if (m < 0.01) return `moins de 10${NB}000`;
    if (m < 1) return `${fr(Math.round(m * 100) * 10, 0)}${NB}000`;
    return `${fr(m, m < 10 ? 1 : 0)}${NB}million${m >= 2 ? 's' : ''}`;
  }

  function entreeHTML(e, ctx) {
    const { fr, st } = ctx;
    const region = e.region ? st.regions.find(r => r.id === e.region) : null;
    return `<li class="entree" style="--c:${COUL_TYPE[e.type] || 'var(--trait)'}">
      <div class="tete"><span class="an">${dateTexte(e.date)}</span><h3>${esc(e.titre)}</h3>
        ${e.gravite >= 3 ? '<span class="badge">grave</span>' : ''}</div>
      <p class="texte">${esc(e.texte)}</p>
      ${e.morts ? `<p class="morts">Victimes estimées : ${morts(e.morts, fr)}</p>` : ''}
      ${e.lecon ? `<p class="lecon">${esc(e.lecon)}</p>` : ''}
      ${e.confiance ? `<p class="conf">${esc(e.confiance)}</p>` : ''}${region && !e.titre.includes(region.court) ? `<p class="conf">${esc(region.nom)}</p>` : ''}</li>`;
  }

  // --- Ce qui est en cours dans le monde ---------------------------------------------
  function enCours(ctx) {
    const { st } = ctx;
    const nom = id => st.regions.find(r => r.id === id).court;
    const lignes = [];
    for (const w of st.actifs.guerres) {
      lignes.push({ coul: COUL_TYPE.guerre, titre: `Guerre ${INTENSITES[w.intensite]} : ${nom(w.region)}`,
        detail: `depuis ${w.debut}${w.cause ? `, ${CAUSES[w.cause]}` : ''}`, ordre: 0 - w.intensite });
    }
    for (const f of st.actifs.famines) lignes.push({ coul: COUL_TYPE.famine, titre: `Famine : ${nom(f.region)}`, detail: `depuis ${f.debut}`, ordre: 1 });
    for (const e of st.actifs.epidemies) {
      lignes.push({ coul: COUL_TYPE.epidemie, titre: e.portee === 'monde' ? `Pandémie` : `Épidémie de ${e.nom} : ${nom(e.portee)}`,
        detail: `depuis ${e.debut}`, ordre: e.portee === 'monde' ? 0 : 2 });
    }
    for (const r of st.regions) if (r.crise) lignes.push({ coul: COUL_TYPE.crise, titre: `Crise sociale : ${r.court}`, detail: 'institutions défaillantes', ordre: 1 });
    lignes.sort((a, b) => a.ordre - b.ordre);
    if (!lignes.length) return '<p class="intro-panneau">Aucune guerre, famine, épidémie ni crise en cours.</p>';
    return `<ul class="encours">${lignes.map(l => `<li style="--c:${l.coul}"><strong>${esc(l.titre)}</strong><span>${esc(l.detail)}</span></li>`).join('')}</ul>`;
  }

  // --- Onglet Événements --------------------------------------------------------------
  function evenements(ctx, filtre, severe) {
    const { st, A } = ctx;
    const tous = st.journal;
    const compte = Object.fromEntries(A.CATEGORIES.map(c => [c.id, 0]));
    for (const e of tous) if (compte[e.cat] !== undefined && (!severe || e.gravite >= 2)) compte[e.cat]++;
    const chips = [{ id: 'tous', nom: 'Tous', n: Object.values(compte).reduce((a, b) => a + b, 0) }]
      .concat(A.CATEGORIES.map(c => ({ id: c.id, nom: c.nom, n: compte[c.id] })))
      .map(c => `<button type="button" data-cat="${c.id}" aria-pressed="${c.id === filtre}">${c.nom} <span class="nb">${c.n}</span></button>`).join('');
    const liste = tous.filter(e => (filtre === 'tous' || e.cat === filtre) && (!severe || e.gravite >= 2));
    const MAX = 150;
    const recents = liste.slice(-MAX).reverse();
    return `
      <h3 class="titre-section" style="margin-top:0">En ce moment</h3>
      ${enCours(ctx)}
      <h3 class="titre-section">Chronologie</h3>
      <div class="choix" role="group" aria-label="Catégorie d’événements">${chips}</div>
      <label class="filtre-sev"><input type="checkbox" id="f-severe" ${severe ? 'checked' : ''}> Événements importants seulement</label>
      ${recents.length ? `<ul class="entrees">${recents.map(e => entreeHTML(e, ctx)).join('')}</ul>`
        : '<p class="intro-panneau">Aucun événement pour l’instant. Lancez le temps avec le bouton Lecture.</p>'}
      ${liste.length > MAX ? `<p class="intro-panneau">Les ${MAX} événements les plus récents sont affichés sur ${liste.length}.</p>` : ''}`;
  }

  // --- Onglet Société -------------------------------------------------------------------
  function carte(titre, valeur, detail, coul) {
    return `<section class="bloc" style="--c:${coul}"><h3>${titre}</h3>
      <p class="gros">${valeur}</p><p class="note">${detail}</p></section>`;
  }
  const delta = (v, v0, d, fr, bonSiHausse) => {
    const x = v - v0;
    if (Math.abs(x) < Math.pow(10, -d) / 2) return 'Inchangé depuis 2025';
    const bon = (x > 0) === bonSiHausse;
    return `<span class="${bon ? 'bien' : 'mal'}">${x > 0 ? '+' : '−'}${fr(Math.abs(x), d)}</span> depuis 2025`;
  };

  function societe(ctx) {
    const { st, A, fr, pct, courbe, popTexte } = ctx;
    const h0 = st.hist[0], R = st.regions;
    const gini = moy(st, r => r.gini), demo = moy(st, r => r.demo), tens = moy(st, r => r.tension);
    const minG = R.reduce((a, r) => (r.gini < a.gini ? r : a)), maxG = R.reduce((a, r) => (r.gini > a.gini ? r : a));
    const autoritaires = R.filter(r => r.demo < 40);
    const guerres = st.actifs.guerres.length;
    const mt = st.morts;
    const totalMorts = Object.values(mt).reduce((a, b) => a + b, 0);
    const lignesMorts = [['Guerres', mt.guerre], ['Famines', mt.famine], ['Épidémies', mt.epidemie], ['Catastrophes climatiques', mt.climat], ['Répression et révolutions', mt.revolte || 0]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${morts(v, fr)}</dd></div>`).join('');

    const cartes = [
      carte('Inégalités', `${fr(gini, 2)} <small>Gini moyen</small>`,
        `De ${fr(minG.gini, 2)} (${minG.court}) à ${fr(maxG.gini, 2)} (${maxG.court}). ${delta(gini, h0.gini, 2, fr, false)}.`, 'var(--manque)'),
      carte('Démocratie', `${Math.round(demo)}<small>/100</small>`,
        `${autoritaires.length ? `Sous 40 : ${autoritaires.map(r => r.court).join(', ')}.` : 'Aucune région sous 40.'} ${delta(demo, h0.demo, 0, fr, true)}.`, 'var(--hydro)'),
      carte('Tensions', `${Math.round(tens)}<small>/100</small>`,
        `${guerres ? `${guerres} guerre${guerres > 1 ? 's' : ''} en cours.` : 'Aucune guerre en cours.'} ${delta(tens, h0.tens, 0, fr, false)}.`, 'var(--alerte)'),
      `<section class="bloc" style="--c:var(--ocre)"><h3>Bilan humain depuis 2025</h3>
        <p class="gros">${morts(totalMorts, fr)} <small>de morts</small></p>
        <dl class="chiffres">${lignesMorts}</dl>
        <p class="note">Les décès de la faim sont estimés ; ils sont aussi inclus dans la baisse de la population.</p></section>`,
    ].join('');

    const statut = r => {
      const w = st.actifs.guerres.find(x => x.region === r.id), f = st.actifs.famines.find(x => x.region === r.id);
      const e = st.actifs.epidemies.find(x => x.portee === r.id || x.portee === 'monde');
      const b = [];
      if (w) b.push(`<span class="badge">guerre ${INTENSITES[w.intensite]}</span>`);
      if (f) b.push('<span class="badge ocre">famine</span>');
      if (e) b.push('<span class="badge violet">épidémie</span>');
      if (r.crise) b.push('<span class="badge violet">crise</span>');
      return b.join(' ') || '<span class="calme">—</span>';
    };
    const barre = (v, max, coul) => `<div class="barre-mini" style="--c:${coul}"><i style="width:${Math.max(0, Math.min(100, v / max * 100)).toFixed(0)}%"></i></div>`;
    const lignes = R.map(r => `<tr>
      <th scope="row"><span class="pastille" style="--c:${COUL_REGION[r.id]}"></span>${r.court}</th>
      <td>${popTexte(r.pop)}</td>
      <td>${fr(r.gini, 2)}</td>
      <td>${Math.round(r.demo)}${barre(r.demo, 100, 'var(--hydro)')}</td>
      <td>${Math.round(r.tension)}${barre(r.tension, 100, 'var(--alerte)')}</td>
      <td>${Math.round(r.S)}${barre(r.S, 100, r.S < 35 ? 'var(--alerte)' : 'var(--donut)')}</td>
      <td>${statut(r)}</td></tr>`).join('');

    const serieR = (cle, i) => st.hist.map(h => [h.a, h[cle][i]]);
    const lignesR = cle => R.map((r, i) => ({ pts: serieR(cle, i), coul: COUL_REGION[r.id] }));
    const legende = R.map(r => `<span style="--c:${COUL_REGION[r.id]}">${r.court}</span>`).join('');
    const fig = (titre, contenu) => `<figure><figcaption>${titre}</figcaption>${contenu}</figure>`;
    const serieS = st.hist.map(h => [h.a, h.S]);

    return `
      <p class="intro-panneau">Les inégalités, le régime politique et les tensions de chaque région évoluent avec vos politiques, mais aussi avec les pénuries, le climat et les crises. Ils déclenchent à leur tour révoltes, révolutions et guerres.</p>
      <div class="blocs">${cartes}</div>
      <h3 class="titre-section">Par région</h3>
      <div class="defile"><table class="tableau">
        <thead><tr><th scope="col">Région</th><th scope="col">Population</th><th scope="col">Gini</th><th scope="col">Démocratie</th><th scope="col">Tension</th><th scope="col">Stabilité</th><th scope="col">Situation</th></tr></thead>
        <tbody>${lignes}</tbody></table></div>
      <h3 class="titre-section">Évolution</h3>
      <p class="legende">${legende}</p>
      <div class="courbes">
        ${fig('Inégalités (Gini)', courbe({ series: lignesR('giniR'), ymin: 0.2, ymax: 0.6, yticks: [0.2, 0.3, 0.4, 0.5, 0.6], yfmt: v => fr(v, 1), label: 'Inégalités par région' }))}
        ${fig('Démocratie (0 à 100)', courbe({ series: lignesR('demoR'), ymin: 0, ymax: 100, yticks: [0, 50, 100], label: 'Démocratie par région' }))}
        ${fig('Tensions (0 à 100)', courbe({ series: lignesR('tensR'), ymin: 0, ymax: 100, yticks: [0, 50, 100], label: 'Tensions par région' }))}
        ${fig('Stabilité sociale moyenne', courbe({ series: [{ pts: serieS, coul: 'var(--manque)' }], ymin: 0, ymax: 100, yticks: [0, 50, 100], label: 'Stabilité sociale moyenne' }))}
      </div>
      <h3 class="titre-section">Repères</h3>
      <dl class="reperes">
        <dt>Gini</dt><dd>Mesure des inégalités de revenu : 0 si tout le monde gagne autant, 1 si une seule personne détient tout. La Suède est autour de 0,28, les États-Unis autour de 0,41, l’Afrique du Sud autour de 0,63.</dd>
        <dt>Démocratie</dt><dd>Indice de 0 à 100 inspiré de l’indice de démocratie électorale de V-Dem : élections libres, libertés d’expression et d’association, contre-pouvoirs.</dd>
        <dt>Tension</dt><dd>Risque de conflit armé. Il monte avec la pauvreté, les inégalités, les pénuries, la faim et la défiance envers l’État ; il baisse avec la démocratie et la solidarité.</dd>
      </dl>`;
  }

  return { dateTexte, morts, entreeHTML, societe, evenements, COUL_TYPE, COUL_REGION, INTENSITES };
})();
