/**
 * House colours: every class (offering) wears one, from the rail band to the
 * lesson lanes, so the page always says whose lesson it is. An offering can
 * fix its colour with a `colour` field. Classes without one take a colour by
 * their place among the offerings sorted by path, so the same repo gives the
 * same colours on every device. Pages outside a class
 * wear `none`.
 */

export const HOUSES = [
	'cobalt',
	'emerald',
	'ruby',
	'saffron',
	'plum',
	'lagoon',
	'tangerine',
	'moss'
] as const;

export type HouseName = (typeof HOUSES)[number];
export type House = HouseName | 'none';

export function isHouse(value: unknown): value is HouseName {
	return HOUSES.includes(value as HouseName);
}

/**
 * Every offering's house, keyed by its path. Each year shares out the colours
 * on its own, so next year's classes get the whole palette. Within a year, a
 * class without a fixed colour keeps the one its place gives it, and only
 * moves to the next free colour when a fixed class has taken that one.
 */
export function houseMap(
	offerings: [string, { colour?: unknown; year?: unknown }][]
): Map<string, House> {
	const map = new Map<string, House>();
	const years = Map.groupBy(offerings, ([, o]) => String(o.year ?? ''));
	for (const group of years.values()) {
		const taken = new Set<HouseName>();
		for (const [path, offering] of group) {
			if (isHouse(offering.colour)) {
				map.set(path, offering.colour);
				taken.add(offering.colour);
			}
		}
		const sorted = group.map(([path]) => path).sort(byNumber);
		sorted.forEach((path, i) => {
			if (map.has(path)) return;
			let house: HouseName = HOUSES[i % HOUSES.length];
			for (let step = 0; step < HOUSES.length && taken.has(house); step++) {
				house = HOUSES[(i + step + 1) % HOUSES.length];
			}
			map.set(path, house);
			taken.add(house);
		});
	}
	return map;
}

/** The house of the offering at `path`; `none` outside a class. */
export function houseOf(path: string | null | undefined, houses: Map<string, House>): House {
	return (path && houses.get(path)) || 'none';
}

/** Every year that has a class, newest first. */
export function yearsOf(offerings: [string, { year?: unknown }][]): number[] {
	const years = new Set<number>();
	for (const [, o] of offerings) if (typeof o.year === 'number') years.add(o.year);
	return [...years].sort((a, b) => b - a);
}

/**
 * The year the class lists show: the one chosen (a year, or "all"), or, when
 * nothing valid is chosen, the default from `pick` (this year, or the latest
 * before it).
 */
export function shownYear(
	choice: string | null,
	years: number[],
	pick: (years: number[]) => number | null
): number | 'all' {
	if (choice === 'all') return 'all';
	const chosen = Number(choice);
	if (choice && years.includes(chosen)) return chosen;
	return pick(years) ?? 'all';
}

/** Compares paths with their numbers as numbers, so `y8` sorts before `y10`. */
export function byNumber(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true });
}

/**
 * A term as short labels: "Term 2" -> ["T2"], "Term 1 and Term 3" ->
 * ["T1", "T3"], "Term 4 2025 and Term 1 2026" -> ["T4 2025", "T1 2026"].
 */
export function termParts(term: string | null | undefined): string[] {
	if (!term) return [];
	return term
		.replace(/\bterm\s*(\d)/gi, 'T$1')
		.split(/\s*(?:\band\b|&|\+|,)\s*/i)
		.map((part) => part.trim())
		.filter(Boolean);
}

/** "Year 10 Class 1", falling back to the offering id. */
export function className(offering: {
	id: string;
	year_group?: string;
	class_label?: string;
}): string {
	const name = [offering.year_group, offering.class_label].filter(Boolean).join(' ');
	return name || offering.id;
}

/** `what_is_data_analysis` -> `What is data analysis` */
export function humanise(slug: string): string {
	const text = slug
		.replace(/\.[^.]+$/, '')
		.replace(/^\d+[_-]/, '')
		.replace(/[_-]+/g, ' ')
		.trim();
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `subjects/design_tech/units/x` -> `Design tech` */
export function titleCase(slug: string): string {
	return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
