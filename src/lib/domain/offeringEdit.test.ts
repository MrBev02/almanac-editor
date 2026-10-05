import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { houseMap } from '../house.ts';
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

	it('ignores a colour it does not know', () => {
		expect(houseMap([['offerings/a.json', o('teal')]]).get('offerings/a.json')).toBe('cobalt');
	});
});
