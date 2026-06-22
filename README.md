# L'arbre des sauces

**L'arbre des sauces** ("the tree of sauces") is a single-page web app: a
self-contained HTML file (CSS and JavaScript included) that presents the great
French sauces as a family tree. You start from the **mother sauces** and
work down, branch by branch, to the *daughter sauces* - each with its story,
ingredients, and method.

> **Note** - the application itself is in **French**: you wouldn't discuss
> *sauce béarnaise* in English. These developer docs are in English so the
> project is approachable to contributors; the app, its data, and the editor
> stay French.

The page is **generated** by a small, dependency-free Node script that inlines
the data *and* the fonts into a single, self-contained `dist/index.html`. That
generated file has no runtime dependencies and works offline - but it is a
**build output**, produced from `data/sauces.json` + `src/template.html`, and is
**not committed** to the repo. See [Development](#development).

## Getting started

The easiest way to read the app is the hosted version: **<https://sauces.pages.dev>**.

To build and run it locally you need **Node.js** (no npm packages to install).
Generate the page from source, then open it:

```sh
node tools/build.js        # writes dist/index.html (the self-contained app)

# then open it, depending on your system:
open dist/index.html       # macOS
xdg-open dist/index.html   # Linux
start dist/index.html      # Windows
```

Once built, `dist/index.html` is **fully self-contained** - data and fonts are
inlined, so it makes no network requests and works offline, even straight from
`file://`. (It's a build output, not committed to the repo - see
[Development](#development).)

## The five mother sauces

Escoffier's classification sorts classic sauce-making into families, each
shown in its own colour in the app:

| Family | Mother sauce | Technical base |
| --- | --- | --- |
| Roux blanc | **Béchamel** | white roux + milk |
| Roux blond | **Velouté** (de veau, de volaille, de poisson) | blond roux + white stock (veal / poultry / fish) |
| Roux brun | **Espagnole** → demi-glace | brown roux + brown stock |
| Hollandaise | **Hollandaise** | warm egg-yolk + butter emulsion (no roux) |
| Tomate | **Sauce tomate** | flour singed over pork & mirepoix, then stock |
| Mayonnaise | **Mayonnaise** | cold egg-yolk + oil emulsion |

The app's canonical tomato sauce is Escoffier's own, bound with flour singed
over salt pork and mirepoix and cooked long in the oven; the modern, olive-oil,
flourless version is kept beside it as its *practical* layer. A sauce with no
Escoffier ancestry carries a `prov` of `moderne` - e.g. the modern cocktail
(Marie-Rose) sauce in the mayonnaise family (see
[Adding a sauce](#adding-a-sauce)).

From these mothers descend dozens of derived sauces - Mornay, Soubise, Nantua,
Suprême, Allemande, Béarnaise, Choron, Bordelaise, Chasseur, Robert, Madère,
Périgueux, Diable, Bigarade, Poivrade, Grand Veneur, Rémoulade, Tartare,
Gribiche, Andalouse… each tied to its lineage.

## Features

- **Filiation mode** - a collapsible tree showing parent → child kinship,
  colour-coded by family. Each card shows the description, ingredient list,
  step-by-step method, and "derived from / gives rise to" links to neighbouring
  sauces.
- **Pairings mode** (*Accords*) - the reverse lookup: pick a dish (beef, game,
  asparagus, poached fish, gratins…) and the app lists the sauces that go with
  it, grouped by family.
- **Keyboard navigation** - left/right arrows collapse/expand a branch, Enter or
  Space opens a card, Escape closes the mobile drawer.
- **Responsive** - on phones the tree becomes a full-screen drawer reached from a
  selection bar.
- **The generated page is self-contained and makes no external requests** -
  once built, `dist/index.html` is one file of plain HTML, CSS, and JavaScript, with
  data *and fonts* inlined; nothing fetched at runtime, no third party
  contacted, works fully offline. *(That's the built file. The copy served on
  Cloudflare Pages adds an analytics beacon injected at the edge - see
  [Deployment](#deployment-cloudflare-pages).)*

## Project structure

```
.
├── data/
│   └── sauces.json             # single source of truth: sauces, pairings, vocabulary
├── src/
│   └── template.html           # the page template (HTML + CSS + JS, minus data and fonts)
├── assets/
│   └── fonts/                  # self-hosted woff2 (SIL OFL) + manifest, inlined at build
├── tools/
│   ├── build.js                # dependency-free build: validate → inject data + fonts → write dist/index.html
│   └── accords-editor.html     # dev tool: visual pairings editor (edits sauces.json)
├── package.json                # npm scripts (no dependencies)
└── README.md

# dist/ is NOT here: it holds the build output of `node tools/build.js`
# (git-ignored, never committed - generated on demand and at deploy time).
```

The data lives in `data/sauces.json`, the **single source of truth**. The build
(`node tools/build.js`) validates it and injects it into `src/template.html` to
produce `dist/index.html`, the self-contained app. That file is a **build output** -
generated on demand, git-ignored, and never committed, so it can't drift from
its source.

- `nodes` - the dictionary of sauces (name, family, description, ingredients,
  steps, children). The `PARENT` map is derived automatically from `children`,
  so there is a single source of truth for lineage.
- `accords` - the dish/sauce pairings, kept as **pure data**: a pairing appears
  in a card only via the "Accords" section, never woven into the description
  text. `dishLabel` and `dishGroups` define the vocabulary of dishes.

The build also inlines the fonts: the `.woff2` files in `assets/fonts/` (Cormorant
Garamond and Spectral, both SIL Open Font License) are base64-encoded into the
page's `@font-face` rules, so the shipped page fetches nothing from a font CDN.
The committed `.woff2` are the source of truth - the build never downloads
anything, keeping it offline and deterministic.

## Development

Prerequisite: **Node.js** (no npm packages to install). The page is a build
output, so there's nothing to commit but your **source** - after any change to
`data/` or `src/`, rebuild to check it:

```sh
node tools/build.js          # (or: npm run build) validates the data and writes dist/index.html
node tools/build.js --check  # (or: npm run check) validates without writing
```

The build **refuses to produce** a page if the data is inconsistent: a sauce
whose family differs from its parent's (outside the intended roux branch
points), `children` pointing at a non-existent sauce, or a pairing on an unknown
sauce or dish. CI (`.github/workflows/ci.yml`) re-runs this validation and
rebuilds the page from source on every push and PR, so a broken change can't
reach `main`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor workflow.

### Adding a sauce

1. Add an entry to `nodes` (`data/sauces.json`) with a unique key:

   ```json
   "ma_sauce": {
     "nm": "Ma sauce", "fam": "brun", "prov": "classique",
     "deriv": "composition",
     "desc": "…",
     "ings": ["…", "…"],
     "steps": ["…", "…"],
     "children": []
   }
   ```

   `fam` must be one of `blanc`, `blond`, `brun`, `holl`, `tom`, `mayo`, `base`, and -
   unless it is a deliberate branch point - **identical to the parent's family**
   (the build checks this).

   `deriv` describes the *kind* of link to the parent and is **required** for
   every sauce that has a parent (omit it only on the root mother sauces): one of
   `composition` (start from the finished parent sauce and continue), `variation`
   (remake the base from scratch - the parent is not an ingredient), `assemblage`
   (prepare something else, then fold the parent in), or `base` (the technical
   roux layer). The build checks it is present and one of these values.

   `prov` records the recipe's editorial provenance and is **required on every
   node** (roots included): one of `classique` (the sauce belongs to Escoffier's
   *Guide culinaire*; a modern shortcut, if any, lives in the practical layer),
   `moderne` (a useful sauce with no Escoffier ancestry - e.g. the cocktail /
   Marie-Rose sauce), or `hors_escoffier` (outside the Escoffier system, for
   satellite families). The build checks it is present and one of these values.

   `role` is **optional** and holds an editorial *rank* shown in the detail
   badge - `Sauce mère`, `Grande sauce`, `Sauce de base`, the roux layer. Leave
   it off an ordinary child: the badge then shows its derivation type
   (Composition / Variation / Assemblage) from `deriv`, while the "Parenté"
   section names the parent - so the badge never just repeats it.

   `prac` is **optional** and holds a *practical execution* layer alongside the
   canonical one: a doable modern recipe, present only when it diverges from the
   historical recipe in `desc`/`ings`/`steps`. It is an object with the optional
   keys `desc` (string), `ings` (array), `steps` (array) and `note` (string, the
   honest bridge back to the canon), at least one of which must be set. The canon
   (`deriv`/`prov`/`desc`/`ings`/`steps`) stays untouched; `prac` does not change
   where the sauce sits in the tree. For now it is bounded to the brown branch -
   the laborious bases - where the jus de veau lié stands in as the practical
   demi-glace. The build validates its shape when present. In the detail panel a
   node with a full practical recipe shows a **Historique / Pratique** toggle
   (defaulting to the historical canon); the `note` renders as an understated
   "En pratique" side-note, and a note-only `prac` (e.g. espagnole) surfaces as
   that same side-note under the canonical recipe, with no toggle.
2. Attach it to its mother by adding its key to the parent's `children` array.
   Lineage and navigation links follow automatically.
3. (Optional) Declare its pairings in `accords` using existing dishes from the `dishLabel` vocabulary -
   or, more easily, with the [pairings editor](#pairings-editor-toolsaccords-editorhtml)
   described below, which edits pairings and the dish vocabulary visually.
4. Rebuild to check it: `node tools/build.js`, then commit your
   `data/sauces.json` change. (The page is a build output - don't commit it.)

### Deployment (Cloudflare Pages)

The site is hosted on **Cloudflare Pages** (<https://sauces.pages.dev>),
connected to this repository. Because the build output isn't committed, Cloudflare
**builds it from source** on every push. One-time setup in the Cloudflare
dashboard (**Workers & Pages → Create → Pages → Connect to Git**):

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `node tools/build.js` |
| Build output directory | `dist` |

The build command is **required** (it's what produces `dist/index.html`). On every
`push` to `main`, Cloudflare runs the build and serves the freshly generated
page - so the live site is always built from the current source, never a stale
copy. If the data is invalid the build fails and the previous deployment stays
live, so a broken change can't take the site down.

#### Analytics: the artifact stays dependency-free, the hosted page does not

The hosted site has **Cloudflare Web Analytics** enabled - a privacy-first,
cookieless beacon. Cloudflare injects its small script
(`static.cloudflareinsights.com`) into the HTML **at the edge, as it serves the
page**; it is **not** part of `dist/index.html`, the build, or this repository.

The practical line to keep clear:

- **The built file** - the `dist/index.html` that `node tools/build.js` produces,
  and any copy of *it* you self-host or open from `file://` - has **no
  dependencies, contacts nothing, and works fully offline**. Enabling analytics
  does not change a single byte of it. (A copy saved from the live Cloudflare
  site is *not* this file - it carries the edge-injected beacon.)
- **The page at the public Cloudflare URL** makes **one external request** (the
  analytics beacon), because Cloudflare adds it when serving.

To make the hosted page contact-free as well, disable Web Analytics in the
Pages dashboard - the artifact is unaffected either way.

## Developer tools

### Pairings editor (`tools/accords-editor.html`)

Reworking the `accords` table by hand - arrays of opaque identifiers
(`"villeroi": ["ris_de_veau","volaille","legumes"]`) - is tedious and quietly
error-prone (a typo in a dish id silently drops the pairing). The editor solves this
by presenting pairings as a **sauces × dishes grid** of checkboxes.

It is a **development tool only**: it is not shipped with the app, nor linked
from it. It duplicates no data - it reads `data/sauces.json` as the **single
source of truth** (sauces, dish vocabulary, and the current `accords` table), so
the grid always reflects the real state of the data.

**Usage:**

1. Serve the folder, then open the editor - the data loads automatically:

   ```sh
   python3 -m http.server
   # http://localhost:8000/tools/accords-editor.html
   ```

   (Opened directly over `file://`, auto-load is blocked by the browser:
   drag-and-drop `data/sauces.json` into the tool, or pick it with the file
   chooser.)
2. Check / uncheck boxes to add or remove pairings. Rows are grouped by family,
   columns by dish category; a stats banner flags dishes that no sauce
   accompanies. Headers (sauces, categories, dishes) stay frozen while the grid
   scrolls.
3. To rework the **dish vocabulary** itself, open **Gérer les plats &
   catégories**: add, rename, delete, move, and reorder dishes (columns) and
   categories. A new dish's internal id is derived automatically from its name,
   so renaming a label never touches existing pairings. Deleting a dish also
   removes it from all pairings (with confirmation).
4. Take the result:
   - **Télécharger sauces.json** - saves the updated file, to drop over
     `data/sauces.json`;
   - **Copier le JSON** - copies the same content to paste manually.

   Then regenerate the page: `node tools/build.js`.

The exported file is **deterministically sorted** (sauces by family then name,
dishes in vocabulary order) for clean diffs. Only `dishLabel`, `dishGroups`, and
`accords` are touched - `nodes` are copied as-is.

## Credits

Classification after Auguste Escoffier, *Le Guide culinaire* (1903).

## License

[MIT](LICENSE).