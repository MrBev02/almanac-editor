/**
 * House colours: every class (offering) wears one, from the rail band to the
 * lesson lanes, so the page always says whose lesson it is. An offering can
 * fix its colour with a `colour` field. Classes without one take a colour by
 * their place among the offerings sorted by path, so the same repo gives the
 * same colours on every device. Pages outside a class
 * wear `none`.
 */

export const HOUSES = ['cobalt', 'emerald', 'ruby', 'saffron', 'plum', 'lagoon'] as const;

export type HouseName = (typeof HOUSES)[number];
export type House = HouseName | 'none';

export function isHouse(value: unknown): value is HouseName {
	return HOUSES.includes(value as HouseName);
}

/**
 * Every offering's house, keyed by its path. A class without a fixed colour
 * keeps the one its place gives it, and only moves to the next free colour
 * when a fixed class has taken that one.
 */
export function houseMap(offerings: [string, { colour?: unknown }][]): Map<string, House> {
	const map = new Map<string, House>();
	const taken = new Set<HouseName>();
	for (const [path, offering] of offerings) {
		if (isHouse(offering.colour)) {
			map.set(path, offering.colour);
			taken.add(offering.colour);
		}
	}
	const sorted = offerings.map(([path]) => path).sort();
	sorted.forEach((path, i) => {
		if (map.has(path)) return;
		let house: HouseName = HOUSES[i % HOUSES.length];
		for (let step = 0; step < HOUSES.length && taken.has(house); step++) {
			house = HOUSES[(i + step + 1) % HOUSES.length];
		}
		map.set(path, house);
		taken.add(house);
	});
	return map;
}

/** The house of the offering at `path`; `none` outside a class. */
export function houseOf(path: string | null | undefined, houses: Map<string, House>): House {
	return (path && houses.get(path)) || 'none';
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
