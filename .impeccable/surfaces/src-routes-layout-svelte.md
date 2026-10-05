---
version: 1
slug: "src-routes-layout-svelte"
primary_target: "src/routes/+layout.svelte"
related_targets: ["src/routes","src/lib/components"]
---

## Scope

The whole Almanac Editor app shell and its four routes (home, unit, lesson
view/edit, settings). Mode: Operate.

## Audience and task

The teacher fixes wording mid-term, plans a unit ahead, checks the next lesson
before class and logs feedback after it. Faculty colleagues watch over their
shoulder. Success: any lesson in two clicks, the class context always visible,
and editing that feels safe.

## Direction contract

THESIS: Every class wears its house colour. The colour is the navigation:
the rail, the header and the lesson lanes all take the class's colour, so you
always know whose lesson you are in. It refuses the neutral grey sidebar
workspace with one blue accent.

OWN-WORLD: Chalk ground (#F3F4F0), ink (#15171C). Four house colours
(cobalt, emerald, ruby, saffron) as flat, unmodulated fields that own whole
regions, never chips. Lane hairlines. A heavy grotesk (Archivo, self-hosted)
with tabular numerals set huge for minutes and lesson numbers, labels tiny.
Square corners, 2px radius at most.
Raises, named for their donors: Guide Map, colour owns regions; Type
Specimen, scale contrast ranks; Centre-Rail Edition, syllabus and feedback
hang in a margin; Timetable Slide Rack, state is a mark in a fixed cell;
One-Up Feed, the next lesson is one key away.

STORY: Open the app and see your classes as house bands with their units.
Pick a class and the screen floods its colour. The unit lists lessons as
lanes with the run sheet drawn as minute bars. Open a lesson, read it, press
E to edit, Ctrl+S to commit, J/K for next and previous.

FIRST VIEWPORT: Left rail (240px): Almanac wordmark, then classes as solid
colour bands (year group plus class label large, offering id small), then
subjects. Main: a header band in the active class colour with the unit or
lesson title at display size. Home shows each class as a full-width house
band with its units in term order as tiles. The lesson shows its lane strip
(sections as proportional segments, talk/activity/stretch, finish line at
the lesson length) right under the title, run sheet left and margin right.

FORM: House Colours, position 4 on my ordered list, seed key b5801989.
Signature move: the run sheet drawn as a carnival lane strip with a finish
line at the lesson length.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

House colour per class is derived from a stable hash of the offering id
until offerings can declare one.
