/**
 * Checks against a local clone of a real data repo. Skipped unless DATA_REPO
 * names one, so no private data is ever needed in, or committed to, this repo:
 *
 *     DATA_REPO=../subject-almanac npm test
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join as joinFs, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dump } from './format.ts';
import { unitDirs } from './layout.ts';
import { fromDraft, toDraft } from './lessonEdit.ts';
import { withColour } from './offeringEdit.ts';
import { lessonsForOffering } from './offerings.ts';
import type { Lesson, Offering, Unit } from './types.ts';
import { Schemas } from './validate.ts';

const root = process.env.DATA_REPO;

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = joinFs(dir, name);
		return statSync(full).isDirectory() ? walk(full) : [full];
	});
}

describe.skipIf(!root)('real data repo', () => {
	// skipIf skips the tests, but vitest still runs this body to collect them.
	if (!root) return;
	const repo = root;
	const files = walk(joinFs(repo, 'subjects'))
		.concat(walk(joinFs(repo, 'offerings')))
		.filter((f) => f.endsWith('.json'))
		.map((f) => relative(repo, f));
	const read = (rel: string) => readFileSync(joinFs(repo, rel), 'utf-8');
	const lessons = files.filter((f) => /\/lessons\/.*\.json$/.test(f));
	const offerings = files.filter((f) => f.startsWith('offerings/'));
	const schemas = new Schemas(
		Object.fromEntries(
			readdirSync(joinFs(repo, 'schemas'))
				.filter((f) => f.endsWith('.schema.json'))
				.map((f) => [f, JSON.parse(read(`schemas/${f}`))])
		)
	);

	it('round-trips every file the editor can write through dump', () => {
		// outcome.json is hand-formatted, Python does not round-trip it either,
		// and the editor never writes it.
		const writable = files.filter((f) => !f.endsWith('/outcome.json'));
		const changed = writable.filter((f) => dump(JSON.parse(read(f))) !== read(f));
		expect(changed).toEqual([]);
	});

	it('saves every untouched lesson draft as the same bytes', () => {
		const changed = lessons.filter((f) => {
			const lesson: Lesson = JSON.parse(read(f));
			return dump(fromDraft(lesson, toDraft(lesson))) !== read(f);
		});
		expect(changed).toEqual([]);
	});

	it('finds every lesson valid against the repo schema', () => {
		const invalid = lessons
			.map((f) => [f, schemas.validate('lesson.schema.json', JSON.parse(read(f)))] as const)
			.filter(([, problems]) => problems.length > 0);
		expect(invalid).toEqual([]);
	});

	it('finds every offering valid against the repo schema', () => {
		const invalid = offerings
			.map((f) => [f, schemas.validate('offering.schema.json', JSON.parse(read(f)))] as const)
			.filter(([, problems]) => problems.length > 0);
		expect(invalid).toEqual([]);
	});

	it('sets and clears a colour on every offering, valid and byte for byte', () => {
		const problems = offerings.flatMap((f) => {
			const original: Offering = JSON.parse(read(f));
			const coloured = withColour(original, 'cobalt');
			const invalid = schemas.validate('offering.schema.json', coloured);
			const back = dump(withColour(coloured, original.colour ?? null));
			return [
				...(invalid.length ? [`${f}: invalid`] : []),
				...(back === read(f) ? [] : [`${f}: bytes`])
			];
		});
		expect(problems).toEqual([]);
	});

	it('orders lessons as scripts/offering_lessons.py does', () => {
		const python = `
import json, sys
from pathlib import Path
sys.path.insert(0, "scripts")
from offering_lessons import lessons_for_offering
out = {}
for o in sorted(Path("offerings").glob("*.json")):
    offering = json.loads(o.read_text(encoding="utf-8"))
    for entry in offering["units"]:
        unit_dir = Path(offering["subject"]) / entry["unit"]
        for term in (None, entry.get("term")):
            key = f"{o.as_posix()}|{unit_dir.as_posix()}|{term}"
            out[key] = lessons_for_offering(unit_dir, o, term)
print(json.dumps(out))
`;
		const expected: Record<string, string[]> = JSON.parse(
			execFileSync('python3', ['-c', python], { cwd: repo, encoding: 'utf-8' })
		);
		const units = new Set(unitDirs(files));
		const actual: Record<string, string[]> = {};
		for (const key of Object.keys(expected)) {
			const [path, unitDir, term] = key.split('|');
			expect(units.has(unitDir)).toBe(true);
			const unit: Unit = JSON.parse(read(`${unitDir}/unit.json`));
			const offering: Offering = JSON.parse(read(path));
			actual[key] = lessonsForOffering(unitDir, unit, offering, term === 'None' ? null : term);
		}
		expect(actual).toEqual(expected);
	});
});
