#!/usr/bin/env node
/* ============================================================
   build.js — génère index.html à partir de
   src/template.html en y injectant data/sauces.json.

   Outil de DÉVELOPPEMENT, sans aucune dépendance (Node seul).
   La page livrée reste un fichier HTML autonome : les données
   sont *inlinées* dans le fichier produit, rien n'est chargé à
   l'exécution.

   Usage :
     node tools/build.js          construit la page
     node tools/build.js --check  valide les données sans écrire
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'sauces.json');
const TEMPLATE_PATH = path.join(ROOT, 'src', 'template.html');
const OUTPUT_PATH = path.join(ROOT, 'index.html');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');
const FONTS_MANIFEST = path.join(FONTS_DIR, 'fonts.json');

const FAMILIES = new Set(['blanc', 'blond', 'brun', 'holl', 'tom', 'base']);
/* Arêtes où la famille change volontairement : le roux neutre (base)
   se ramifie en trois familles. Toute autre divergence parent/enfant
   est une incohérence. */
const FAM_BOUNDARIES = new Set(['roux_blanc', 'roux_blond', 'roux_brun']);

/* ------------------------------------------------------------
   Validation : la donnée doit être cohérente avant d'être livrée.
   Renvoie la liste des erreurs (vide = tout va bien).
   ------------------------------------------------------------ */
function validate(data) {
  const errors = [];
  const { nodes, tagLabel, tagGroups, accords } = data;

  if (!nodes || !tagLabel || !tagGroups || !accords) {
    errors.push('Clés manquantes : attendu nodes, tagLabel, tagGroups, accords.');
    return errors;
  }

  // carte des parents dérivée de children (source unique de filiation)
  const parent = {};
  for (const id of Object.keys(nodes)) {
    for (const child of nodes[id].children || []) {
      if (!nodes[child]) errors.push(`children: ${id} référence un nœud inexistant « ${child} ».`);
      if (parent[child]) errors.push(`children: « ${child} » a deux parents (${parent[child]} et ${id}).`);
      parent[child] = id;
    }
  }

  // chaque nœud : famille connue + cohérence avec le parent
  for (const id of Object.keys(nodes)) {
    const fam = nodes[id].fam;
    if (!FAMILIES.has(fam)) {
      errors.push(`fam: « ${id} » a une famille inconnue « ${fam} » (attendu : ${[...FAMILIES].join(', ')}).`);
    }
    const p = parent[id];
    if (p && nodes[p].fam !== fam && !FAM_BOUNDARIES.has(id)) {
      errors.push(`fam: « ${id} » (${fam}) diffère de son parent ${p} (${nodes[p].fam}). ` +
        `Si c'est voulu, ajoutez-le à FAM_BOUNDARIES dans tools/build.js.`);
    }
  }

  // vocabulaire : tagGroups ne référence que des tags définis, et réciproquement
  const groupedTags = new Set();
  for (const g of tagGroups) {
    for (const t of g.tags) {
      if (!tagLabel[t]) errors.push(`tagGroups: catégorie « ${g.cat} » référence un plat inconnu « ${t} ».`);
      if (groupedTags.has(t)) errors.push(`tagGroups: le plat « ${t} » apparaît dans deux catégories.`);
      groupedTags.add(t);
    }
  }
  for (const t of Object.keys(tagLabel)) {
    if (!groupedTags.has(t)) errors.push(`tagLabel: le plat « ${t} » n'est rangé dans aucune catégorie de tagGroups.`);
  }

  // accords : clés = sauces réelles ; valeurs = plats du vocabulaire
  for (const id of Object.keys(accords)) {
    if (!nodes[id]) errors.push(`accords: « ${id} » n'est pas une sauce de nodes.`);
    for (const t of accords[id]) {
      if (!tagLabel[t]) errors.push(`accords: « ${id} » utilise un plat inconnu « ${t} ».`);
    }
  }

  return errors;
}

/* ------------------------------------------------------------
   Injection : place le JSON dans le <script id="sauces-data">.
   On échappe « < » pour ne pas casser le script si une donnée
   contenait « </script> ».
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   Polices : vérifie que le manifeste et chaque fichier woff2
   existent. Renvoie la liste des erreurs (vide = tout va bien).
   ------------------------------------------------------------ */
function validateFonts() {
  const errors = [];
  if (!fs.existsSync(FONTS_MANIFEST)) {
    errors.push('Manifeste de polices introuvable : assets/fonts/fonts.json.');
    return errors;
  }
  const manifest = JSON.parse(fs.readFileSync(FONTS_MANIFEST, 'utf8'));
  for (const f of manifest) {
    if (!fs.existsSync(path.join(FONTS_DIR, f.file)))
      errors.push(`Police manquante : assets/fonts/${f.file} (référencée par le manifeste).`);
  }
  return errors;
}

/* Construit les règles @font-face avec les woff2 inlinés en base64.
   Aucune requête externe : la police voyage dans le HTML. */
function buildFontFaces() {
  const manifest = JSON.parse(fs.readFileSync(FONTS_MANIFEST, 'utf8'));
  return manifest.map(f => {
    const b64 = fs.readFileSync(path.join(FONTS_DIR, f.file)).toString('base64');
    return `@font-face{font-family:'${f.family}';font-style:${f.style};font-weight:${f.weight};` +
      `font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');` +
      `unicode-range:${f.unicodeRange}}`;
  }).join('\n');
}

function render(template, data) {
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  const dataRe = /(<script id="sauces-data" type="application\/json">)[\s\S]*?(<\/script>)/;
  if (!dataRe.test(template)) {
    throw new Error('Point d\'injection introuvable dans src/template.html (<script id="sauces-data">).');
  }
  const fontsRe = /(<style id="sauces-fonts">)[\s\S]*?(<\/style>)/;
  if (!fontsRe.test(template)) {
    throw new Error('Point d\'injection introuvable dans src/template.html (<style id="sauces-fonts">).');
  }
  return template
    .replace(dataRe, `$1\n${json}\n$2`)
    .replace(fontsRe, `$1\n${buildFontFaces()}\n$2`);
}

function main() {
  const checkOnly = process.argv.includes('--check');

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const errors = [...validate(data), ...validateFonts()];
  if (errors.length) {
    console.error(`✗ Données invalides (${errors.length}) :`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  const faceCount = JSON.parse(fs.readFileSync(FONTS_MANIFEST, 'utf8')).length;
  console.log('✓ Données valides (' + Object.keys(data.nodes).length + ' sauces, ' +
    Object.keys(data.accords).length + ' accords, ' + Object.keys(data.tagLabel).length + ' plats, ' +
    faceCount + ' polices).');

  if (checkOnly) return;

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  fs.writeFileSync(OUTPUT_PATH, render(template, data));
  console.log('✓ Écrit ' + path.relative(ROOT, OUTPUT_PATH) + '.');
}

main();