#!/usr/bin/env node
// =====================================================================
//  Calage du moteur d'Atterrir (Node, sans dépendance)
//  1. Valeurs de 2025 comparées aux sources (fourchettes de tolérance).
//  2. Trajectoire sans nouvelle politique (2050, 2075, 2100).
//  3. Issues de parties simulées selon plusieurs stratégies de politiques.
//  Usage : node outils/calage.js [nombre de graines, 40 par défaut]
// =====================================================================
'use strict';
const path = require('path');
const js = f => path.join(__dirname, '..', 'js', f);
const A = require(js('moteur.js'));
global.Atterrir = A;
for (const f of ['terre.js', 'alimentation.js', 'societe.js', 'donut.js', 'migrations.js']) require(js(f));

const N = +process.argv[2] || 40;
const pc = x => `${(100 * x).toFixed(1)} %`;
let echecs = 0;

// --- 1. Valeurs de départ -----------------------------------------------------------------------
const st0 = A.nouvellePartie(1);
const g0 = st0.g, pop0 = st0.regions.reduce((a, r) => a + r.pop, 0);
const monde = (st, f) => st.regions.reduce((a, r) => a + r.pop * f(r), 0) / st.regions.reduce((a, r) => a + r.pop, 0);
const m0 = A.mesures(st0);
const part = id => m0.parPlancher.find(p => p.id === id).part;
const CONTROLES = [
  ['CO₂ (ppm) — GCB 2025 : 422,8 en 2024, 425,7 prévu en 2025', g0.ppm, 421, 427],
  ['Forçage anthropique (W/m²) — bilan planétaire 2025 : 2,97', g0.forcage, 2.9, 3.05],
  ['Réchauffement (°C) — Forster et al. 2025 : 1,36 en 2024', g0.T, 1.33, 1.42],
  ['Ω aragonite — bilan planétaire 2025 : 2,84', g0.omega, 2.8, 2.88],
  ['Limites franchies — bilan planétaire 2025 : 7 sur 9', A.LIMITES.filter(l => l.ratio(g0) > 1).length, 7, 7],
  ['Population (milliards) — ONU WPP 2024 : 8,2 en 2024', pop0 / 1000, 8.0, 8.3],
  ['Espérance de vie mondiale — WPP 2024 : 73,3 ans', monde(st0, r => r.LE), 72.5, 74],
  ['Sous-nutrition — SOFI 2025 : 8,2 % en 2024', part('alim'), 0.075, 0.09],
  ['Sans eau ou assainissement sûrs — ODD 2025 : 27 % et 42 %', part('eau'), 0.31, 0.37],
  ['Sans électricité ou cuisson propre — SDG7 2025 : ~8 % et ~25 %', part('energie'), 0.14, 0.19],
  ['Hors ligne — ONU 2025 : 32 % en 2024', part('reseaux'), 0.29, 0.36],
  ['Bidonvilles — ONU-Habitat : ~1,1 milliard (~14 %)', part('logement'), 0.11, 0.16],
  ['Sous 6,85 $/jour — Banque mondiale : ~44 %', A.PLANCHERS.find(p => p.id === 'revenu') && monde(st0, r => r.pauvrete), 0.38, 0.47],
  ['Décès dus à la pollution de l’air (millions/an) — OMS : ~7', g0.mortsPollution, 6, 8.5],
];
console.log('== Valeurs de 2025');
for (const [nom, v, lo, hi] of CONTROLES) {
  const ok = v >= lo && v <= hi;
  if (!ok) echecs++;
  console.log(`${ok ? 'ok ' : 'KO '} ${nom} → ${Number(v).toFixed(3)} (attendu ${lo} à ${hi})`);
}
console.log(`   dépassement écologique ${pc(m0.depassement)} ; manque social ${pc(m0.manque)}`);
console.log('   ' + m0.parPlancher.map(p => `${p.id} ${pc(p.part)}`).join(' | '));
console.log('   ' + m0.parLimite.map(l => `${l.id} ${l.z.toFixed(2)}`).join(' | '));

// --- Jouer une partie ----------------------------------------------------------------------------
// strategie : niveau visé pour chaque levier (relevé d'un cran dès que possible)
function jouer(seed, strategie) {
  const st = A.nouvellePartie(seed);
  for (let k = 0; k < 100000 && !st.fini; k++) {
    for (const l of A.LEVIERS) { const vise = strategie(l.id); if (st.leviers[l.id] < vise) A.regler(st, l.id, st.leviers[l.id] + 1); }
    A.avancerTemps(st, 0.25);
  }
  return st;
}
const STRATEGIES = {
  'aucune politique': () => 0,
  'tout au niveau 1': () => 1,
  'tout au maximum possible': () => 3,
  'transition sociale et écologique': id => ({ bascarbone: 3, efficacite: 2, sobriete: 3, protection: 2, forets: 2, agro: 2, sante: 2, eau: 1, air: 1, solidarite: 2 }[id] || 0),
};

// --- 2. Trajectoire sans nouvelle politique ------------------------------------------------------
console.log('\n== Sans nouvelle politique (graine 1)');
const bau = jouer(1, STRATEGIES['aucune politique']);
for (const a of [2025, 2050, 2075, 2100]) {
  const h = bau.hist.find(x => x.a === a);
  if (h) console.log(`${a} : T ${h.T.toFixed(2)} °C | ${h.ppm.toFixed(0)} ppm | pop ${(h.pop / 1000).toFixed(2)} Md | espérance de vie ${h.LE.toFixed(1)} | dépassement ${pc(h.depasse)} | manque ${pc(h.manque)} | stabilité ${h.S.toFixed(0)}`);
}

// --- 3. Issues selon les stratégies --------------------------------------------------------------
console.log(`\n== Issues sur ${N} graines`);
for (const [nom, strat] of Object.entries(STRATEGIES)) {
  const issues = {}; let T = 0, dep = 0, man = 0, pop = 0, crises = 0;
  for (let s = 1; s <= N; s++) {
    const st = jouer(s, strat), b = st.bilan;
    issues[b.issue] = (issues[b.issue] || 0) + 1;
    T += b.T; dep += b.depassement; man += b.manque; crises += b.crisesTotales; pop += st.regions.reduce((a, r) => a + r.pop, 0);
  }
  console.log(`${nom.padEnd(34)} T ${(T / N).toFixed(2)} | dépassement ${pc(dep / N)} | manque ${pc(man / N)} | pop ${(pop / N / 1000).toFixed(2)} Md | crises ${(crises / N).toFixed(1)} | ${JSON.stringify(issues)}`);
}
console.log(echecs ? `\n${echecs} valeur(s) de départ hors fourchette.` : '\nToutes les valeurs de départ sont dans leur fourchette.');
process.exitCode = echecs ? 1 : 0;
