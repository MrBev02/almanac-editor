/**
 * Making a new unit, and with it a new subject when the files have none: the
 * first step in an empty folder. A unit is `<subject dir>/units/<slug>/unit.json`,
 * where the subject dir is `subjects/<slug>` for a new subject, or one the
 * files already have (which may hold a course level, such as
 * `subjects/enterprise_computing/hsc`).
 */

import { ordered } from './lessonEdit.ts';
import { UNIT_ORDER, lessonSlug } from './newLesson.ts';
import { join } from './paths.ts';
import type { Unit } from './types.ts';

/** The subject directories the files have: every unit's path before `/units/`. */
export function subjectDirs(unitDirs: string[]): string[] {
	const dirs = new Set<string>();
	for (const dir of unitDirs) {
		const at = dir.indexOf('/units/');
		if (at > 0) dirs.add(dir.slice(0, at));
	}
	return [...dirs].sort();
}

/** `Computing Technology` -> `subjects/computing_technology` */
export function newSubjectDir(name: string): string {
	const slug = lessonSlug(name);
	return slug ? join('subjects', slug) : '';
}

/** `subjects/computing_technology`, `Analysing data` -> `subjects/computing_technology/units/analysing_data` */
export function unitDir(subjectDir: string, slug: string): string {
	return join(subjectDir, 'units', slug);
}

export interface DotPoint {
	id: string;
	framework: string;
	phase: string;
	text: string;
}

/**
 * A unit with no plans yet: the fields a data repo's schema requires, in
 * schema order. Dot points left wholly blank are dropped; the rest are kept
 * as typed (trimmed), for the schema to judge.
 */
export function blankUnit(
	title: string,
	subject: string,
	description: string,
	points: DotPoint[] = []
): Unit {
	const registry = points
		.map((p) => ({
			id: p.id.trim(),
			framework: p.framework.trim(),
			phase: p.phase.trim(),
			text: p.text.trim()
		}))
		.filter((p) => p.id || p.phase || p.text);
	return ordered(
		{
			unit_title: title,
			subject,
			description,
			syllabus_registry: registry,
			lessons: []
		},
		[],
		UNIT_ORDER
	) as Unit;
}
