/**
 * Making a new lesson plan in a unit: where its file goes, what it starts
 * as, and how the unit's index takes it.
 *
 * - A plan is `<folder>/<NN>_<slug>.json`, where the folder is one the unit
 *   already keeps plans in (`lessons`, or a version folder such as
 *   `lessons/2026_y9`) and NN is one more than the highest number in that
 *   folder, counting files the index does not list. Existing files are never
 *   renumbered: offerings and delivery records refer to them by path.
 * - The plan is added to the unit's `lessons` after the last one in the same
 *   folder, so a unit with versions stays grouped by version. An offering
 *   that lists its own lessons for the unit does not take the new one.
 */

import { ordered } from './lessonEdit.ts';
import { entryTakes } from './offerings.ts';
import { dirname, join, stem } from './paths.ts';
import type { Lesson, Offering, Unit } from './types.ts';

/** Schema order of a unit's keys, for placing `lessons` in a unit that has none. */
export const UNIT_ORDER = [
	'unit_title',
	'subject',
	'focus_area',
	'description',
	'overview',
	'indicative_hours',
	'overarching_questions',
	'applicable_outcomes',
	'differentiation',
	'syllabus_registry',
	'assessments',
	'lessons'
];

export const DEFAULT_FOLDER = 'lessons';

/** `What's a "byte"?` -> `whats_a_byte`, as the data repo names its plans. */
export function lessonSlug(title: string, max = 48): string {
	const words = title
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.split(/[^a-z0-9]+/)
		.filter(Boolean);
	let slug = '';
	for (const word of words) {
		const next = slug ? `${slug}_${word}` : word;
		if (next.length > max && slug) break;
		slug = next;
	}
	return slug.slice(0, max);
}

/** Lowercase letters and digits joined by single underscores. */
export function validSlug(slug: string): boolean {
	return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(slug);
}

/** The folders, relative to the unit, that the unit keeps plans in, in index order. */
export function lessonFolders(unit: Unit): string[] {
	const folders: string[] = [];
	for (const ref of unit.lessons ?? []) {
		const folder = dirname(ref);
		if (folder && !folders.includes(folder)) folders.push(folder);
	}
	return folders.length ? folders : [DEFAULT_FOLDER];
}

const NUMBERED = /^(\d+)_/;

/**
 * The next plan number in `folder`, padded to the width the folder uses (two
 * digits by default). `paths` is every file in the store, so a plan the index
 * does not list still counts.
 */
export function nextNumber(
	unitDir: string,
	unit: Unit,
	folder: string,
	paths: Iterable<string>
): string {
	const inFolder = join(unitDir, folder) + '/';
	const stems: string[] = [];
	for (const ref of unit.lessons ?? []) {
		if (dirname(ref) === folder) stems.push(stem(ref));
	}
	for (const path of paths) {
		if (
			path.startsWith(inFolder) &&
			path.endsWith('.json') &&
			!path.slice(inFolder.length).includes('/')
		) {
			stems.push(stem(path));
		}
	}
	let high = 0;
	let width = 2;
	for (const name of stems) {
		const match = name.match(NUMBERED);
		if (!match) continue;
		high = Math.max(high, Number(match[1]));
		width = Math.max(width, match[1].length);
	}
	return String(high + 1).padStart(width, '0');
}

/** `lessons`, `07`, `sorting_hats` -> `lessons/07_sorting_hats.json` */
export function lessonFile(folder: string, number: string, slug: string): string {
	return join(folder, `${number}_${slug}.json`);
}

/**
 * What a new plan starts as: the fields the schema requires, in schema order,
 * with one empty section, intention and criterion for the editor to fill. It
 * is not valid until those are filled; the editor validates before saving.
 */
export function blankLesson(title: string, minutes: number): Lesson {
	return {
		title,
		description: '',
		duration_minutes: minutes,
		sections: [{ section: '', duration_minutes: minutes }],
		learning_intentions: [''],
		success_criteria: [''],
		curriculum_links: []
	};
}

/** The length most of the unit's plans have, for a new plan to start with. */
export function usualLength(lessons: (Lesson | null)[], fallback = 60): number {
	const counts = new Map<number, number>();
	for (const lesson of lessons) {
		const minutes = lesson?.duration_minutes;
		if (typeof minutes === 'number') counts.set(minutes, (counts.get(minutes) ?? 0) + 1);
	}
	let best = fallback;
	let most = 0;
	for (const [minutes, count] of counts) {
		if (count > most) [best, most] = [minutes, count];
	}
	return best;
}

/** The unit with `ref` in its index, after the last plan in the same folder. */
export function withLesson(unit: Unit, ref: string): Unit {
	const lessons = [...(unit.lessons ?? [])];
	if (lessons.includes(ref)) return unit;
	const folder = dirname(ref);
	let at = lessons.length;
	for (let i = lessons.length - 1; i >= 0; i--) {
		if (dirname(lessons[i]) === folder) {
			at = i + 1;
			break;
		}
	}
	lessons.splice(at, 0, ref);
	return ordered({ ...unit, lessons }, Object.keys(unit), UNIT_ORDER) as Unit;
}

/**
 * Every (offering path, offering, term) whose entry for the unit lists its
 * own lessons: those classes do not take a plan added to the unit's index.
 */
export function ownLists(
	unitDir: string,
	offerings: [string, Offering][]
): { path: string; offering: Offering; term: string | null }[] {
	const found: { path: string; offering: Offering; term: string | null }[] = [];
	for (const [path, offering] of offerings) {
		for (const entry of offering.units ?? []) {
			if (entryTakes(offering, entry, unitDir) && entry.lessons) {
				found.push({ path, offering, term: entry.term ?? null });
			}
		}
	}
	return found;
}
