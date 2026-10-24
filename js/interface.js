// =====================================================================
//  ATTERRIR — interface (lit et modifie l'état produit par le moteur)
// =====================================================================
(() => {
  'use strict';
  const A = Atterrir, P = Panneaux, fr = A.fr, NB = '\u00a0';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CLE = 'atterrir.partie.v2', CLE_OPT = 'atterrir.options';
  const NIVEAUX = ['aucun', 'modéré', 'fort', 'maximal'];
  const SPH = {
    atmo: ['Atmosphère', 'var(--atmo)'], hydro: ['Hydrosphère', 'var(--hydro)'], cryo: ['Cryosphère', 'var(--cryo)'],
    litho: ['Lithosphère', 'var(--litho)'], bio: ['Biosphère', 'var(--bio)'], anthropo: ['Anthroposphère', 'var(--anthropo)'],
  };
  const DESC_LIMITES = {
    climat: 'Concentration de CO₂ dans l’atmosphère.',
    biosphere: 'Part des espèces et des écosystèmes encore intacts.',
    sols: 'Forêts restantes par rapport à leur surface d’origine.',
    eau: 'Perturbation du cycle de l’eau douce : rivières, nappes, humidité des sols.',
    azote: 'Engrais azotés et phosphatés qui ruissellent vers les rivières et les mers.',
    acid: 'Le CO₂ dissous rend l’océan plus acide : coquillages et coraux en souffrent.',
    nouvelles: 'Plastiques, pesticides et substances chimiques nouvelles dans l’environnement.',
    aerosols: 'Particules en suspension (fumées, sulfates) qui perturbent les moussons. Elles refroidissent aussi un peu le climat.',
    ozone: 'Grâce au protocole de Montréal (1987), la couche d’ozone se reconstitue : la preuve qu’une limite peut être réparée.',
  };
  const DESC_PLANCHERS = {
    revenu: 'Revenu moyen sous 12 000 $ par habitant.',
    alim: 'Production alimentaire accessible inférieure aux besoins.',
    energie: 'Moins de 30 GJ d’énergie par habitant et par an (à efficacité égale à celle de 2025 : une maison mieux isolée chauffe autant avec moins).',
    stab: 'Stabilité sociale sous 45 sur 100.',
  };
  let etat = null, st = null, onglet = 'politiques', regionSel = 'asi', metrique = 'co2hab';
  let zoneFixe = null, zoneVol = null, nonLus = 0;
  let enMarche = false, vitesse = 1, filtreCat = 'tous', severe = false, pauseAuto = true;
  const VITESSES = [1, 2, 5, 15, 60];
  const SEC_PAR_AN = 60;                       // à la vitesse ×1 : une minute = une année

  // ---------- Utilitaires ----------
  const pct = (x, d = 0) => `${fr(x * 100, d)}${NB}%`;
  const deg = x => `${x >= 0 ? '+' : '−'}${fr(Math.abs(x), 2)}${NB}°C`;
  const signe = (x, d = 1) => `${x >= 0 ? '+' : '−'}${fr(Math.abs(x), d)}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const popTot = () => st.regions.reduce((a, r) => a + r.pop, 0);
  const moy = f => st.regions.reduce((a, r) => a + f(r) * r.pop, 0) / popTot();
  const doublement = g => (g > 0.0005 ? Math.round(Math.log(2) / Math.log(1 + g)) : null);
  const popTexte = m => (m >= 1000 ? `${fr(m / 1000, 2)}${NB}milliards` : `${fr(m, 0)}${NB}millions`);
  const def = id => A.BASCULES.find(b => b.id === id);
  const bascule = id => st.bascules.find(b => b.id === id);

  function sauver() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* stockage indisponible */ } }
  function charger() {
    try {
      const s = localStorage.getItem(CLE);
      if (!s) return null;
      const o = JSON.parse(s);
      return o && o.version === 2 && o.regions && o.actifs ? o : null;
    } catch (e) { return null; }
  }
  function chargerOptions() {
    try { const o = JSON.parse(localStorage.getItem(CLE_OPT) || '{}'); if (typeof o.pauseAuto === 'boolean') pauseAuto = o.pauseAuto; if (VITESSES.includes(o.vitesse)) vitesse = o.vitesse; } catch (e) { /* ignoré */ }
  }
  function sauverOptions() { try { localStorage.setItem(CLE_OPT, JSON.stringify({ pauseAuto, vitesse })); } catch (e) { /* stockage indisponible */ } }
  function graineAdresse() { const m = location.hash.match(/^#s(\d{1,9})$/); return m ? +m[1] : null; }
  const nouvelleGraine = () => 1 + Math.floor(Math.random() * 999999);

  // ---------- Rendu général ----------
  // `etat` est l'état du moteur ; `st` en est la vue à l'instant présent (grandeurs interpolées entre deux années).
  function majVue() { st = A.vue(etat); }
  const PANNEAUX = () => ({ politiques: rendrePolitiques, regions: rendreRegions, ressources: rendreRessources,
    spheres: rendreSpheres, societe: rendreSociete, evenements: rendreEvenements });

  function rendre() {
    majVue();
    rendreEntete(); rendreDonut(); rendreBocal();
    PANNEAUX()[onglet]();
    majOnglets(); majControles();
  }
  const focusDans = el => !!el && el.contains(document.activeElement) && document.activeElement !== el;
  // Mise à jour périodique pendant que le temps s'écoule : on ne touche pas à ce que l'utilisateur est en train de parcourir
  function rendreLeger(avecPanneau) {
    majVue();
    rendreEntete(); rendreBocal();
    if (!focusDans($('#donut'))) rendreDonut();
    const panneau = $(`#p-${onglet}`);
    if (avecPanneau && !['politiques', 'evenements'].includes(onglet) && !focusDans(panneau)) PANNEAUX()[onglet]();
  }
  function rendrePanneauAvecFocus() {
    const panneau = $(`#p-${onglet}`), a = document.activeElement;
    let sel = null;
    if (focusDans(panneau)) {
      sel = a.tagName.toLowerCase() + [...a.attributes].filter(x => x.name.startsWith('data-') || x.name === 'id')
        .map(x => `[${x.name}="${CSS.escape(x.value)}"]`).join('');
    }
    PANNEAUX()[onglet]();
    if (sel) panneau.querySelector(sel)?.focus({ preventScroll: true });
  }

  let dateAff = '';
  function majHorloge() {
    const d = P.dateTexte(etat.t);
    if (d !== dateAff) { dateAff = d; $('#m-date').textContent = d; }
  }
  function rendreEntete() {
    const g = st.g, cout = A.coutTotal(st.leviers);
    dateAff = P.dateTexte(st.t); $('#m-date').textContent = dateAff;
    $('#m-temp').textContent = deg(g.T);
    $('#m-ppm').textContent = `${Math.round(g.ppm)}${NB}ppm`;
    $('#m-pop').textContent = popTexte(popTot());
    $('#m-gini').textContent = fr(moy(r => r.gini), 2);
    $('#m-demo').innerHTML = `${Math.round(moy(r => r.demo))} <small>/100</small>`;
    const cap = $('#m-cap');
    cap.innerHTML = `${cout} <small>sur ${st.budget}</small>`;
    cap.classList.toggle('alerte', cout > st.budget);
  }

  // ---------- Écoulement du temps ----------
  function construireHorloge() {
    for (const c of $$('[data-horloge]')) {
      c.innerHTML = `<button type="button" class="b-lecture"></button>
        <span class="vitesses" role="group" aria-label="Vitesse : ×1 correspond à une année par minute">${VITESSES.map(v =>
    `<button type="button" data-v="${v}" title="${v === 1 ? 'Une année par minute' : `${v} fois plus vite`}">×${v}</button>`).join('')}</span>
        <label class="pause-auto"><input type="checkbox" class="c-pause"> Pause sur événement grave</label>`;
    }
  }
  function majControles() {
    for (const b of $$('.b-lecture')) {
      b.textContent = etat.fini ? 'Voir le bilan' : enMarche ? '⏸ Pause' : '▶ Lecture';
      b.classList.toggle('pulse', !enMarche && !etat.fini && etat.t === A.ANNEE_DEBUT);
    }
    for (const b of $$('.vitesses button')) b.setAttribute('aria-pressed', +b.dataset.v === vitesse);
    for (const c of $$('.c-pause')) c.checked = pauseAuto;
  }
  function lecture(marche) {
    if (etat.fini) { ouvrirFin(); return; }
    enMarche = marche;
    majControles();
  }

  const BADGE_TOAST = 4;
  function toast(e, pause) {
    const c = $('#toasts'), d = document.createElement('div');
    d.className = 'toast'; d.dataset.grav = e.gravite;
    d.style.setProperty('--c', P.COUL_TYPE[e.type] || 'var(--trait)');
    d.innerHTML = `<span class="toast-date">${P.dateTexte(e.date)}</span><strong>${esc(e.titre)}</strong>${pause ? '<span class="toast-pause">Pause automatique</span>' : ''}`;
    d.addEventListener('click', () => { d.remove(); choisirOnglet('evenements'); });
    c.appendChild(d);
    while (c.children.length > BADGE_TOAST) c.firstChild.remove();
    setTimeout(() => d.remove(), pause ? 20000 : 9000);
  }
  function traiterEvenements(liste) {
    for (const e of liste) {
      if (e.gravite >= 2 && onglet !== 'evenements') nonLus++;
      const pause = pauseAuto && e.gravite >= 3 && enMarche;
      if (e.gravite >= 2) toast(e, pause);
      if (pause) { enMarche = false; majControles(); }
    }
    majOnglets();
  }

  let dernier = null, accLeger = 0, accPanneau = 0, accSauve = 0, anneeAff = null, sale = false;
  const dialogueOuvert = () => !!document.querySelector('dialog[open]');
  function boucle(ts) {
    requestAnimationFrame(boucle);
    const dt = dernier === null ? 0 : Math.min(0.5, (ts - dernier) / 1000);
    dernier = ts;
    if (!enMarche || etat.fini || dialogueOuvert()) return;
    const res = A.avancerTemps(etat, dt * vitesse / SEC_PAR_AN);
    majHorloge();
    accLeger += dt; accPanneau += dt; accSauve += dt;
    if (res.nouveaux.length) { traiterEvenements(res.nouveaux); sale = true; }
    if (Math.floor(etat.t) !== anneeAff) { anneeAff = Math.floor(etat.t); sale = true; }
    if (etat.fini) { enMarche = false; sauver(); rendre(); ouvrirFin(); return; }
    if (accLeger >= 0.25 || (sale && accLeger >= 0.1)) {
      accLeger = 0;
      if (sale) { sale = false; accPanneau = 0; majVue(); rendreEntete(); rendreBocal(); if (!focusDans($('#donut'))) rendreDonut(); rendrePanneauAvecFocus(); }
      else { rendreLeger(accPanneau >= 1); if (accPanneau >= 1) accPanneau = 0; }
    }
    if (accSauve >= 3) { accSauve = 0; sauver(); }
  }

  // ---------- Donut ----------
  const R_IN = 96, R_OUT = 136;
  function pt(r, a) {
    const t = (a - 90) * Math.PI / 180;
    return [+(r * Math.cos(t)).toFixed(2), +(r * Math.sin(t)).toFixed(2)];
  }
  function secteur(r1, r2, a1, a2) {
    const l = a2 - a1 > 180 ? 1 : 0;
    const [x1, y1] = pt(r2, a1), [x2, y2] = pt(r2, a2), [x3, y3] = pt(r1, a2), [x4, y4] = pt(r1, a1);
    return `M${x1} ${y1}A${r2} ${r2} 0 ${l} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${l} 0 ${x4} ${y4}Z`;
  }
  const franchies = () => A.LIMITES.filter(l => l.ratio(st.g) > 1).length;

  function rendreDonut() {
    const g = st.g, pas = 360 / A.LIMITES.length;
    const manques = A.manquesSociaux(st);
    let ext = '', int = '', lbl = '', zones = '';
    A.LIMITES.forEach((l, i) => {
      const a1 = i * pas + 1.6, a2 = (i + 1) * pas - 1.6, am = (i + 0.5) * pas;
      const r = l.ratio(g);
      ext += `<path d="${secteur(R_IN, R_IN + Math.min(1, r) * (R_OUT - R_IN), a1, a2)}" fill="var(--donut)" opacity="0.6"/>`;
      if (r > 1) {
        const len = Math.min(1.9, r - 1) * 38;
        ext += `<path class="ext" d="${secteur(R_OUT, R_OUT + len, a1, a2)}" fill="${r > l.hr ? 'var(--alerte)' : 'var(--ocre)'}"/>`;
      }
      const [x, y] = pt(226, am);
      const s = Math.sin(am * Math.PI / 180), c = Math.cos(am * Math.PI / 180);
      const anchor = s > 0.3 ? 'start' : s < -0.3 ? 'end' : 'middle';
      lbl += `<text class="lbl" x="${x}" y="${(y + (c > 0.6 ? -2 : c < -0.6 ? 12 : 4)).toFixed(1)}" text-anchor="${anchor}">${l.court}</text>`;
      zones += `<path class="zone" tabindex="0" role="button" aria-label="${esc(l.nom)}" data-z="e${i}" d="${secteur(R_IN, 214, a1 - 1.6, a2 + 1.6)}"/>`;
    });
    manques.forEach((m, i) => {
      const a1 = i * 90 + 3, a2 = (i + 1) * 90 - 3, am = (i + 0.5) * 90;
      const len = Math.min(76, m.manque * 160);
      if (len > 0.5) int += `<path class="int" d="${secteur(R_IN - len, R_IN, a1, a2)}" fill="var(--manque)" opacity="0.85"/>`;
      const [x, y] = pt(66, am);
      lbl += `<text class="lbl-soc" x="${x}" y="${y + 4}" text-anchor="middle">${m.court}</text>`;
      zones += `<path class="zone" tabindex="0" role="button" aria-label="Plancher social : ${esc(m.nom)}" data-z="s${i}" d="${secteur(20, R_IN, a1 - 3, a2 + 3)}"/>`;
    });
    const n = franchies();
    $('#donut').innerHTML = `
      <svg viewBox="-272 -250 544 500" role="img" aria-labelledby="donut-titre">
        <title id="donut-titre">Donut : ${n} limites planétaires franchies sur 9</title>
        <circle r="${(R_IN + R_OUT) / 2}" fill="none" stroke="var(--donut-pale)" stroke-width="${R_OUT - R_IN}"/>
        ${ext}
        <circle r="${R_IN}" fill="none" stroke="var(--donut)" stroke-width="1.5"/>
        <circle r="${R_OUT}" fill="none" stroke="var(--donut)" stroke-width="1.5"/>
        ${int}${lbl}
        <text class="annee" y="2" text-anchor="middle">${Math.floor(st.t)}</text>
        <text class="sous-annee" y="20" text-anchor="middle">${n} limites franchies</text>
        ${zones}
      </svg>`;
    majDetail(zoneVol || zoneFixe);
  }

  function majDetail(z) {
    const el = $('#detail-donut');
    el.className = 'detail-donut';
    if (!z) {
      const sous = A.partSousPlancher(st);
      el.innerHTML = `<strong>${franchies()} limites planétaires franchies sur 9</strong>
        ${sous > 0.005 ? `${pct(sous)} de la population vit dans une région sous le plancher social.` : 'Toutes les régions sont au-dessus du plancher social.'}
        Touchez une part du donut pour le détail.`;
      return;
    }
    if (z[0] === 'e') {
      const l = A.LIMITES[+z.slice(1)], r = l.ratio(st.g);
      const etat = r <= 1 ? 'Dans l’espace sûr.' : r <= l.hr ? 'Limite franchie : zone d’incertitude, le risque augmente.' : 'Zone à haut risque.';
      el.classList.add(r <= 1 ? 'sur' : r <= l.hr ? 'ocre' : 'alerte');
      el.innerHTML = `<strong>${l.nom}</strong>${l.val(st.g)} (${l.seuil}). ${etat}<br>${DESC_LIMITES[l.id]}`;
    } else {
      const p = A.PLANCHERS[+z.slice(1)];
      const sous = st.regions.filter(r => p.val(r) < 0.97).map(r => r.court);
      el.classList.add('manque');
      el.innerHTML = `<strong>Plancher social : ${p.nom}</strong>${DESC_PLANCHERS[p.id]}
        ${sous.length ? `Sous le plancher : ${sous.join(', ')}.` : 'Aucune région sous le plancher.'}`;
    }
  }

  function rendreBocal() {
    const b = A.budgetCarbone(st), part = Math.max(0, Math.min(1, b.part));
    const h = 58 * part, coul = part > 0.8 ? 'var(--alerte)' : part > 0.5 ? 'var(--ocre)' : 'var(--atmo)';
    const croiss = A.croissanceMondiale(st), dbl = doublement(croiss);
    $('#bocal').innerHTML = `
      <svg viewBox="0 0 54 84" aria-hidden="true">
        <defs><clipPath id="interieur"><path d="M10 18h34v54a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z"/></clipPath></defs>
        <rect x="6" y="80" width="42" height="0"/>
        <g clip-path="url(#interieur)"><rect x="10" y="${(80 - h).toFixed(1)}" width="34" height="${h.toFixed(1)}" fill="${coul}"/></g>
        <path d="M10 18h34v54a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z" fill="none" stroke="var(--encre)" stroke-width="2"/>
        <rect x="14" y="8" width="26" height="10" rx="2" fill="none" stroke="var(--encre)" stroke-width="2"/>
      </svg>
      <div>
        <p>Budget carbone pour rester sous +2${NB}°C : <strong>${pct(part)}</strong> consommé depuis 2025.
        ${b.part >= 1 ? 'Il est épuisé.' : `Au rythme actuel, il sera épuisé dans ${Math.round(b.anneesRestantes)}${NB}ans.`}</p>
        <p>${croiss > 0.0005
          ? `Économie mondiale : ${signe(croiss * 100)}${NB}% par an. À ce rythme, elle double tous les ${dbl}${NB}ans.`
          : `Économie mondiale : ${signe(croiss * 100)}${NB}% par an.`}</p>
      </div>`;
  }

  // ---------- Politiques ----------
  function etatLevier(id) {
    const g = st.g;
    const riches = st.regions.filter(r => r.yEff > A.SEUIL_RICHE).map(r => r.court);
    const lc = st.regions.reduce((a, r) => a + r.E * r.s, 0) / st.regions.reduce((a, r) => a + r.E, 0);
    const afr = st.regions.find(r => r.id === 'afr');
    switch (id) {
      case 'bascarbone': return `Part bas-carbone de l’énergie mondiale : ${pct(lc)}.`;
      case 'efficacite': return `Effet rebond actuel : ${pct(g.rebond)} des économies sont reconsommées.`;
      case 'sobriete': return riches.length ? `Concerne aujourd’hui : ${riches.join(', ')}.` : 'Aucune région au-dessus de 30 000 $/hab.';
      case 'protection': return `Stabilité sociale moyenne : ${Math.round(A.stabiliteMoyenne(st))}/100.`;
      case 'forets': return `Couvert forestier : ${fr(g.foret, 1)}${NB}% de la surface d’origine.`;
      case 'agro': return `Engrais azotés : ${Math.round(g.azote)}${NB}Mt par an.`;
      case 'peche': return `Prises : ${Math.round(g.prises)}${NB}Mt par an.`;
      case 'circulaire': return `Stock de métaux extractibles : ${pct(g.metaux / g.metaux0)} de celui de 2025.`;
      case 'solidarite': return `Stabilité de l’Afrique : ${Math.round(afr.S)}/100.`;
      default: return '';
    }
  }

  function rendrePolitiques() {
    const cout = A.coutTotal(st.leviers), b = st.budget, dep = cout > b;
    let seg = '';
    for (let i = 0; i < Math.max(b, cout); i++) seg += `<i class="${i >= b ? 'trop' : i < cout ? 'plein' : ''}"></i>`;
    const aide = st.fini ? 'La partie est terminée.'
      : dep ? `Il manque ${cout - b} point${cout - b > 1 ? 's' : ''} : si cela dure, la politique la plus coûteuse sera abandonnée d’un niveau.`
        : 'Chaque politique peut monter d’un niveau tous les 5 ans, et baisser à tout moment. Votre capital dépend de la stabilité, des guerres et des crises.';
    let rows = '';
    for (const l of A.LEVIERS) {
      const n = st.leviers[l.id];
      let btns = '';
      for (let k = 0; k <= 3; k++) {
        const v = A.verifierReglage(etat, l.id, k), off = st.fini || !v.ok;
        btns += `<button type="button" data-l="${l.id}" data-n="${k}" aria-pressed="${k === n}" ${off ? 'disabled' : ''}
          aria-label="${esc(l.nom)} : niveau ${k}, ${NIVEAUX[k]}${off && !st.fini ? ` (${esc(v.raison)})` : ''}">${k}</button>`;
      }
      const [nomSph, coul] = SPH[l.sphere];
      const attente = n < 3 && st.prochaine[l.id] > st.t ? `, prochaine hausse en ${Math.ceil(st.prochaine[l.id])}` : '';
      rows += `<li class="levier">
        <div>
          <h3><span class="pastille" style="--c:${coul}" title="${nomSph}"></span>${l.nom}</h3>
          <p class="effet">${l.effet}</p>
          <p class="revers">${l.revers}</p>
          <p class="etat">${etatLevier(l.id)}</p>
        </div>
        <div class="reglage">
          <div class="niveaux" role="group" aria-label="Niveau : ${esc(l.nom)}">${btns}</div>
          <span class="cout">${NIVEAUX[n]}, coût ${A.COUTS[n]}${attente}</span>
        </div>
      </li>`;
    }
    $('#p-politiques').innerHTML = `
      <div class="budget ${dep ? 'depasse' : ''}">
        <div class="budget-tete"><strong>Capital politique</strong><span>${cout} utilisé${cout > 1 ? 's' : ''} sur ${b}</span></div>
        <div class="jauge-budget" aria-hidden="true">${seg}</div>
        <p class="aide" role="status">${aide}</p>
      </div>
      <ul class="leviers">${rows}</ul>`;
  }

  // ---------- Régions ----------
  const K = 700 / 352;
  const proj = ([lon, lat]) => [((lon + 170) * K).toFixed(1), ((84 - lat) * K).toFixed(1)];
  const chemin = poly => 'M' + poly.map(p => proj(p).join(' ')).join('L') + 'Z';
  function metriques() {
    const cumTot = st.regions.reduce((a, r) => a + r.cumCO2, 0);
    return {
      co2hab: { nom: 'CO₂ par habitant', val: r => r.co2 / r.pop * 1000, fmt: v => `${fr(v, 1)}${NB}t/hab.`, max: 14, bas: '0 t', haut: '14 t' },
      hist: { nom: 'Part du CO₂ depuis 1850', val: r => r.cumCO2 / cumTot, fmt: v => pct(v), max: 0.35, bas: '0 %', haut: '35 %' },
      stab: { nom: 'Stabilité sociale', val: r => r.S, fmt: v => `${Math.round(v)}/100`, max: 100, bien: true, bas: '0', haut: '100' },
      dmg: { nom: 'Dommages climatiques', val: r => r.dmg, fmt: v => `${fr(v * 100, 1)}${NB}% du PIB`, max: 0.08, bas: '0 %', haut: '8 %' },
      gini: { nom: 'Inégalités', val: r => r.gini, fmt: v => `Gini ${fr(v, 2)}`, min: 0.25, max: 0.55, bas: '0,25', haut: '0,55' },
      demo: { nom: 'Démocratie', val: r => r.demo, fmt: v => `${Math.round(v)}/100`, max: 100, bien: true, bas: '0', haut: '100' },
      tension: { nom: 'Tensions', val: r => r.tension, fmt: v => `${Math.round(v)}/100`, max: 100, bas: '0', haut: '100' },
    };
  }
  function couleur(m, v) {
    const p = Math.round(Math.max(0, Math.min(1, (v - (m.min || 0)) / (m.max - (m.min || 0)))) * 100);
    return m.bien ? `color-mix(in oklab, var(--donut) ${p}%, var(--alerte))` : `color-mix(in oklab, var(--alerte) ${p}%, var(--surface-2))`;
  }

  function rendreRegions() {
    const M = metriques(), m = M[metrique];
    let choix = '';
    for (const [k, x] of Object.entries(M)) choix += `<button type="button" data-m="${k}" aria-pressed="${k === metrique}">${x.nom}</button>`;
    let terres = '', noms = '';
    for (const r of st.regions) {
      const v = m.val(r);
      terres += `<g class="region ${r.id === regionSel ? 'sel' : ''}" data-r="${r.id}" tabindex="0" role="button"
        aria-label="${esc(r.nom)} : ${esc(m.fmt(v))}" aria-pressed="${r.id === regionSel}">
        ${CARTE[r.id].map(p => `<path class="terre" d="${chemin(p)}" fill="${couleur(m, v)}"/>`).join('')}</g>`;
      const [x, y] = proj(ETIQUETTES[r.id]);
      noms += `<text class="nom halo" x="${x}" y="${y}" text-anchor="middle">${r.court}</text>
        <text class="val halo" x="${x}" y="${+y + 15}" text-anchor="middle">${m.fmt(v)}</text>
        ${r.crise ? `<text class="val halo" x="${x}" y="${+y + 29}" text-anchor="middle" style="fill:var(--alerte)">en crise</text>` : ''}
        ${st.actifs.guerres.some(w => w.region === r.id) ? `<text class="val halo" x="${x}" y="${+y + (r.crise ? 43 : 29)}" text-anchor="middle" style="fill:var(--alerte)">en guerre</text>` : ''}`;
    }
    const lacs = LACS.map(p => `<path class="lac" d="${chemin(p)}"/>`).join('');
    const a = m.bien ? 'var(--alerte)' : 'var(--surface-2)', b = m.bien ? 'var(--donut)' : 'var(--alerte)';
    $('#p-regions').innerHTML = `
      <p class="intro-panneau">Ceux qui ont le plus émis ne sont pas ceux qui subissent le plus. Touchez une région pour sa fiche.</p>
      <div class="choix" role="group" aria-label="Indicateur affiché">${choix}</div>
      <div class="carte"><svg viewBox="0 0 700 281" aria-label="Carte schématique des régions">${terres}${lacs}${noms}</svg></div>
      <div class="echelle" style="--a:${a};--b:${b}"><span>${m.bas}</span><i></i><span>${m.haut}</span></div>
      ${ficheRegion()}`;
  }

  function ficheRegion() {
    const r = st.regions.find(x => x.id === regionSel);
    const cumTot = st.regions.reduce((a, x) => a + x.cumCO2, 0);
    const co2Tot = st.regions.reduce((a, x) => a + x.co2, 0), pt = popTot();
    const co2h = r.co2 / r.pop * 1000, moy = co2Tot / pt * 1000;
    const dbl = doublement(r.gEff);
    const phrase = r.id === 'afr'
      ? `L’Afrique compte ${pct(r.pop / pt)} de la population mondiale mais n’a émis que ${pct(r.cumCO2 / cumTot)} du CO₂ depuis 1850. C’est pourtant la région la plus exposée aux dommages climatiques.`
      : `Un habitant émet ${fr(co2h, 1)}${NB}t de CO₂ par an, soit ${fr(co2h / moy, 1)} fois la moyenne mondiale. La région a émis ${pct(r.cumCO2 / cumTot)} du CO₂ cumulé depuis 1850.`;
    const sc = r.S < 35 ? 'var(--alerte)' : r.S < 50 ? 'var(--ocre)' : 'var(--donut)';
    return `<div class="fiche">
      <h3>${r.nom}${r.crise ? '<span class="badge">en crise</span>' : ''}${st.actifs.guerres.some(w => w.region === r.id) ? '<span class="badge">en guerre</span>' : ''}</h3>
      <p class="phrase">${phrase}</p>
      <dl class="chiffres">
        <div><dt>Population</dt><dd>${popTexte(r.pop)}</dd></div>
        <div><dt>PIB par habitant</dt><dd>${fr(r.yEff, 0)}${NB}$</dd></div>
        <div><dt>Croissance</dt><dd>${signe(r.gEff * 100)}${NB}%/an ${dbl ? `<small>double en ${dbl}${NB}ans</small>` : ''}</dd></div>
        <div><dt>Énergie</dt><dd>${fr(A.energieParHab(r), 0)}${NB}GJ/hab.</dd></div>
        <div><dt>Énergie bas-carbone</dt><dd>${pct(r.s)}</dd></div>
        <div><dt>Émissions de CO₂</dt><dd>${fr(r.co2, 1)}${NB}Gt/an</dd></div>
        <div><dt>Stabilité sociale</dt><dd>${Math.round(r.S)}/100<div class="barre-mini" style="--c:${sc}"><i style="width:${r.S}%"></i></div></dd></div>
        <div><dt>Alimentation</dt><dd>${fr(r.food, 2)} <small>1 = besoins couverts</small></dd></div>
        <div><dt>Inégalités (Gini)</dt><dd>${fr(r.gini, 2)}</dd></div>
        <div><dt>Démocratie</dt><dd>${Math.round(r.demo)}/100<div class="barre-mini" style="--c:var(--hydro)"><i style="width:${r.demo}%"></i></div></dd></div>
        <div><dt>Tensions</dt><dd>${Math.round(r.tension)}/100<div class="barre-mini" style="--c:var(--alerte)"><i style="width:${r.tension}%"></i></div></dd></div>
        <div><dt>Dommages climatiques</dt><dd>${fr(r.dmg * 100, 1)}${NB}% du PIB</dd></div>
      </dl></div>`;
  }

  // ---------- Courbes ----------
  function courbe({ series, refs = [], ymin, ymax, yticks, yfmt = v => fr(v), w = 320, h = 170, label }) {
    const ml = 34, mr = refs.length ? 56 : 12, mt = 8, mb = 22, x0 = 2025, x1 = 2100;
    const X = x => (ml + (x - x0) / (x1 - x0) * (w - ml - mr)).toFixed(1);
    const Y = y => (mt + (1 - (Math.min(ymax, Math.max(ymin, y)) - ymin) / (ymax - ymin)) * (h - mt - mb)).toFixed(1);
    let s = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">`;
    for (const v of yticks) {
      s += `<line class="axe" x1="${ml}" x2="${w - mr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="tick" x="${ml - 6}" y="${+Y(v) + 4}" text-anchor="end">${yfmt(v)}</text>`;
    }
    for (const x of [2025, 2050, 2075, 2100]) s += `<text class="tick" x="${X(x)}" y="${h - 5}" text-anchor="middle">${x}</text>`;
    for (const r of refs) {
      s += `<path class="ref" d="M${r.pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}"/>`;
      const [lx, ly] = r.pts[r.pts.length - 1];
      s += `<text class="ref-lbl" x="${+X(lx) + 4}" y="${+Y(ly) + 3}">${r.id}</text>`;
    }
    for (const se of series) {
      if (!se.pts.length) continue;
      s += `<path d="M${se.pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}" fill="none" stroke="${se.coul}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
      const [lx, ly] = se.pts[se.pts.length - 1];
      s += `<circle cx="${X(lx)}" cy="${Y(ly)}" r="3.5" fill="${se.coul}"/>`;
    }
    return s + '</svg>';
  }
  const serie = cle => st.hist.map(h => [h.a, h[cle]]);
  function courbeTemperature(w = 320, h = 170) {
    const maxT = Math.max(4.6, ...st.hist.map(x => x.T + 0.2));
    return courbe({ series: [{ pts: serie('T'), coul: 'var(--alerte)' }], refs: A.SSP, ymin: 1, ymax: maxT,
      yticks: [1, 2, 3, 4].filter(v => v <= maxT), yfmt: v => `${v}${NB}°`, w, h,
      label: 'Réchauffement de la partie comparé aux scénarios du GIEC' });
  }

  // ---------- Ressources ----------
  function rendreRessources() {
    const g = st.g, f = st.flags;
    const rp = g.prodPetrole > 0.1 ? Math.round(g.petrole / g.prodPetrole) : null;
    const anneesM = g.demMetaux > 0.01 ? Math.round(g.metaux / g.demMetaux) : null;
    const maxPet = Math.max(40, ...st.hist.map(h => h.petrole));
    const maxPois = Math.max(500, ...st.hist.map(h => h.poissons));
    $('#p-ressources').innerHTML = `
      <p class="intro-panneau">Un stock fini consommé à un rythme qui croît de quelques pour cent par an s’épuise beaucoup plus vite que le calcul « stock ÷ consommation actuelle » ne le laisse croire.</p>
      <div class="blocs">
        <section class="bloc" style="--c:var(--litho)">
          <h3>Pétrole</h3>
          <dl class="chiffres">
            <div><dt>Reste extractible</dt><dd>${fr(g.petrole / 6, 0)}${NB}Gb<div class="barre-mini" style="--c:var(--litho)"><i style="width:${Math.min(100, g.petrole / g.petrole0 * 100)}%"></i></div></dd></div>
            <div><dt>Production</dt><dd>${fr(g.prodPetrole / 6, 1)}${NB}Gb/an</dd></div>
            <div><dt>Rendement énergétique</dt><dd>${fr(g.eroi, 1)} pour 1 <small>énergie obtenue / investie</small></dd></div>
            <div><dt>Au rythme actuel</dt><dd>${rp ? `${rp}${NB}ans` : '—'}</dd></div>
          </dl>
          ${courbe({ series: [{ pts: serie('petrole'), coul: 'var(--litho)' }], ymin: 0, ymax: maxPet, yticks: [0, 20, 40, 60].filter(v => v <= maxPet), w: 300, h: 120, label: 'Production de pétrole (milliards de barils par an)' })}
          <p class="note ${f.pic ? 'forte' : ''}">${f.pic ? `Pic pétrolier atteint en ${f.pic} : la production ne suit plus la demande.` : 'Plus le stock baisse, plus il faut d’énergie pour extraire chaque baril.'}</p>
        </section>
        <section class="bloc" style="--c:var(--litho)">
          <h3>Métaux critiques</h3>
          <dl class="chiffres">
            <div><dt>Stock extractible</dt><dd>${pct(g.metaux / g.metaux0)}<div class="barre-mini" style="--c:var(--litho)"><i style="width:${g.metaux / g.metaux0 * 100}%"></i></div></dd></div>
            <div><dt>Demande</dt><dd>×${fr(g.demMetaux, 2)} <small>par rapport à 2025</small></dd></div>
            <div><dt>Au rythme actuel</dt><dd>${anneesM ? `${anneesM}${NB}ans` : '—'}</dd></div>
            <div><dt>Pénurie</dt><dd>${pct(g.penurieMetaux)}</dd></div>
          </dl>
          <p class="note ${f.metaux ? 'forte' : ''}">${f.metaux ? `Pénurie depuis ${f.metaux} : la construction d’éoliennes et de réseaux ralentit.` : 'Cuivre, lithium, nickel, cobalt : la croissance et la construction des énergies bas-carbone en consomment. Le recyclage réduit la demande.'}</p>
        </section>
        <section class="bloc" style="--c:var(--hydro)">
          <h3>Pêche</h3>
          <dl class="chiffres">
            <div><dt>Poissons dans l’océan</dt><dd>${fr(g.poissons, 0)}${NB}Mt <small>sur ${fr(g.K, 0)} possibles</small></dd></div>
            <div><dt>Prises</dt><dd>${fr(g.prises, 0)}${NB}Mt/an</dd></div>
          </dl>
          ${courbe({ series: [{ pts: serie('poissons'), coul: 'var(--hydro)' }], refs: [{ id: 'mi-capacité', pts: st.hist.map(h => [h.a, h.K / 2]) }], ymin: 0, ymax: maxPois, yticks: [0, 250, 500], w: 300, h: 120, label: 'Biomasse de poissons (millions de tonnes)' })}
          <p class="note ${f.peche ? 'forte' : ''}">${f.peche ? `Effondrement des pêcheries en ${f.peche}.` : g.poissons < g.K / 2 ? 'Le stock est sous la moitié de sa capacité : il est surexploité. C’est à mi-capacité qu’il se renouvelle le plus vite.' : 'Le stock se reconstitue.'}</p>
        </section>
        <section class="bloc" style="--c:var(--bio)">
          <h3>Terres et alimentation</h3>
          <dl class="chiffres">
            <div><dt>Couvert forestier</dt><dd>${fr(g.foret, 1)}${NB}%</dd></div>
            <div><dt>Production alimentaire</dt><dd>${pct(g.phi)} <small>des besoins</small></dd></div>
            <div><dt>Engrais azotés</dt><dd>${Math.round(g.azote)}${NB}Mt/an</dd></div>
          </dl>
          <p class="note">Plus de terres cultivées, c’est moins de forêts. L’agroécologie et des régimes moins carnés desserrent l’étau.</p>
        </section>
      </div>`;
  }

  // ---------- Sphères ----------
  function rendreSpheres() {
    const g = st.g, pib = st.hist[st.hist.length - 1].pib;
    const etatB = id => { const b = bascule(id); return b.active ? `basculé en ${b.annee}` : 'stable'; };
    const crises = st.regions.filter(r => r.crise).length;
    const maxE = Math.max(50, ...st.hist.map(h => h.em + 2));
    const minE = Math.min(0, ...st.hist.map(h => h.em));
    const blocs = [
      ['atmo', [['Réchauffement', deg(g.T)], ['CO₂', `${Math.round(g.ppm)}${NB}ppm`], ['Émissions', `${fr(g.emissions, 1)}${NB}Gt/an`], ['Autres gaz et aérosols', `${signe(g.nonCO2, 2)}${NB}°C`]]],
      ['hydro', [['Acidité (Ω aragonite)', fr(g.omega, 2)], ['Eau douce', `indice ${fr(g.eau, 2)}`], ['Courant atlantique', etatB('amoc')], ['Récifs coralliens', etatB('coraux')]]],
      ['cryo', [['Banquise arctique en été', pct(g.banquise)], ['Niveau de la mer', `+${fr(g.mer * 100, 0)}${NB}cm <small>depuis 1900</small>`], ['Montée actuelle', `${fr(g.tauxMer, 1)}${NB}mm/an`], ['Groenland', etatB('groenland')]]],
      ['litho', [['Pétrole restant', `${fr(g.petrole / 6, 0)}${NB}Gb`], ['Métaux', pct(g.metaux / g.metaux0)], ['Pergélisol', etatB('pergelisol')]]],
      ['bio', [['Intégrité de la biosphère', `${fr(g.bii, 1)}${NB}%`], ['Forêts', `${fr(g.foret, 1)}${NB}%`], ['Amazonie', etatB('amazonie')], ['Poissons', `${fr(g.poissons, 0)}${NB}Mt`]]],
      ['anthropo', [['Population', popTexte(popTot())], ['PIB mondial', `${fr(pib, 0)}${NB}000${NB}Md$`], ['Stabilité moyenne', `${Math.round(A.stabiliteMoyenne(st))}/100`], ['Régions en crise', `${crises}`]]],
    ];
    const html = blocs.map(([id, rows]) => `<section class="bloc" style="--c:${SPH[id][1]}"><h3>${SPH[id][0]}</h3>
      <dl class="chiffres">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>`).join('');
    const echelle = v => ((v - 0.5) / 6 * 100).toFixed(2);
    const tPos = echelle(Math.min(6.5, g.T));
    const lignes = st.bascules.map(b => {
      const d = def(b.id), mode = ((d.mode - d.lo) / (d.hi - d.lo) * 100).toFixed(0);
      const fond = b.active ? 'var(--alerte)'
        : `linear-gradient(90deg, color-mix(in oklab, var(--ocre) 18%, transparent), var(--ocre) ${mode}%, color-mix(in oklab, var(--ocre) 18%, transparent))`;
      const stat = b.active ? `Franchi en ${b.annee}. ${d.effet}`
        : g.T >= d.lo ? `Le réchauffement est dans la zone de risque (+${fr(d.lo, 1)} à +${fr(d.hi, 1)}${NB}°C). Le seuil exact est inconnu.`
          : `Zone de risque entre +${fr(d.lo, 1)} et +${fr(d.hi, 1)}${NB}°C${d.foret ? `, ou si les forêts descendent sous ${d.foret}${NB}%` : ''}.`;
      return `<li><span class="nomb"><span class="pastille" style="--c:${SPH[d.sphere][1]}"></span>${d.nom}</span>
        <div class="risque" aria-hidden="true"><span class="plage" style="left:${echelle(d.lo)}%;width:${((Math.min(6.5, d.hi) - d.lo) / 6 * 100).toFixed(2)}%;background:${fond}"></span><span class="t" style="left:${tPos}%"></span></div>
        <span class="stat ${b.active ? 'franchi' : ''}">${stat}</span></li>`;
    }).join('');
    const grad = [1, 2, 3, 4, 5, 6].map(v => `<span style="position:absolute;left:${echelle(v)}%;transform:translateX(-50%)">${v}${NB}°C</span>`).join('');
    $('#p-spheres').innerHTML = `
      <p class="intro-panneau">Les six sphères du système Terre sont reliées : ce qui se passe dans l’une se répercute sur les autres.</p>
      <div class="blocs">${html}</div>
      <h3 class="titre-section">Points de bascule</h3>
      <p class="intro-panneau">Chaque barre montre la plage de réchauffement où le seuil se situe probablement (plus foncée au centre). Le trait vertical, c’est le réchauffement actuel. Le seuil exact de votre partie est caché.</p>
      <ul class="bascules">${lignes}
        <li aria-hidden="true"><span></span><div class="graduation" style="position:relative;height:16px;display:block">${grad}</div></li></ul>
      <h3 class="titre-section">Courbes du climat</h3>
      <div class="courbes">
        <figure><figcaption>Réchauffement et scénarios du GIEC</figcaption>${courbeTemperature()}</figure>
        <figure><figcaption>Émissions de CO₂ (Gt par an)</figcaption>${courbe({ series: [{ pts: serie('em'), coul: 'var(--encre)' }], ymin: Math.floor(minE / 10) * 10, ymax: maxE, yticks: [0, 20, 40, 60].filter(v => v <= maxE && v >= minE), label: 'Émissions de CO₂' })}</figure>
      </div>`;
  }

  // ---------- Société et événements ----------
  const ctxPanneau = () => ({ st, A, fr, pct, esc, popTexte, courbe, signe });
  function rendreSociete() { $('#p-societe').innerHTML = P.societe(ctxPanneau()); }
  function rendreEvenements() { $('#p-evenements').innerHTML = P.evenements(ctxPanneau(), filtreCat, severe); }

  // ---------- Onglets ----------
  function majOnglets() {
    for (const b of $$('.onglets [role="tab"]')) {
      const actif = b.dataset.o === onglet;
      b.setAttribute('aria-selected', actif);
      b.tabIndex = actif ? 0 : -1;
      $(`#p-${b.dataset.o}`).hidden = !actif;
    }
    const t = $('#t-evenements');
    t.innerHTML = `Événements${nonLus ? `<span class="pastille-notif" aria-label="${nonLus} nouveaux">${nonLus}</span>` : ''}`;
  }
  function choisirOnglet(o) {
    onglet = o;
    if (o === 'evenements') nonLus = 0;
    majVue(); PANNEAUX()[o]();
    majOnglets();
  }

  // ---------- Dialogues ----------
  function ouvrirIntro() {
    enMarche = false; majControles();
    const enCours = etat.t > A.ANNEE_DEBUT && !etat.fini;
    $('#intro-actions').innerHTML = enCours
      ? `<button type="button" class="avancer-principal" data-act="continuer">Reprendre la partie (${P.dateTexte(etat.t)})</button>
         <button type="button" class="secondaire" data-act="nouvelle">Nouvelle partie</button>`
      : `<button type="button" class="avancer-principal" data-act="continuer">Commencer la partie</button>`;
    const d = $('#d-intro');
    if (!d.open) d.showModal();
  }

  const ISSUES = {
    donut: ['Atterrissage réussi', 'Le monde est entré dans le donut : réchauffement contenu sous 2 °C, aucune société en crise, besoins essentiels couverts pour la grande majorité. Certaines limites restent franchies, l’effort doit continuer.'],
    descente: ['Descente maîtrisée', 'Le pire a été évité : les sociétés ont tenu et le réchauffement a été freiné. Mais le monde reste hors du donut, avec des dommages qui dureront des siècles.'],
    declin: ['Déclin chaotique', 'Crises à répétition, ressources épuisées, climat déréglé : le monde de 2100 est plus pauvre et plus fragile, sans s’être effondré partout.'],
    effondrement: ['Effondrement', 'Plusieurs grandes régions ont basculé dans la crise. Les émissions ont fini par baisser, mais parce que les économies se sont effondrées. C’est le scénario que redoutent les collapsologues.'],
  };
  function ouvrirFin() {
    const b = st.bilan, [titre, texte] = ISSUES[b.issue];
    $('#fin-titre').textContent = titre;
    $('#fin-corps').innerHTML = `
      <p class="fin-issue">${texte}</p>
      <dl class="deltas">
        <div><dt>Réchauffement en 2100</dt><dd>${deg(b.T)}</dd></div>
        <div><dt>Scénario du GIEC le plus proche</dt><dd>${b.ssp}</dd></div>
        <div><dt>Limites franchies</dt><dd>${b.franchies} sur 9</dd></div>
        <div><dt>Points de bascule</dt><dd>${b.bascules} sur 7</dd></div>
        <div><dt>Crises régionales</dt><dd>${b.crisesTotales}</dd></div>
        <div><dt>Sous le plancher social</dt><dd>${pct(b.sous)}</dd></div>
        <div><dt>Hausse des mers</dt><dd>+${fr(b.mer * 100, 0)}${NB}cm</dd></div>
        <div><dt>Morts (guerres, famines, épidémies, catastrophes)</dt><dd>${P.morts(b.mortsTotal, fr)}</dd></div>
        <div><dt>Guerres déclenchées</dt><dd>${b.stats.guerres}</dd></div>
        <div><dt>Révolutions</dt><dd>${b.stats.revolutions}</dd></div>
        <div><dt>Démocratie en 2100</dt><dd>${Math.round(b.demo)}/100</dd></div>
        <div><dt>Inégalités en 2100</dt><dd>Gini ${fr(b.gini, 2)}</dd></div>
      </dl>
      <figure>${courbeTemperature(560, 220)}<figcaption>Votre réchauffement (trait plein) et les scénarios du GIEC (valeurs centrales approximatives, moyenne 2081-2100 placée en 2090).</figcaption></figure>
      <p class="graine">Partie n°${st.seed}. Pour rejouer exactement la même partie, ajoutez #s${st.seed} à la fin de l’adresse de la page.</p>`;
    $('#d-fin').showModal();
  }

  // ---------- Actions ----------
  function nouvellePartie(graine) {
    etat = A.nouvellePartie(graine || graineAdresse() || nouvelleGraine());
    zoneFixe = null; zoneVol = null; nonLus = 0; onglet = 'politiques'; enMarche = false; anneeAff = null; sale = false;
    $('#toasts').innerHTML = '';
    sauver(); rendre();
  }

  function brancher() {
    for (const b of $$('.lien-aide')) b.addEventListener('click', ouvrirIntro);
    document.addEventListener('click', e => {
      const l = e.target.closest('.b-lecture');
      if (l) { lecture(!enMarche); return; }
      const v = e.target.closest('.vitesses button');
      if (v) { vitesse = +v.dataset.v; sauverOptions(); lecture(true); }
    });
    document.addEventListener('change', e => {
      if (!e.target.matches('.c-pause')) return;
      pauseAuto = e.target.checked; sauverOptions(); majControles();
    });
    document.addEventListener('keydown', e => {
      if (e.code !== 'Space' || e.target !== document.body || dialogueOuvert()) return;
      e.preventDefault(); lecture(!enMarche);
    });
    window.addEventListener('pagehide', sauver);
    $('#intro-actions').addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      if (act === 'nouvelle') nouvellePartie(nouvelleGraine());
      $('#d-intro').close(); sauver();
    });
    $('#fin-rejouer').addEventListener('click', () => { $('#d-fin').close(); history.replaceState(null, '', location.pathname + location.search); nouvellePartie(nouvelleGraine()); });
    $('#fin-meme').addEventListener('click', () => { $('#d-fin').close(); nouvellePartie(st.seed); });
    $('#fin-fermer').addEventListener('click', () => $('#d-fin').close());

    $('#p-politiques').addEventListener('click', e => {
      const b = e.target.closest('button[data-l]');
      if (!b || b.disabled) return;
      A.regler(etat, b.dataset.l, +b.dataset.n);
      sauver(); majVue();
      rendrePolitiques(); rendreEntete();
      $(`button[data-l="${b.dataset.l}"][data-n="${b.dataset.n}"]`)?.focus();
    });

    const reg = $('#p-regions');
    reg.addEventListener('click', e => {
      const m = e.target.closest('button[data-m]');
      if (m) { metrique = m.dataset.m; rendreRegions(); $(`button[data-m="${metrique}"]`)?.focus(); return; }
      const r = e.target.closest('[data-r]');
      if (r) { regionSel = r.dataset.r; rendreRegions(); $(`[data-r="${regionSel}"]`)?.focus(); }
    });
    reg.addEventListener('keydown', e => {
      const r = e.target.closest('[data-r]');
      if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); regionSel = r.dataset.r; rendreRegions(); $(`[data-r="${regionSel}"]`)?.focus(); }
    });

    const don = $('#donut');
    don.addEventListener('pointerover', e => { const z = e.target.closest('.zone'); if (z) { zoneVol = z.dataset.z; majDetail(zoneVol); } });
    don.addEventListener('pointerleave', () => { zoneVol = null; majDetail(zoneFixe); });
    don.addEventListener('focusin', e => { const z = e.target.closest('.zone'); if (z) { zoneVol = z.dataset.z; majDetail(zoneVol); } });
    don.addEventListener('focusout', () => { zoneVol = null; majDetail(zoneFixe); });
    don.addEventListener('click', e => {
      const z = e.target.closest('.zone');
      zoneFixe = z ? (zoneFixe === z.dataset.z ? null : z.dataset.z) : null;
      majDetail(zoneFixe);
    });
    don.addEventListener('keydown', e => {
      const z = e.target.closest('.zone');
      if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); zoneFixe = z.dataset.z; majDetail(zoneFixe); }
    });

    const ev = $('#p-evenements');
    ev.addEventListener('click', e => {
      const c = e.target.closest('button[data-cat]');
      if (!c) return;
      filtreCat = c.dataset.cat; rendreEvenements(); ev.querySelector(`button[data-cat="${filtreCat}"]`)?.focus();
    });
    ev.addEventListener('change', e => {
      if (e.target.id !== 'f-severe') return;
      severe = e.target.checked; rendreEvenements(); $('#f-severe')?.focus();
    });

    const tabs = $('.onglets');
    tabs.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) choisirOnglet(t.dataset.o); });
    tabs.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const l = $$('.onglets [role="tab"]'), i = l.findIndex(t => t.dataset.o === onglet);
      const n = l[(i + (e.key === 'ArrowRight' ? 1 : l.length - 1)) % l.length];
      choisirOnglet(n.dataset.o); n.focus();
    });
  }

  function init() {
    const sauve = charger(), graine = graineAdresse();
    chargerOptions();
    if (sauve && !sauve.fini && (!graine || graine === sauve.seed)) etat = sauve;
    else etat = A.nouvellePartie(graine || nouvelleGraine());
    construireHorloge(); brancher(); rendre(); ouvrirIntro();
    requestAnimationFrame(boucle);
  }
  init();
})();
