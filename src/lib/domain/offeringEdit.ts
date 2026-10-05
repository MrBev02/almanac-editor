/**
 * Changing an offering's colour without disturbing the rest of the file. The
 * only field the editor writes on an offering is `colour`; every other key
 * keeps its value and its place.
 */

import { ordered } from './lessonEdit.ts';
import type { Offering } from './types.ts';

/** Schema order, for placing `colour` when the file did not have it. */
export const OFFERING_ORDER = [
	'id',
	'year',
	'year_group',
	'class_label',
	'colour',
	'mode',
	'subject',
	'cohort',
	'units',
	'one_offs',
	'canvas',
	'differentiation'
];

/** The offering with `colour` set, or removed when `colour` is null. */
export function withColour(offering: Offering, colour: string | null): Offering {
	const next: Record<string, unknown> = { ...offering };
	if (colour === null) delete next.colour;
	else next.colour = colour;
	return ordered(next, Object.keys(offering), OFFERING_ORDER) as Offering;
}
