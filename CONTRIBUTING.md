# Contributing

Thanks for your interest in **L'arbre des sauces**! This is a small project, so
the workflow is light.

To change **content** (a sauce, a pairing, the dish vocabulary), edit
`data/sauces.json`; to change the **page itself** (layout, styles, behaviour),
edit `src/template.html`. `dist/index.html` is a generated build output - it isn't
committed to the repo (git-ignored, rebuilt from source by CI and Cloudflare),
so edit the source, not the generated page.

The app, its data, and the editor tool are in **French** (it's French classic
cuisine). These contributor docs are in English. Please keep user-facing strings
and sauce content in French.

## Prerequisites

- **Node.js** - that's it. There are **no npm dependencies** to install; the
  build uses only Node's standard library.

## Workflow

1. Make your change in `data/sauces.json` and/or `src/template.html`.
2. Rebuild the page (this also validates the data):

   ```sh
   node tools/build.js          # or: npm run build
   ```

   To validate without writing the page:

   ```sh
   node tools/build.js --check  # or: npm run check
   ```

3. Commit your **source** change (`data/sauces.json` and/or `src/template.html`).
   Don't commit `dist/` - it's a git-ignored build output.
4. Open a pull request. CI re-validates the data and rebuilds the page from
   source; once merged to `main`, Cloudflare builds and publishes it
   automatically.

## Validation rules

The build refuses to produce a page if the data is inconsistent. It checks:

- **Family consistency** - a sauce's `fam` must match its parent's, except at the
  deliberate roux branch points (`roux_blanc`, `roux_blond`, `roux_brun`). If you
  intentionally introduce a new branch point, add it to `FAM_BOUNDARIES` in
  `tools/build.js`.
- **Lineage integrity** - every id in a `children` array must be a real sauce,
  and no sauce may have two parents.
- **Derivation type** - every sauce that has a parent must carry a `deriv` field
  set to `composition`, `variation`, `assemblage`, or `base`; root mother sauces
  must not carry one.
- **Provenance** - every node must carry a `prov` field (roots included) set to
  `classique`, `moderne`, or `hors_escoffier`.
- **Vocabulary integrity** - every dish tag in `tagGroups` must be defined in
  `tagLabel` (and vice versa), and no tag may appear in two categories.
- **Pairing integrity** - every key in `accords` must be a real sauce, and every
  tag it references must exist in the vocabulary.

If `--check` fails, it prints exactly what's wrong and where.

## Editing pairings visually

Hand-editing the `accords` table is fiddly and easy to get wrong. The
**pairings editor** (`tools/accords-editor.html`) presents pairings as a
checkbox grid and exports an updated `data/sauces.json`. See the
[README](README.md#pairings-editor-toolsaccords-editorhtml) for how to use it.
After exporting, drop the file over `data/sauces.json` and run
`node tools/build.js` as usual.

## Adding a sauce

See [Adding a sauce](README.md#adding-a-sauce) in the README for the field-by-field
example.

## Style

Match the surrounding code. The project deliberately avoids dependencies and
build tooling beyond a single ~120-line Node script - please keep it that way
unless there's a strong reason to add complexity.