import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dump } from './format.ts';
import { contentPath, offeringPaths, outcomePath, unitDirs } from './layout.ts';
import { lessonsForOffering, offeringEntries, OfferingMismatch } from './offerings.ts';
import { join, normalise, stem } from './paths.ts';
import { decodeBase64, encodeBase64 } from './repo.ts';
import type { Offering, Unit } from './types.ts';
import { Schemas, toPath } from './validate.ts';

const fixture = <T>(name: string): T =>
	JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf-8'));

describe('dump', () => {
	it('writes the house format', () => {
		expect(dump({ a: [], b: {}, c: ['≥'], d: 1 })).toBe(
			'{\n  "a": [],\n  "b": {},\n  "c": [\n    "≥"\n  ],\n  "d": 1\n}\n'
		);
	});

	it('refuses a float', () => {
		expect(() => dump({ weeks: 1.5 })).toThrow(/integers only/);
	});
});

describe('paths', () => {
	it('normalises and joins', () => {
		expect(join('subjects/x/', './units/y')).toBe('subjects/x/units/y');
		expect(normalise('a/b/../c')).toBe('a/c');
		expect(() => normalise('../a')).toThrow();
		expect(stem('lessons/2026_y9/01_intro.json')).toBe('01_intro');
	});
});

describe('layout', () => {
	const paths = [
		'subjects/ec/hsc/outcome.json',
		'subjects/ec/hsc/units/data/unit.json',
		'subjects/ct/units/ux/unit.json',
		'offerings/2030_y7_class1.json',
		'offerings/notes/readme.json',
		'README.md'
	];

	it('finds units and offerings', () => {
		expect(unitDirs(paths)).toEqual(['subjects/ct/units/ux', 'subjects/ec/hsc/units/data']);
		expect(offeringPaths(paths)).toEqual(['offerings/2030_y7_class1.json']);
	});

	it('walks up to the outcome set', () => {
		expect(outcomePath('subjects/ec/hsc/units/data', new Set(paths))).toBe(
			'subjects/ec/hsc/outcome.json'
		);
		expect(outcomePath('subjects/ct/units/ux', new Set(paths))).toBeNull();
	});

	it('pairs a plan with its content file', () => {
		expect(contentPath('lessons/01_a.json')).toBe('lessons/01_a.md');
	});
});

describe('lessonsForOffering', () => {
	const unit = fixture<Unit>('unit.json');
	const offering = fixture<Offering>('offering.json');
	const dir = 'subjects/sorting/units/sorting_things';

	it('merges entries in order and drops repeats', () => {
		expect(lessonsForOffering(dir, unit, offering)).toEqual([
			'lessons/03_hats.json',
			'lessons/01_socks.json',
			'lessons/02_shoes.json'
		]);
	});

	it('takes one term', () => {
		expect(lessonsForOffering(dir, unit, offering, 'Term 1')).toEqual([
			'lessons/03_hats.json',
			'lessons/01_socks.json'
		]);
		expect(lessonsForOffering(dir, unit, offering, 'Term 2')).toEqual(unit.lessons);
	});

	it('throws where the Python exits', () => {
		expect(() => lessonsForOffering('subjects/sorting/units/nope', unit, offering)).toThrow(
			OfferingMismatch
		);
		expect(() => lessonsForOffering(dir, unit, offering, 'Term 4')).toThrow(OfferingMismatch);
	});

	it('lists the entries taking a unit', () => {
		const found = offeringEntries(dir, [['offerings/x.json', offering]]);
		expect(found.map((f) => f.term)).toEqual(['Term 1', 'Term 2']);
	});
});

describe('base64', () => {
	it('round-trips UTF-8', () => {
		const text = 'Sections ≥ 5 — café\n';
		expect(decodeBase64(encodeBase64(text))).toBe(text);
	});
});

describe('Schemas', () => {
	const schemas = new Schemas({
		'lesson.schema.json': fixture('lesson.schema.json'),
		'offering.schema.json': fixture('offering.schema.json')
	});

	it('accepts a valid lesson', () => {
		const lesson = {
			title: 'A',
			duration_minutes: 5,
			sections: [{ section: 'x', duration_minutes: 5 }]
		};
		expect(schemas.validate('lesson.schema.json', lesson)).toEqual([]);
	});

	it('reports leaf problems with readable paths', () => {
		const problems = schemas.validate('lesson.schema.json', {
			title: '',
			duration_minutes: 5,
			sections: [{ section: 'x', duration_minutes: '5' }],
			extra: true
		});
		const paths = problems.map((p) => p.path);
		expect(paths).toContain('title');
		expect(paths).toContain('sections[0].duration_minutes');
		expect(paths).toContain('extra');
	});

	it('resolves a reference into another schema', () => {
		const problems = schemas.validate('offering.schema.json', {
			id: 'x',
			differentiation: { support: 1 }
		});
		expect(problems.map((p) => p.path)).toEqual(['differentiation.support']);
	});

	it('turns pointers into paths', () => {
		expect(toPath('#/sections/2/duration_minutes')).toBe('sections[2].duration_minutes');
		expect(toPath('#')).toBe('');
	});
});
