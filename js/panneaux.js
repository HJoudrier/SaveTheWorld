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
    eco: 'var(--hydro)', migration: 'var(--cryo)', ressource: 'var(--litho)', bascule: 'var(--alerte)', crise: 'var(--manque)', sortie: 'var(--donut)',
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
    if (m >= 1000) return `${fr(m / 1000, 1)}${NB}milliard${m >= 2000 ? 's' : ''}`;
    if (m < 0.01) return `moins de 10${NB}000`;
    if (m < 1) return `${fr(Math.round(m * 100) * 10, 0)}${NB}000`;
    return `${fr(m, m < 10 ? 1 : 0)}${NB}million${m >= 2 ? 's' : ''}`;
  }

  function entreeHTML(e, ctx) {
    const { fr } = ctx;
    return `<li class="entree" style="--c:${COUL_TYPE[e.type] || 'var(--trait)'}">
      <div class="tete"><span class="an">${dateTexte(e.date)}</span><h3>${esc(e.titre)}</h3>
        ${e.gravite >= 3 ? '<span class="badge">grave</span>' : ''}
        ${e.id ? `<button type="button" class="lien-detail" data-evt="${e.id}" aria-label="Détails : ${esc(e.titre)}">Détails</button>` : ''}</div>
      <p class="texte">${esc(e.texte)}</p>
      ${e.morts ? `<p class="morts">Victimes estimées : ${morts(e.morts, fr)}</p>` : ''}
      ${e.lecon ? `<p class="lecon">${esc(e.lecon)}</p>` : ''}
      ${e.confiance ? `<p class="conf">${esc(e.confiance)}</p>` : ''}</li>`;
  }

  // --- Ce qui est en cours dans le monde ---------------------------------------------
  function enCours(ctx) {
    const { st } = ctx;
    const nom = id => st.regions.find(r => r.id === id).court;
    const lignes = [];
    for (const w of st.actifs.guerres) {
      lignes.push({ coul: COUL_TYPE.guerre, titre: `Guerre ${INTENSITES[w.intensite]} : ${nom(w.region)}`,
        detail: `depuis ${w.debut}${w.cause ? `, ${CAUSES[w.cause]}` : ''}`, ordre: 0 - w.intensite, evt: w.evtId });
    }
    for (const f of st.actifs.famines) lignes.push({ coul: COUL_TYPE.famine, titre: `Famine : ${nom(f.region)}`, detail: `depuis ${f.debut}`, ordre: 1, evt: f.evtId });
    for (const e of st.actifs.epidemies) {
      lignes.push({ coul: COUL_TYPE.epidemie, titre: e.portee === 'monde' ? `Pandémie` : `Épidémie de ${e.nom} : ${nom(e.portee)}`,
        detail: `depuis ${e.debut}`, ordre: e.portee === 'monde' ? 0 : 2, evt: e.evtId });
    }
    for (const r of st.regions) if (r.crise) lignes.push({ coul: COUL_TYPE.crise, titre: `Crise sociale : ${r.court}`, detail: 'institutions défaillantes', ordre: 1 });
    lignes.sort((a, b) => a.ordre - b.ordre);
    if (!lignes.length) return '<p class="intro-panneau">Aucune guerre, famine, épidémie ni crise en cours.</p>';
    return `<ul class="encours">${lignes.map(l => `<li style="--c:${l.coul}"><strong>${esc(l.titre)}</strong><span>${esc(l.detail)}</span>${l.evt ? `<button type="button" class="lien-detail" data-evt="${l.evt}" aria-label="Détails : ${esc(l.titre)}">Détails</button>` : ''}</li>`).join('')}</ul>`;
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



  // --- Fiche de détail d'un événement ------------------------------------------------------
  const NOM_CAT = { climat: 'Climat', guerre: 'Guerre', famine: 'Famine', epidemie: 'Épidémie', revolte: 'Révolte ou révolution', eco: 'Économie',
    ressource: 'Ressources', bascule: 'Point de bascule', crise: 'Crise régionale', politique: 'Politique et société', migration: 'Migrations' };

  // Carte schématique où les régions concernées sont colorées
  function miniCarte(ctx, ids, coul) {
    const { st, carte } = ctx;
    const touchees = new Set(ids);
    let terres = '', noms = '';
    for (const r of st.regions) {
      const sel = touchees.has(r.id);
      terres += carte.CARTE[r.id].map(pt => `<path d="${carte.chemin(pt)}" fill="${sel ? coul : 'var(--surface-2)'}" fill-opacity="${sel ? 0.85 : 1}" stroke="var(--fond)" stroke-width="0.8" stroke-linejoin="round"/>`).join('');
      if (sel) { const [x, y] = carte.proj(carte.ETIQUETTES[r.id]); noms += `<text class="nom halo" x="${x}" y="${y}" text-anchor="middle">${esc(r.court)}</text>`; }
    }
    return `<svg viewBox="0 0 700 281" role="img" aria-label="Carte des zones concernées">${terres}${noms}</svg>`;
  }

  function detail(ctx, id) {
    const { st, fr, popTexte } = ctx;
    const e = st.journal.find(x => x.id === id);
    if (!e) return '<p>Événement introuvable.</p>';
    const coul = COUL_TYPE[e.type] || 'var(--encre-2)';
    const ids = e.regions || (e.region ? [e.region] : st.regions.map(r => r.id));
    const monde = !e.regions && !e.region;
    const zones = ids.map(i => st.regions.find(r => r.id === i)).filter(Boolean);
    const popZones = zones.reduce((a, r) => a + r.pop, 0);
    const h = st.hist.find(x => x.a === e.annee);
    const photo = typeof Photos !== 'undefined' ? Photos.pour(e.photo || e.type, e.id) : null;

    const lignes = [];
    lignes.push(['Zones concernées', monde ? 'Monde entier' : zones.map(r => esc(r.nom)).join(', ')]);
    lignes.push([`Population de ${monde ? 'la planète' : zones.length > 1 ? 'ces zones' : 'cette zone'} aujourd’hui`, popTexte(popZones)]);
    lignes.push([esc(e.labelTouches || 'Personnes touchées (estimation)'), e.touches != null && e.touches > 0 ? morts(e.touches, fr) : (e.touches === 0 ? 'pas encore de cas' : 'non applicable')]);
    lignes.push([e.enCours ? 'Morts jusqu’ici' : 'Morts', e.morts ? morts(e.morts, fr) : (e.enCours ? 'pas de décès recensé' : 'aucune victime directe')]);
    if (e.enCours === true) lignes.push(['Situation', `en cours depuis ${dateTexte(e.date)}`]);
    else if (e.enCours === false) lignes.push(['Situation', `terminé en ${e.fin}${e.fin - e.annee > 0 ? ` (${e.fin - e.annee} an${e.fin - e.annee > 1 ? 's' : ''})` : ''}`]);
    if (h) {
      lignes.push(['Réchauffement mondial cette année-là', `+${fr(h.T, 2)}${NB}°C`]);
      lignes.push(['Population mondiale cette année-là', popTexte(h.pop)]);
    }
    for (const [k, v] of e.details || []) lignes.push([esc(k), esc(v)]);

    const fig = photo ? `<figure class="photo"><img src="${esc(photo.fichier)}" alt="${esc(photo.legende)}" loading="lazy">
      <figcaption>Photo d’illustration, sans lien avec cet événement simulé : ${esc(photo.legende)}. ${esc(photo.auteur)}${photo.licence ? `, ${photo.lienLicence ? `<a href="${esc(photo.lienLicence)}" target="_blank" rel="noopener">${esc(photo.licence)}</a>` : esc(photo.licence)}` : ''}${photo.source ? `, <a href="${esc(photo.source)}" target="_blank" rel="noopener">source</a>` : ''}.</figcaption></figure>` : '';

    return `<div class="detail-evt" style="--c:${coul}">${fig}
      <p class="meta-evt"><span class="an">${dateTexte(e.date)}</span> <span class="badge" style="background:${coul}">${NOM_CAT[e.cat] || e.cat}</span>
        ${e.gravite >= 3 ? '<span class="badge">grave</span>' : ''}</p>
      <h2 id="evt-titre">${esc(e.titre)}</h2>
      <p class="accroche">${esc(e.texte)}</p>
      <dl class="deltas">${lignes.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <div class="carte mini">${miniCarte(ctx, ids, coul)}</div>
      ${e.lecon ? `<p class="lecon">${esc(e.lecon)}</p>` : ''}
      ${e.confiance ? `<p class="conf">${esc(e.confiance)}</p>` : ''}
      <p class="conf">Les nombres de personnes touchées et de morts sont des estimations du jeu, calculées à partir de l’état de la simulation.</p></div>`;
  }

  // --- Onglet Population : démographie, migrations et courbes à la manière de World3 ------
  const sum = l => l.reduce((a, b) => a + b, 0);

  // Flèches des flux migratoires entre régions (largeur = personnes accueillies par an)
  function carteFlux(ctx) {
    const { st, fr, carte } = ctx;
    const pos = id => carte.proj(carte.ETIQUETTES[id]).map(Number);
    const flux = Object.entries(st.migr.flux).map(([k, v]) => ({ o: k.split('>')[0], d: k.split('>')[1], v }))
      .filter(f => f.v >= 0.03).sort((a, b) => b.v - a.v).slice(0, 14);
    const vmax = Math.max(0.1, ...flux.map(f => f.v));
    let terres = '', fleches = '', noms = '';
    for (const r of st.regions) {
      terres += carte.CARTE[r.id].map(pt => `<path d="${carte.chemin(pt)}" fill="var(--surface-2)" stroke="var(--fond)" stroke-width="0.8" stroke-linejoin="round"/>`).join('');
      const [x, y] = pos(r.id);
      noms += `<text class="nom halo" x="${x}" y="${y}" text-anchor="middle">${r.court}</text>
        <text class="val halo" x="${x}" y="${y + 15}" text-anchor="middle">${r.solde >= 0 ? '+' : '−'}${fr(Math.abs(r.solde), 1)}${NB}M/an</text>`;
    }
    for (const f of flux) {
      const [x1, y1] = pos(f.o), [x2, y2] = pos(f.d);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, c = 26;                              // raccourcit pour ne pas recouvrir les noms
      const ax = x1 + ux * c, ay = y1 + uy * c + 18, bx = x2 - ux * c, by = y2 - uy * c + 18;
      const cx = (ax + bx) / 2 - uy * len * 0.18, cy = (ay + by) / 2 + ux * len * 0.18;
      const w = 1.2 + 7 * Math.sqrt(f.v / vmax);
      const nom = id => st.regions.find(r => r.id === id).court;
      fleches += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none"
        stroke="var(--anthropo)" stroke-opacity="0.75" stroke-width="${w.toFixed(1)}" stroke-linecap="round" marker-end="url(#pointe)">
        <title>${nom(f.o)} vers ${nom(f.d)} : ${fr(f.v, 2)} million de personnes par an</title></path>`;
    }
    return `<svg viewBox="0 0 700 281" role="img" aria-label="Flux migratoires entre les régions">
      <defs><marker id="pointe" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="2.6" markerHeight="2.6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--anthropo)"/></marker></defs>
      ${terres}${fleches}${noms}</svg>`;
  }

  // Population mondiale par région, en aires empilées
  function aires(ctx, w = 320, h = 190) {
    const { st, fr } = ctx, hist = st.hist, R = st.regions;
    if (hist.length < 2) return '';
    const ml = 36, mr = 12, mt = 8, mb = 22, x0 = 2025, x1 = 2100;
    const tot = hist.map(x => sum(x.popR));
    const ymax = Math.max(10000, Math.ceil(Math.max(...tot) / 2000) * 2000);
    const X = x => (ml + (x - x0) / (x1 - x0) * (w - ml - mr)).toFixed(1), Y = y => (mt + (1 - y / ymax) * (h - mt - mb)).toFixed(1);
    let sv = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Population mondiale par région">`;
    for (let v = 0; v <= ymax; v += 2000) sv += `<line class="axe" x1="${ml}" x2="${w - mr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="tick" x="${ml - 6}" y="${+Y(v) + 4}" text-anchor="end">${v / 1000}${NB}Md</text>`;
    for (const x of [2025, 2050, 2075, 2100]) sv += `<text class="tick" x="${X(x)}" y="${h - 5}" text-anchor="middle">${x}</text>`;
    let base = hist.map(() => 0);
    R.forEach((r, i) => {
      const haut = hist.map((x, k) => base[k] + x.popR[i]);
      const d = 'M' + hist.map((x, k) => `${X(x.a)} ${Y(haut[k])}`).join('L') + 'L' + hist.map((x, k) => `${X(x.a)} ${Y(base[k])}`).reverse().join('L') + 'Z';
      sv += `<path d="${d}" fill="${COUL_REGION[r.id]}" fill-opacity="0.85"/>`;
      base = haut;
    });
    return sv + '</svg>';
  }

  function population(ctx) {
    const { st, fr, signe, courbe, popTexte } = ctx;
    const R = st.regions, m = st.migr, h = st.hist, h0 = h[0];
    const pop = sum(R.map(r => r.pop));
    const hmax = h.reduce((a, x) => (x.pop > a.pop ? x : a), h[0]);
    const pic = pop > hmax.pop ? { pop, a: Math.floor(st.t) } : hmax;
    const croiss = h.length > 1 ? h[h.length - 1].pop / h[h.length - 2].pop - 1 : 0;
    const fluxIntl = sum(Object.values(m.flux));
    const departs = sum(R.map(r => r.dep)), departsHC = sum(R.map(r => r.depConf + r.depAutre));

    const cartes = [
      carte('Population mondiale', `${popTexte(pop)}`,
        `${signe(croiss * 100, 2)}${NB}% sur la dernière année. Pic jusqu’ici : ${popTexte(pic.pop)}, en ${pic.a}.`, 'var(--encre)'),
      carte('Réfugiés climatiques', `${morts(m.stock.clim, fr)}`,
        `Personnes aujourd’hui déplacées par le climat. Depuis 2025 : ${morts(m.cum.clim, fr)}.`, 'var(--cryo)'),
      carte('Déplacés par la guerre et la faim', `${morts(m.stock.conflit + m.stock.autre, fr)}`,
        `Départs de l’année : ${morts(departsHC, fr)}.`, 'var(--alerte)'),
      carte('Migrations entre régions', `${morts(fluxIntl, fr)}<small>par an</small>`,
        `Sur ${morts(departs, fr)} de départs cette année, environ 70${NB}% restent dans leur pays ou leur région d’origine.`, 'var(--anthropo)'),
    ].join('');

    const lignes = R.map(r => {
      const al = m.alertes[r.id], ferme = al && al.ferme;
      return `<tr><th scope="row"><span class="pastille" style="--c:${COUL_REGION[r.id]}"></span>${r.court}</th>
        <td>${popTexte(r.pop)}</td><td>${morts(r.dep, fr)}</td><td>${morts(r.depClim, fr)}</td><td>${morts(r.arr, fr)}</td>
        <td>${r.solde >= 0 ? '+' : '−'}${morts(Math.abs(r.solde), fr)}</td>
        <td>${ferme ? '<span class="badge violet">fermées</span>' : `${Math.round(r.ouv * 100)}${NB}%`}</td></tr>`;
    }).join('');

    // Courbes à la manière du modèle World3 (Meadows et al., 1972) : plusieurs grandeurs, indice 100 en 2025
    const idx = (k, ref) => h.map(x => [x.a, x[k] / ref * 100]);
    const S3 = [
      { nom: 'Population', coul: 'var(--encre)', pts: idx('pop', h0.pop) },
      { nom: 'Production (PIB)', coul: 'var(--hydro)', pts: idx('pib', h0.pib) },
      { nom: 'Nourriture', coul: 'var(--donut)', pts: idx('phi', h0.phi) },
      { nom: 'Ressources restantes', coul: 'var(--litho)', pts: idx('res', h0.res) },
      { nom: 'Pollution (entités nouvelles)', coul: 'var(--manque)', pts: idx('nouv', h0.nouv) },
      { nom: 'Stabilité sociale', coul: 'var(--ocre)', pts: idx('S', h0.S) },
    ];
    const vmax = Math.max(150, ...S3.flatMap(x => x.pts.map(p => p[1])));
    const ymax = Math.ceil(vmax / 50) * 50;
    const ticks = []; for (let v = 0; v <= ymax; v += ymax > 300 ? 100 : 50) ticks.push(v);
    const legende = S3.map(x => `<span style="--c:${x.coul}">${x.nom}</span>`).join('');
    const world3 = courbe({ series: S3.map(x => ({ pts: x.pts, coul: x.coul })), ymin: 0, ymax, yticks: ticks, w: 640, h: 270,
      label: 'Population, production, nourriture, ressources, pollution et stabilité, en indice 100 en 2025' });

    return `
      <p class="intro-panneau">La population mondiale, les déplacements forcés et les routes migratoires entre régions. Les migrations dépendent du climat, des guerres, de la faim et des crises ; elles pèsent à leur tour sur les régions d’accueil.</p>
      <div class="blocs">${cartes}</div>
      <h3 class="titre-section">Flux migratoires de l’année</h3>
      <div class="carte">${carteFlux(ctx)}</div>
      <p class="note-carte">Largeur des flèches : personnes accueillies dans une autre région. Sous le nom de chaque région : solde migratoire annuel. Les déplacements internes, majoritaires, ne sont pas dessinés.</p>
      <div class="defile"><table class="tableau">
        <thead><tr><th scope="col">Région</th><th scope="col">Population</th><th scope="col">Départs forcés</th><th scope="col">dont climat</th><th scope="col">Arrivées</th><th scope="col">Solde</th><th scope="col">Accueil</th></tr></thead>
        <tbody>${lignes}</tbody></table></div>
      <h3 class="titre-section">Courbes à la manière de World3</h3>
      <p class="intro-panneau">Plusieurs grandeurs sur le même graphique, en indice 100 en 2025, comme dans « Les limites à la croissance » (1972). Le modèle World3 a connu des mises à jour, dont une recalibration récente (Nebel et al., 2023) qui conclut que son scénario de référence aboutit toujours à un dépassement suivi d’un déclin. Atterrir n’est pas une réplique de World3 : c’est un jeu, bien plus simple sur certains points et plus détaillé sur d’autres (régions, politiques, événements).</p>
      <p class="legende">${legende}</p>
      <div class="courbes une"><figure><figcaption>Population, production, nourriture, ressources et pollution</figcaption>${world3}</figure></div>
      <h3 class="titre-section">Population par région</h3>
      <p class="legende">${R.map(r => `<span style="--c:${COUL_REGION[r.id]}">${r.court}</span>`).join('')}</p>
      <div class="courbes une"><figure><figcaption>Population mondiale (milliards)</figcaption>${aires(ctx, 640, 230)}</figure></div>
      <h3 class="titre-section">Repères</h3>
      <dl class="reperes">
        <dt>Réfugiés climatiques</dt><dd>Personnes qui doivent quitter leur foyer à cause de la chaleur, des sécheresses, des tempêtes ou de la montée des eaux. Ce n’est pas un statut juridique : la convention de Genève ne le prévoit pas. Les estimations sont très incertaines. La Banque mondiale (Groundswell, 2021) projette jusqu’à 216 millions de migrants climatiques internes d’ici 2050 dans son scénario le plus pessimiste ; seule une action rapide sur les émissions peut réduire ce chiffre de façon importante. Des milliards de personnes ne pourraient être concernées que dans un monde bien plus chaud que celui de ce jeu, ou en cumulant sur plusieurs décennies.</dd>
        <dt>Départs internes et internationaux</dt><dd>La plupart des déplacés restent dans leur pays ou leur région. Une part des départs prend la route d’une autre région, selon la proximité et l’attrait économique ; l’accueil se ferme quand les arrivées nourrissent le rejet et les tensions.</dd>
      </dl>`;
  }

  return { dateTexte, morts, entreeHTML, societe, evenements, population, detail, COUL_TYPE, COUL_REGION, INTENSITES };
})();
