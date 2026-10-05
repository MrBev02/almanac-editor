import { describe, expect, it } from 'vitest';
import {
	blankOffering,
	copyOffering,
	defaultYear,
	offeringPath,
	shiftYears,
	suggestId,
	TODO,
	validId
} from './newOffering.ts';
import type { Offering } from './types.ts';

const source = (): Offering => ({
	id: '2030-y9-class1',
	year: 2030,
	year_group: 'Year 9',
	class_label: 'Class 1',
	colour: 'plum',
	mode: 'standard',
	subject: 'subjects/sorting',
	cohort: { size: 24, notes: 'Strong readers.' },
	units: [
		{
			unit: 'units/sorting_things',
			term: 'Term 4 2029 and Term 1 2030',
			start_date: '2029-10-14',
			duration_weeks: 6,
			notes: 'Ran short.',
			lessons: ['lessons/03_hats.json', 'lessons/01_socks.json']
		}
	],
	one_offs: [{ path: 'one_offs/day_one', term: 'Term 1', notes: 'Short version.' }],
	canvas: {
		course_id: '111',
		shared_from: '2030-y9-class2',
		workbooks: { '01_socks': '222' },
		targets: { cheat_sheet: { kind: 'file', id: '333', notes: 'One page.' } }
	},
	differentiation: { support: 'Seat near the front.' }
});

describe('copyOffering', () => {
	const copy = copyOffering(source(), {
		id: '2031-y9-class1',
		year: 2031,
		year_group: 'Year 9',
		class_label: 'Class 1'
	});

	it('keeps units, lesson order, mode, subject and colour', () => {
		expect(copy.units[0].unit).toBe('units/sorting_things');
		expect(copy.units[0].lessons).toEqual(['lessons/03_hats.json', 'lessons/01_socks.json']);
		expect(copy.units[0].duration_weeks).toBe(6);
		expect(copy.mode).toBe('standard');
		expect(copy.colour).toBe('plum');
	});

	it('moves years written into terms and drops dates, notes and the cohort', () => {
		expect(copy.units[0].term).toBe('Term 4 2030 and Term 1 2031');
		expect('start_date' in copy.units[0]).toBe(false);
		expect('notes' in copy.units[0]).toBe(false);
		expect(copy.one_offs).toEqual([{ path: 'one_offs/day_one', term: 'Term 1' }]);
		expect('cohort' in copy).toBe(false);
		expect('differentiation' in copy).toBe(false);
	});

	it('sets Canvas ids to TODO and empties the uploaded workbooks', () => {
		expect(copy.canvas).toEqual({
			course_id: TODO,
			workbooks: {},
			targets: { cheat_sheet: { kind: 'file', id: TODO, notes: 'One page.' } }
		});
	});

	it('keeps the file’s key order', () => {
		expect(Object.keys(copy)).toEqual([
			'id',
			'year',
			'year_group',
			'class_label',
			'colour',
			'mode',
			'subject',
			'units',
			'one_offs',
			'canvas'
		]);
	});

	it('leaves the source untouched', () => {
		const original = source();
		copyOffering(original, { id: '2031-x', year: 2031 });
		expect(original).toEqual(source());
	});
});

describe('blankOffering', () => {
	it('holds the name, subject and chosen units in schema order', () => {
		const blank = blankOffering(
			{ id: '2031-y7-a', year: 2031, year_group: 'Year 7', class_label: ' ' },
			'subjects/sorting',
			['units/a', 'units/b']
		);
		expect(blank).toEqual({
			id: '2031-y7-a',
			year: 2031,
			year_group: 'Year 7',
			subject: 'subjects/sorting',
			units: [{ unit: 'units/a' }, { unit: 'units/b' }]
		});
	});
});

describe('names', () => {
	it('suggests ids and file names the way the data repo writes them', () => {
		expect(suggestId(2027, 'Year 10', 'Class 1')).toBe('2027-y10-class1');
		expect(suggestId(2027, 'Year 10', 'Winter School')).toBe('2027-y10-winter-school');
		expect(offeringPath('2027-y10-winter-school')).toBe('offerings/2027_y10_winter_school.json');
		expect(validId('2027-y10-class1')).toBe(true);
		expect(validId('y10 class')).toBe(false);
	});

	it('shifts only four-digit years', () => {
		expect(shiftYears('Term 4 2025 and Term 1 2026', 1)).toBe('Term 4 2026 and Term 1 2027');
		expect(shiftYears('Term 2', 1)).toBe('Term 2');
	});
});

describe('defaultYear', () => {
	it('opens on this year, else the latest past year, else the earliest', () => {
		expect(defaultYear([2026, 2027], 2026)).toBe(2026);
		expect(defaultYear([2025, 2026], 2027)).toBe(2026);
		expect(defaultYear([2028, 2029], 2027)).toBe(2028);
		expect(defaultYear([], 2027)).toBe(null);
	});
});
