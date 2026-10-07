import { resolve } from '$app/paths';

type Params = Record<string, string | null | undefined>;

function query(params: Params): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value) search.set(key, value);
	}
	const text = search.toString();
	return text ? `?${text}` : '';
}

export const links = {
	home: () => resolve('/'),
	settings: () => resolve('/settings'),
	newClass: (from?: string | null) => resolve('/new-class') + query({ from }),
	/** A class's editor; `u` and `t` name the unit page it was opened from, to go back to. */
	editClass: (o: string, u?: string | null, t?: string | null) =>
		resolve('/class-edit') + query({ o, u, t }),
	newLesson: (u: string, o?: string | null, t?: string | null) =>
		resolve('/new-lesson') + query({ u, o, t }),
	unit: (u: string, o?: string | null, t?: string | null) => resolve('/unit') + query({ u, o, t }),
	lesson: (u: string, l: string, o?: string | null, t?: string | null, edit = false) =>
		resolve('/lesson') + query({ u, l, o, t, edit: edit ? '1' : null })
};
