import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { byNumber, houseMap, termParts } from '../house.ts';
import { dump } from './format.ts';
import { withColour } from './offeringEdit.ts';
import type { Offering } from './types.ts';

const offering = (): Offering =>
	JSON.parse(readFileSync(new URL('./fixtures/offering.json', import.meta.url), 'utf-8'));

describe('withColour', () => {
	it('puts a new colour at its schema place', () => {
		const next = withColour(offering(), 'ruby');
		expect(next.colour).toBe('ruby');
		expect(Object.keys(next)).toEqual(['id', 'year', 'colour', 'subject', 'units']);
	});

	it('changes a colour in place', () => {
		const once = withColour({ ...offering(), year_group: 'Year 7' }, 'ruby');
		const twice = withColour(once, 'plum');
		expect(Object.keys(twice)).toEqual(Object.keys(once));
		expect(twice.colour).toBe('plum');
	});

	it('gives back the same bytes when the colour is cleared again', () => {
		const original = offering();
		expect(dump(withColour(withColour(original, 'cobalt'), null))).toBe(dump(original));
	});
});

describe('houseMap', () => {
	const o = (colour?: string) => ({ ...(colour ? { colour } : {}) });

	it('shares colours out by sorted path', () => {
		const map = houseMap([
			['offerings/b.json', o()],
			['offerings/a.json', o()]
		]);
		expect(map.get('offerings/a.json')).toBe('cobalt');
		expect(map.get('offerings/b.json')).toBe('emerald');
	});

	it('keeps a fixed colour and never gives it to another class', () => {
		const map = houseMap([
			['offerings/a.json', o()],
			['offerings/b.json', o('cobalt')]
		]);
		expect(map.get('offerings/b.json')).toBe('cobalt');
		expect(map.get('offerings/a.json')).toBe('emerald');
	});

	it('leaves other classes on their own colour when one is fixed', () => {
		const map = houseMap([
			['offerings/a.json', o()],
			['offerings/b.json', o()],
			['offerings/c.json', o('plum')],
			['offerings/d.json', o()]
		]);
		expect([...map.values()]).toEqual(['plum', 'cobalt', 'emerald', 'saffron']);
	});

	it('gives seven classes seven different colours', () => {
		const seven = Array.from(
			{ length: 7 },
			(_, i) => [`offerings/${i}.json`, o()] as [string, object]
		);
		expect(new Set(houseMap(seven).values()).size).toBe(7);
	});

	it('ignores a colour it does not know', () => {
		expect(houseMap([['offerings/a.json', o('teal')]]).get('offerings/a.json')).toBe('cobalt');
	});
});

describe('termParts', () => {
	it('shortens one term, two terms, and terms with years', () => {
		expect(termParts('Term 2')).toEqual(['T2']);
		expect(termParts('Term 1 and Term 3')).toEqual(['T1', 'T3']);
		expect(termParts('Term 4 2025 and Term 1 2026')).toEqual(['T4 2025', 'T1 2026']);
		expect(termParts('Standard week')).toEqual(['Standard week']);
		expect(termParts(undefined)).toEqual([]);
	});
});

describe('byNumber', () => {
	it('puts Year 8 before Year 10', () => {
		const paths = ['offerings/2026_y10_class1.json', 'offerings/2026_y8_tutor.json'];
		expect(paths.sort(byNumber)[0]).toBe('offerings/2026_y8_tutor.json');
	});
});
