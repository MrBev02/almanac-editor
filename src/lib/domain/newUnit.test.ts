import { describe, expect, it } from 'vitest';
import { dump } from './format.ts';
import { canOpen } from './layout.ts';
import { blankUnit, newSubjectDir, subjectDirs, unitDir } from './newUnit.ts';

describe('canOpen', () => {
	it('opens a folder that holds units or classes', () => {
		expect(canOpen(['subjects/a/units/b/unit.json', 'notes/x.txt'])).toBe(true);
		expect(canOpen(['offerings/2030_y9.json', 'notes/x.txt'])).toBe(true);
	});

	it('opens an empty folder, or one with only loose top-level files', () => {
		expect(canOpen([])).toBe(true);
		expect(canOpen(['README.md', 'LICENSE'])).toBe(true);
	});

	it('refuses a folder with other files in subfolders', () => {
		expect(canOpen(['README.md', 'photos/2024/a.jpg'])).toBe(false);
		expect(canOpen(['subjects/a/notes.md'])).toBe(false);
	});
});

describe('subjectDirs', () => {
	it('lists each subject once, course levels included', () => {
		expect(
			subjectDirs([
				'subjects/b/units/one',
				'subjects/a/units/one',
				'subjects/a/units/two',
				'subjects/c/hsc/units/one'
			])
		).toEqual(['subjects/a', 'subjects/b', 'subjects/c/hsc']);
	});
});

describe('new paths', () => {
	it('names a new subject and unit as the data repo does', () => {
		expect(newSubjectDir('Design & Technology')).toBe('subjects/design_technology');
		expect(newSubjectDir('?')).toBe('');
		expect(unitDir('subjects/design_technology', 'everyday_products')).toBe(
			'subjects/design_technology/units/everyday_products'
		);
	});
});

describe('blankUnit', () => {
	it('holds the required fields in schema order, with no plans yet', () => {
		expect(dump(blankUnit('Everyday products', 'Design and Technology', ''))).toBe(
			'{\n  "unit_title": "Everyday products",\n  "subject": "Design and Technology",\n  "description": "",\n  "syllabus_registry": [],\n  "lessons": []\n}\n'
		);
	});
});
