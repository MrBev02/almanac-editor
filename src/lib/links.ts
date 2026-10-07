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
	unitEdit: (u: string, o?: string | null, t?: string | null) =>
		resolve('/unit-edit') + query({ u, o, t }),
	outcomes: (u: string, o?: string | null, t?: string | null) =>
		resolve('/outcomes') + query({ u, o, t }),
	newUnit: (s?: string | null) => resolve('/new-unit') + query({ s }),
	newLesson: (u: string, o?: string | null, t?: string | null) =>
		resolve('/new-lesson') + query({ u, o, t }),
	unit: (u: string, o?: string | null, t?: string | null) => resolve('/unit') + query({ u, o, t }),
	lesson: (u: string, l: string, o?: string | null, t?: string | null, edit = false) =>
		resolve('/lesson') + query({ u, l, o, t, edit: edit ? '1' : null })
};
