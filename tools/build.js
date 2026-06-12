#!/usr/bin/env node
/* ============================================================
   build.js - generates index.html from src/template.html by
   injecting data/sauces.json into it.

   DEVELOPMENT tool, with no dependencies (Node only). The
   shipped page stays a self-contained HTML file: the data is
   *inlined* into the produced file, nothing is loaded at
   runtime.

   Usage:
     node tools/build.js          build the page
     node tools/build.js --check  validate the data without writing
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
/* Edges where the family deliberately changes: the neutral roux
   (base) branches into three families. Any other parent/child
   divergence is an inconsistency. */
const FAM_BOUNDARIES = new Set(['roux_blanc', 'roux_blond', 'roux_brun']);

/* Filiation edge type, carried by every node that has a parent.
   composition: start from the parent sauce and continue.
   variation  : remake the base from scratch (the parent is not an ingredient).
   assemblage : prepare something else, then fold the parent in.
   base       : the technical roux layer (specialization / roux made inline). */
const DERIV_TYPES = new Set(['composition', 'variation', 'assemblage', 'base']);

/* ------------------------------------------------------------
   Validation: the data must be consistent before being shipped.
   Returns the list of errors (empty = all good).
   ------------------------------------------------------------ */
function validate(data) {
  const errors = [];
  const { nodes, tagLabel, tagGroups, accords } = data;

  if (!nodes || !tagLabel || !tagGroups || !accords) {
    errors.push('Missing keys: expected nodes, tagLabel, tagGroups, accords.');
    return errors;
  }

  // parent map derived from children (single source of lineage)
  const parent = {};
  for (const id of Object.keys(nodes)) {
    for (const child of nodes[id].children || []) {
      if (!nodes[child]) errors.push(`children: ${id} references a non-existent node "${child}".`);
      if (parent[child]) errors.push(`children: "${child}" has two parents (${parent[child]} and ${id}).`);
      parent[child] = id;
    }
  }

  // each node: known family + consistency with the parent
  for (const id of Object.keys(nodes)) {
    const fam = nodes[id].fam;
    if (!FAMILIES.has(fam)) {
      errors.push(`fam: "${id}" has an unknown family "${fam}" (expected: ${[...FAMILIES].join(', ')}).`);
    }
    const p = parent[id];
    if (p && nodes[p].fam !== fam && !FAM_BOUNDARIES.has(id)) {
      errors.push(`fam: "${id}" (${fam}) differs from its parent ${p} (${nodes[p].fam}). ` +
        `If intended, add it to FAM_BOUNDARIES in tools/build.js.`);
    }

    // deriv: edge type, required on every node that has a parent, absent on roots
    const deriv = nodes[id].deriv;
    if (p) {
      if (deriv === undefined) {
        errors.push(`deriv: "${id}" has no edge type (expected: ${[...DERIV_TYPES].join(', ')}).`);
      } else if (!DERIV_TYPES.has(deriv)) {
        errors.push(`deriv: "${id}" has an unknown edge type "${deriv}" (expected: ${[...DERIV_TYPES].join(', ')}).`);
      }
    } else if (deriv !== undefined) {
      errors.push(`deriv: "${id}" is a root (no parent) but carries a deriv "${deriv}"; remove it.`);
    }
  }

  // vocabulary: tagGroups only references defined tags, and vice versa
  const groupedTags = new Set();
  for (const g of tagGroups) {
    for (const t of g.tags) {
      if (!tagLabel[t]) errors.push(`tagGroups: category "${g.cat}" references an unknown dish "${t}".`);
      if (groupedTags.has(t)) errors.push(`tagGroups: dish "${t}" appears in two categories.`);
      groupedTags.add(t);
    }
  }
  for (const t of Object.keys(tagLabel)) {
    if (!groupedTags.has(t)) errors.push(`tagLabel: dish "${t}" is not placed in any tagGroups category.`);
  }

  // accords: keys = real sauces; values = vocabulary dishes
  for (const id of Object.keys(accords)) {
    if (!nodes[id]) errors.push(`accords: "${id}" is not a sauce in nodes.`);
    for (const t of accords[id]) {
      if (!tagLabel[t]) errors.push(`accords: "${id}" uses an unknown dish "${t}".`);
    }
  }

  return errors;
}

/* ------------------------------------------------------------
   Injection: places the JSON into <script id="sauces-data">.
   We escape "<" so a data value containing "</script>" can't
   break the script.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   Fonts: checks that the manifest and each woff2 file exist.
   Returns the list of errors (empty = all good).
   ------------------------------------------------------------ */
function validateFonts() {
  const errors = [];
  if (!fs.existsSync(FONTS_MANIFEST)) {
    errors.push('Fonts manifest not found: assets/fonts/fonts.json.');
    return errors;
  }
  const manifest = JSON.parse(fs.readFileSync(FONTS_MANIFEST, 'utf8'));
  for (const f of manifest) {
    if (!fs.existsSync(path.join(FONTS_DIR, f.file)))
      errors.push(`Missing font: assets/fonts/${f.file} (referenced by the manifest).`);
  }
  return errors;
}

/* Builds the @font-face rules with the woff2 files inlined as base64.
   No external request: the font travels inside the HTML. */
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
    throw new Error('Injection point not found in src/template.html (<script id="sauces-data">).');
  }
  const fontsRe = /(<style id="sauces-fonts">)[\s\S]*?(<\/style>)/;
  if (!fontsRe.test(template)) {
    throw new Error('Injection point not found in src/template.html (<style id="sauces-fonts">).');
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
    console.error(`✗ Invalid data (${errors.length}):`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  const faceCount = JSON.parse(fs.readFileSync(FONTS_MANIFEST, 'utf8')).length;
  console.log('✓ Valid data (' + Object.keys(data.nodes).length + ' sauces, ' +
    Object.keys(data.accords).length + ' pairings, ' + Object.keys(data.tagLabel).length + ' dishes, ' +
    faceCount + ' fonts).');

  if (checkOnly) return;

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  fs.writeFileSync(OUTPUT_PATH, render(template, data));
  console.log('✓ Wrote ' + path.relative(ROOT, OUTPUT_PATH) + '.');
}

main();
