# Almanac Editor

A browser app for reading and editing lesson plans kept as JSON in a git repo
("lessons as code"). The repo is the database: every save is a commit, git is
the history and the undo, and the files stay in the format the repo's own
scripts write.

This repo holds app code only. It contains no units, lessons or offerings.
The app reads and writes a data repo, such as
[subject-almanac](https://github.com/MrBev02/subject-almanac), through the
GitHub API, with a token the teacher supplies. A private data repo stays
private.

## What it does

- Lists the data repo's units and classes (offerings). Each class wears a house
  colour through the app; fix one from the class's band on the home page, which
  writes an optional `colour` to the offering file.
- Jumps to any class, unit or lesson with `/` or `Ctrl+K`; `J`/`K` move between
  lessons and `E` edits.
- Shows one year's classes at a time (this year by default), with tabs for
  the others.
- Makes a new class: a copy of an existing one for a new year (units and
  lesson order kept; notes, cohort, dates and Canvas ids reset), or a blank
  one.
- Makes a new unit, in a subject the files have or a new one. An empty folder
  starts here.
- Writes a new lesson plan in a unit (`N` on the unit page): names its file
  after the title, numbered after the last plan in its folder, then opens it
  in the editor. Creating it writes the plan and adds it to the end of the
  unit's `lessons`. A class that lists its own lessons for the unit is told
  it won't get the new one.
- Offers made-up sample lessons to look around without a token.
- Shows a unit's lessons, either the whole index or in one class's order.
- Shows a lesson plan, and edits it in place:
  - rewords any prose field
  - adds, removes and reorders learning intentions, success criteria,
    evidence and feedback
  - edits section timings, with a running total against the lesson length
  - adds, removes and reorders run sheet sections
- Validates every save against the data repo's own `schemas/`, then commits it.
  If the file changed on GitHub since it was opened, the save is refused rather
  than overwriting the other change.

It never edits the derived `materials` field, curriculum link ids, coverage or
mode, or a resource's link, Canvas target or file. The data repo regenerates
`materials` itself in a GitHub Action after each push.

## Data repo layout it expects

```
subjects/**/unit.json             units, with `lessons` and `syllabus_registry`
subjects/**/lessons/**/*.json     lesson plans (with an optional paired .md)
offerings/*.json                  classes: which units, which order
schemas/*.schema.json             JSON Schema (draft 2020-12) for the above
```

## Where the lessons live

**A folder on your computer** (Chrome or Edge). Choose the folder that holds
`subjects/` and `offerings/`, or an empty folder to start afresh: make a unit,
write its first lesson, then make a class that takes it. Almanac saves straight into those files and
touches nothing else. If the folder is a git clone, commit when and how you
like; Almanac never does it for you. The browser remembers the folder, and may
ask you to allow access again on a later visit.

**A GitHub repo.** Almanac commits each save to the branch. Create a
fine-grained personal access token at
<https://github.com/settings/personal-access-tokens/new>:

- Repository access: only the data repo.
- Permissions: Contents, read and write. Nothing else.
- Expiration: 90 days.

The token is kept in the tab's `sessionStorage` and is gone when the tab
closes. "Remember on this device" keeps it in `localStorage` instead. Use that
only on your own computer.

The token can only reach the one repo it was scoped to. It is only ever sent
to `api.github.com`, and a Content-Security-Policy blocks the page from
connecting anywhere else. A later version will replace the pasted token with a
GitHub App sign-in, which keeps the token out of the browser entirely.

**Origin:** browser storage, and a folder's access, are shared by every
GitHub Pages site on the same account (`<owner>.github.io`). The app is served
from <https://almanac-editor.github.io/>, by an org that exists only for it.
Publish no other Pages site from the `almanac-editor` org.

## Development

Needs Node 22.17 or later.

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests, made-up fixtures only
npm run check        # svelte-check / TypeScript
npm run lint
```

Checks against a real data repo run only when one is named, and read a local
clone. No private data ever goes into this repo:

```sh
DATA_REPO=../subject-almanac npm test
```

They check that:

- every file the editor can write round-trips byte for byte through the save path
- every plan passes the repo's schemas
- lesson order matches the Python `scripts/offering_lessons.py`

## Deploying

`.github/workflows/deploy.yml` builds on every push to `main` and publishes to
<https://almanac-editor.github.io/>, the root of the org's Pages site. A fork
published as a project site needs `BASE_PATH: /<repo-name>` in the workflow;
a custom domain needs a `static/CNAME` file.
