/** POSIX path helpers for repo-relative paths. No leading slash, no `..` left after normalising. */

export function normalise(path: string): string {
	const out: string[] = [];
	for (const part of path.split('/')) {
		if (part === '' || part === '.') continue;
		if (part === '..') {
			if (out.length === 0) throw new Error(`${path} climbs out of the repository`);
			out.pop();
		} else {
			out.push(part);
		}
	}
	return out.join('/');
}

export function join(...parts: string[]): string {
	return normalise(parts.filter(Boolean).join('/'));
}

export function dirname(path: string): string {
	const i = path.lastIndexOf('/');
	return i === -1 ? '' : path.slice(0, i);
}

export function basename(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

/** `lessons/2026_y9/01_intro.json` -> `01_intro` */
export function stem(path: string): string {
	return basename(path).replace(/\.[^.]+$/, '');
}
