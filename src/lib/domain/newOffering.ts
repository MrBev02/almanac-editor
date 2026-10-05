/**
 * Making a new class (offering): a copy of an existing one for a new year,
 * or a blank one. Content (which units, in which order, which lessons) is
 * carried over; delivery facts that belonged to the old class are not:
 *
 * - notes, cohort and class differentiation are dropped (new students);
 * - unit start and end dates are dropped, and years written into terms
 *   ("Term 4 2025") move by the same number of years as the class;
 * - Canvas ids become TODO. Workbook ids are emptied, because a workbook
 *   listed there means "uploaded to this course", and the new course has
 *   none yet. A link target keeps its name, kind and notes.
 */

import { ordered } from './lessonEdit.ts';
import { OFFERING_ORDER } from './offeringEdit.ts';
import type { Offering, OfferingUnit } from './types.ts';

export const TODO = 'TODO';

/** `2027-y10-class1` -> `offerings/2027_y10_class1.json`, as the data repo names them. */
export function offeringPath(id: string): string {
	return `offerings/${id.replace(/-/g, '_')}.json`;
}

/** Lowercase letters, digits and single hyphens, starting with the year. */
export function validId(id: string): boolean {
	return /^\d{4}(-[a-z0-9]+)+$/.test(id);
}

function slug(text: string | undefined): string {
	if (!text) return '';
	const year = text.trim().match(/^year\s*(\d+)$/i);
	if (year) return `y${year[1]}`;
	return text
		.toLowerCase()
		.replace(/([a-z])\s+(\d)/g, '$1$2')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/** `2027`, `Year 10`, `Class 1` -> `2027-y10-class1`. */
export function suggestId(year: number, yearGroup?: string, classLabel?: string): string {
	return [String(year), slug(yearGroup), slug(classLabel)].filter(Boolean).join('-');
}

/** Moves every year written in `text` by `delta`: "Term 4 2025" -> "Term 4 2026". */
export function shiftYears(text: string, delta: number): string {
	return text.replace(/\b(19|20)\d{2}\b/g, (y) => String(Number(y) + delta));
}

export interface ClassName {
	id: string;
	year: number;
	year_group?: string;
	class_label?: string;
}

function named(out: Record<string, unknown>, name: ClassName): void {
	out.id = name.id;
	out.year = name.year;
	for (const key of ['year_group', 'class_label'] as const) {
		const value = name[key]?.trim();
		if (value) out[key] = value;
		else delete out[key];
	}
}

const RESET = new Set(['cohort', 'differentiation', 'notes']);

function without(item: Record<string, unknown>, drop: string[], shift: (v: unknown) => unknown) {
	const next: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(item)) {
		if (!drop.includes(key)) next[key] = key === 'term' ? shift(value) : value;
	}
	return next;
}

function freshCanvas(canvas: Record<string, unknown>): Record<string, unknown> {
	const next: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(canvas)) {
		if (key === 'shared_from') continue;
		if (key === 'course_id') next[key] = TODO;
		else if (key === 'workbooks') next[key] = {};
		else if (key === 'targets' && value && typeof value === 'object') {
			const targets: Record<string, unknown> = {};
			for (const [name, target] of Object.entries(value as Record<string, object>)) {
				const t: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(target)) {
					t[k] = k === 'id' || k === 'course_id' ? TODO : v;
				}
				targets[name] = t;
			}
			next[key] = targets;
		} else next[key] = value;
	}
	return next;
}

export function copyOffering(source: Offering, name: ClassName): Offering {
	const delta = name.year - source.year;
	const shift = (term: unknown) => (typeof term === 'string' ? shiftYears(term, delta) : term);
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(source)) {
		if (!RESET.has(key)) out[key] = value;
	}
	named(out, name);
	out.units = source.units.map(
		(entry) => without(entry, ['notes', 'start_date', 'end_date'], shift) as OfferingUnit
	);
	if (Array.isArray(source.one_offs)) {
		out.one_offs = (source.one_offs as Record<string, unknown>[]).map((item) =>
			without(item, ['notes'], shift)
		);
	}
	if (source.canvas && typeof source.canvas === 'object') {
		out.canvas = freshCanvas(source.canvas as Record<string, unknown>);
	}
	return ordered(out, Object.keys(source), OFFERING_ORDER) as Offering;
}

export function blankOffering(name: ClassName, subject: string, units: string[]): Offering {
	const out: Record<string, unknown> = {};
	named(out, name);
	out.subject = subject;
	out.units = units.map((unit) => ({ unit }));
	return ordered(out, [], OFFERING_ORDER) as Offering;
}

/**
 * The year a list of classes opens on: this calendar year if it has classes,
 * otherwise the latest year before it (classes made ahead for next year wait
 * until it arrives), otherwise the earliest.
 */
export function defaultYear(years: number[], now = new Date().getFullYear()): number | null {
	if (years.length === 0) return null;
	if (years.includes(now)) return now;
	const past = years.filter((y) => y < now);
	return past.length ? Math.max(...past) : Math.min(...years);
}
