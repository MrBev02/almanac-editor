import { describe, expect, it } from 'vitest';
import { blankLesson } from './newLesson.ts';
import { blankOffering } from './newOffering.ts';
import { blankUnit } from './newUnit.ts';
import { isFresh, STARTER_SCHEMAS } from './starter.ts';
import { Schemas } from './validate.ts';

const schemas = new Schemas(STARTER_SCHEMAS);

describe('starter schemas', () => {
	it('accept what the app makes', () => {
		expect(schemas.validate('unit.schema.json', blankUnit('Bread', 'Food Tech', ''))).toEqual([]);
		const lesson = {
			...blankLesson('Why bread rises', 60),
			sections: [{ section: 'Yeast demo.', duration_minutes: 60, kind: 'instruction' }],
			learning_intentions: [],
			success_criteria: []
		};
		expect(schemas.validate('lesson.schema.json', lesson)).toEqual([]);
		const offering = blankOffering(
			{ id: '2030-y8', year: 2030, year_group: 'Year 8' },
			'subjects/food_tech',
			['units/bread']
		);
		expect(schemas.validate('offering.schema.json', offering)).toEqual([]);
	});

	it('refuse a plan with no title or an empty section', () => {
		const lesson = { ...blankLesson('', 60) };
		const problems = schemas.validate('lesson.schema.json', lesson).map((p) => p.path);
		expect(problems).toEqual([
			'title',
			'sections[0].section',
			'learning_intentions[0]',
			'success_criteria[0]'
		]);
	});

	it('refuse a class whose id does not start with its year', () => {
		const offering = blankOffering({ id: 'y8', year: 2030 }, 'subjects/food_tech', ['units/bread']);
		expect(schemas.validate('offering.schema.json', offering).map((p) => p.path)).toEqual(['id']);
	});
});

describe('isFresh', () => {
	it('is true until there is a unit, a class or a schema', () => {
		expect(isFresh([])).toBe(true);
		expect(isFresh(['README.md', 'notes.txt'])).toBe(true);
		expect(isFresh(['subjects/a/units/b/unit.json'])).toBe(false);
		expect(isFresh(['offerings/2030_y8.json'])).toBe(false);
		expect(isFresh(['schemas/lesson.schema.json'])).toBe(false);
	});
});
