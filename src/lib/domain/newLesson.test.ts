import { describe, expect, it } from 'vitest';
import { dump } from './format.ts';
import {
	blankLesson,
	lessonFolders,
	lessonFile,
	lessonSlug,
	nextNumber,
	ownLists,
	usualLength,
	validSlug,
	withLesson
} from './newLesson.ts';
import type { Lesson, Offering, Unit } from './types.ts';

const UNIT = 'subjects/sorting/units/sorting_things';

const unit = (lessons?: string[]): Unit => ({
	unit_title: 'Sorting things',
	description: 'Sorting by one attribute.',
	syllabus_registry: [],
	...(lessons ? { lessons } : {})
});

describe('lessonSlug', () => {
	it('names a plan as the data repo does', () => {
		expect(lessonSlug('What is data analysis?')).toBe('what_is_data_analysis');
		expect(lessonSlug("What's a “byte”?")).toBe('whats_a_byte');
		expect(lessonSlug('Café crème, 2nd go')).toBe('cafe_creme_2nd_go');
	});

	it('stops at a word boundary when the title is long', () => {
		const slug = lessonSlug('one two three four five six seven eight nine ten eleven twelve');
		expect(slug.length).toBeLessThanOrEqual(48);
		expect(slug.endsWith('_')).toBe(false);
		expect(slug).toBe('one_two_three_four_five_six_seven_eight_nine_ten');
	});

	it('gives nothing for a title with no letters or digits', () => {
		expect(lessonSlug('?!')).toBe('');
		expect(validSlug('')).toBe(false);
	});

	it('accepts only lowercase words joined by single underscores', () => {
		expect(validSlug('sorting_hats_2')).toBe(true);
		expect(validSlug('Sorting')).toBe(false);
		expect(validSlug('sorting__hats')).toBe(false);
		expect(validSlug('sorting-hats')).toBe(false);
	});
});

describe('lessonFolders', () => {
	it('lists the folders the index uses, in index order', () => {
		const versions = unit([
			'lessons/2026_y9/01_a.json',
			'lessons/2026_y10/01_a.json',
			'lessons/2026_y9/02_b.json'
		]);
		expect(lessonFolders(versions)).toEqual(['lessons/2026_y9', 'lessons/2026_y10']);
	});

	it('defaults to lessons/ for a unit with no plans yet', () => {
		expect(lessonFolders(unit())).toEqual(['lessons']);
		expect(lessonFolders(unit([]))).toEqual(['lessons']);
	});
});

describe('nextNumber', () => {
	it('is one more than the highest number in the folder', () => {
		const u = unit(['lessons/01_socks.json', 'lessons/03_hats.json']);
		expect(nextNumber(UNIT, u, 'lessons', [])).toBe('04');
	});

	it('counts files the index does not list', () => {
		const u = unit(['lessons/01_socks.json']);
		const paths = [
			`${UNIT}/lessons/01_socks.json`,
			`${UNIT}/lessons/07_spare.json`,
			`${UNIT}/lessons/07_spare.md`
		];
		expect(nextNumber(UNIT, u, 'lessons', paths)).toBe('08');
	});

	it('counts only the chosen folder, not its neighbours or subfolders', () => {
		const u = unit(['lessons/2026_y9/12_a.json', 'lessons/2026_y10/03_a.json']);
		const paths = [`${UNIT}/lessons/2026_y10/old/40_x.json`, `${UNIT}/lessons/2026_y9/12_a.json`];
		expect(nextNumber(UNIT, u, 'lessons/2026_y10', paths)).toBe('04');
	});

	it('keeps a wider width when the folder uses one', () => {
		expect(nextNumber(UNIT, unit(['lessons/009_a.json']), 'lessons', [])).toBe('010');
	});

	it('starts at 01', () => {
		expect(nextNumber(UNIT, unit(), 'lessons', [])).toBe('01');
	});
});

describe('lessonFile', () => {
	it('joins folder, number and slug', () => {
		expect(lessonFile('lessons/2026_y9', '07', 'sorting_hats')).toBe(
			'lessons/2026_y9/07_sorting_hats.json'
		);
	});
});

describe('blankLesson', () => {
	it('holds the required fields in schema order, with one of each list to fill', () => {
		const lesson = blankLesson('Sorting hats', 50);
		expect(Object.keys(lesson)).toEqual([
			'title',
			'description',
			'duration_minutes',
			'sections',
			'learning_intentions',
			'success_criteria',
			'curriculum_links'
		]);
		expect(lesson.sections).toEqual([{ section: '', duration_minutes: 50 }]);
	});
});

describe('usualLength', () => {
	it('is the length most plans have', () => {
		const at = (m: number) => ({ duration_minutes: m }) as Lesson;
		expect(usualLength([at(50), at(60), at(50), null])).toBe(50);
		expect(usualLength([])).toBe(60);
	});
});

describe('withLesson', () => {
	it('adds the plan at the end of a single-folder index', () => {
		const next = withLesson(unit(['lessons/01_socks.json']), 'lessons/02_hats.json');
		expect(next.lessons).toEqual(['lessons/01_socks.json', 'lessons/02_hats.json']);
	});

	it('adds the plan after the last one in its own folder', () => {
		const u = unit([
			'lessons/2026_y9/01_a.json',
			'lessons/2026_y9/02_b.json',
			'lessons/2026_y10/01_a.json'
		]);
		expect(withLesson(u, 'lessons/2026_y9/03_c.json').lessons).toEqual([
			'lessons/2026_y9/01_a.json',
			'lessons/2026_y9/02_b.json',
			'lessons/2026_y9/03_c.json',
			'lessons/2026_y10/01_a.json'
		]);
	});

	it('changes only the lessons line of the file', () => {
		const u = unit(['lessons/01_socks.json']);
		const before = dump(u).split('\n');
		const after = dump(withLesson(u, 'lessons/02_hats.json')).split('\n');
		expect(after.filter((line) => !before.includes(line))).toEqual([
			'    "lessons/01_socks.json",',
			'    "lessons/02_hats.json"'
		]);
		expect(after.length).toBe(before.length + 1);
	});

	it('adds lessons at its schema place in a unit without one', () => {
		const u: Unit = { unit_title: 'T', syllabus_registry: [], description: 'D', extra: true };
		expect(Object.keys(withLesson(u, 'lessons/01_a.json'))).toEqual([
			'unit_title',
			'syllabus_registry',
			'description',
			'lessons',
			'extra'
		]);
	});

	it('leaves a unit that already lists the plan alone', () => {
		const u = unit(['lessons/01_socks.json']);
		expect(withLesson(u, 'lessons/01_socks.json')).toBe(u);
	});
});

describe('ownLists', () => {
	it('finds the classes whose entry for the unit lists its own lessons', () => {
		const offering = (id: string, lessons?: string[]): Offering => ({
			id,
			year: 2030,
			subject: 'subjects/sorting',
			units: [
				{ unit: 'units/sorting_things', term: 'Term 1', ...(lessons ? { lessons } : {}) },
				{ unit: 'units/other', lessons: ['lessons/01_x.json'] }
			]
		});
		const found = ownLists(UNIT, [
			['offerings/a.json', offering('a')],
			['offerings/b.json', offering('b', ['lessons/01_socks.json'])]
		]);
		expect(found.map((f) => [f.path, f.term])).toEqual([['offerings/b.json', 'Term 1']]);
	});
});
