/**
 * A class's lessons for a unit. A port of the data repo's
 * `scripts/offering_lessons.py`, `lessons_for_offering`: where the Python exits
 * with a message, this throws `OfferingMismatch` so a page can say so.
 */

import { join, normalise } from './paths.ts';
import type { Offering, OfferingUnit, Unit } from './types.ts';

export class OfferingMismatch extends Error {}

/** Whether an offering's unit entry is the unit at `unitDir`. */
export function entryTakes(offering: Offering, entry: OfferingUnit, unitDir: string): boolean {
	return join(offering.subject ?? '', entry.unit) === normalise(unitDir);
}

/**
 * Lesson refs, relative to the unit directory, for the offering's entries for
 * this unit (only `term`'s entries, when given). Entries are merged in order
 * and repeats dropped; an entry without `lessons` takes the unit's own index.
 */
export function lessonsForOffering(
	unitDir: string,
	unit: Unit,
	offering: Offering,
	term?: string | null
): string[] {
	let entries = (offering.units ?? []).filter((e) => entryTakes(offering, e, unitDir));
	const name = offering.id ?? 'offering';
	if (entries.length === 0) {
		throw new OfferingMismatch(`${name} does not take ${unitDir.split('/').pop()}.`);
	}
	if (term != null) {
		entries = entries.filter((e) => e.term === term);
		if (entries.length === 0) {
			throw new OfferingMismatch(`${name} has no ${unitDir.split('/').pop()} entry for ${term}.`);
		}
	}
	const refs: string[] = [];
	for (const entry of entries) {
		for (const ref of entry.lessons ?? unit.lessons ?? []) {
			if (!refs.includes(ref)) refs.push(ref);
		}
	}
	return refs;
}

/** Every (offering path, offering, term) whose entry takes the unit. */
export function offeringEntries(
	unitDir: string,
	offerings: [string, Offering][]
): { path: string; offering: Offering; term: string | null }[] {
	const found: { path: string; offering: Offering; term: string | null }[] = [];
	for (const [path, offering] of offerings) {
		for (const entry of offering.units ?? []) {
			if (entryTakes(offering, entry, unitDir)) {
				found.push({ path, offering, term: entry.term ?? null });
			}
		}
	}
	return found;
}

/** The unit's own index, or one class's order when an offering is given. */
export function lessonRefs(
	unitDir: string,
	unit: Unit,
	offering: Offering | null,
	term: string | null
): string[] {
	return offering ? lessonsForOffering(unitDir, unit, offering, term) : [...(unit.lessons ?? [])];
}
