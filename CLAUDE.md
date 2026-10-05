# CLAUDE.md

A browser editor for the lesson plans in a data repo such as
`MrBev02/subject-almanac`. The idea is "lessons as code": edit the source once
and let every output (decks, workbooks, Riker's Word document) flow from it.
Before this app, the easiest place to fix wording was the generated output,
which is the wrong place.

## Shape

- **Two repos.** This one is public and holds app code only. The data repo is
  private and holds everything else. Never commit units, lessons, offerings or
  schemas from a data repo here, not even as test fixtures. Fixtures in
  `src/lib/domain/fixtures/` are made up.
- **The data repo is the database.** The app reads and writes it through the
  GitHub API. Each save is a commit, and git is the history and the undo.
- **Static SPA on GitHub Pages.** SvelteKit 3, Svelte 5 runes,
  `adapter-static`, `ssr = false`, and every route prerendered as a shell.
  Pages take their parameters from the query string (`/lesson?u=&l=&o=&t=`),
  the same as the data repo's `scripts/view.py`, which this app replaces.
- **Generic.** Owner, repo and branch come from Settings. Nothing hard-codes
  this teacher.

## Layout

```
src/lib/domain/   plain TypeScript, no Svelte, unit-tested
  repo.ts         the only code that talks to GitHub (trees, blobs, contents PUT)
  format.ts       dump(): the house JSON format
  lessonEdit.ts   toDraft / fromDraft: editing without disturbing the file
  offerings.ts    port of the data repo's scripts/offering_lessons.py
  offeringEdit.ts withColour(): the one field the editor writes on an offering
  layout.ts       where units, offerings, schemas and content files are
  validate.ts     the data repo's own schemas/*.schema.json, at run time
src/lib/data.ts   per-sign-in cache over Repo
src/lib/session.svelte.ts   token and target, or the sample repo
src/lib/house.ts  which house colour each class wears
src/lib/demo.ts   made-up sample repo behind a fake fetch, for trying the app
src/lib/components/, src/routes/   UI
```

## Rules that matter

- **Byte-exact saves.** The data repo writes JSON with Python's
  `json.dumps(indent=2, ensure_ascii=False) + "\n"`, and `dump()` matches it.
  Saving an untouched draft must give back identical bytes:
  - Keys keep the order the file had. A new key goes in at its schema position.
  - An optional field cleared to empty is removed, unless the file already held
    it empty.
  - Check against a real clone with `DATA_REPO=../subject-almanac npm test`.
    Run it after any change to `format.ts`, `lessonEdit.ts`, `offeringEdit.ts`
    or `offerings.ts`.
- **The editor never touches** a plan's `materials` (derived; the data repo's
  `materials.yml` Action regenerates it), curriculum link
  id/coverage/mode/framework, or a resource's url/canvas/file.
- **Validation uses the data repo's schemas**, fetched at run time, through
  `@cfworker/json-schema`. Not Ajv: Ajv compiles with `new Function`, which the
  CSP blocks. Don't add `'unsafe-eval'`.
- **Duplicated logic.** `offerings.ts` duplicates Python in the data repo. The
  `DATA_REPO` parity test compares them; keep it passing.

## Security

- **The token:**
  - A fine-grained PAT scoped to one repo, Contents read/write, 90-day expiry.
  - Kept in `sessionStorage` by default. "Remember on this device" moves it to
    `localStorage`.
  - Never logged, never put in a URL, only sent to `api.github.com`.
- **The CSP** (in `vite.config.ts`) limits `connect-src` to `api.github.com`.
  No third-party scripts at run time. Never `{@html}` on data.
- **Dependencies:** pinned exactly (`save-exact=true` in `.npmrc`). Runtime
  dependencies are Svelte and the validator only.
- **The origin:** every Pages site on an account shares `<owner>.github.io`
  storage. Until the app has its own domain, publish no other Pages site from
  the account.

## Decided but not built

These were agreed in planning, each to become an issue:

- offering editing: reorder, add and remove lessons per unit entry, plus term,
  weeks and notes
- new offering:
  - copy one: keep units and lesson order; reset dates, notes and cohort; set
    Canvas ids to `TODO`
  - or start blank
- drag-and-drop
- offline editing: an installable app with commits queued until back online
- a Pyodide test: can the data repo's Python run in the browser and replace the
  TypeScript ports?
- deck preview
- GitHub App sign-in through a Cloudflare Worker with an httpOnly cookie,
  replacing the pasted token (when a second teacher uses the app)
- a custom domain

The visual design ("House Colours") is recorded in `DESIGN.md`, and product
context in `PRODUCT.md`. Read both before changing the UI.

## Tooling

```sh
npm run dev | npm test | npm run check | npm run lint | npm run build
```

SvelteKit 3 imports local modules with explicit extensions:
`#lib/domain/repo.ts`, `#lib/session.svelte.ts`.

Prettier ignores `src/lib/domain/fixtures/`, because those files must stay in
the house JSON format byte for byte.
