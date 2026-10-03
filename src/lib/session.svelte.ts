/**
 * Who is signed in, and to which data repo.
 *
 * The token lives in sessionStorage, so closing the tab signs out. Ticking
 * "Remember on this device" moves it to localStorage instead; that is for a
 * personal machine, never a shared one. The repo target is not secret and is
 * always remembered. Storage can be unavailable (private windows, blocked
 * site data), so every access is guarded and the app still works for the tab.
 */

import { Data } from './data.ts';
import { Repo, type RepoTarget } from './domain/repo.ts';

const TOKEN_KEY = 'almanac-editor:token';
const TARGET_KEY = 'almanac-editor:target';

export const DEFAULT_TARGET: RepoTarget = {
	owner: 'MrBev02',
	repo: 'subject-almanac',
	branch: 'main'
};

function storage(kind: 'local' | 'session'): Storage | null {
	try {
		return kind === 'local' ? window.localStorage : window.sessionStorage;
	} catch {
		return null;
	}
}

function read(kind: 'local' | 'session', key: string): string | null {
	try {
		return storage(kind)?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

function write(kind: 'local' | 'session', key: string, value: string | null): void {
	try {
		if (value === null) storage(kind)?.removeItem(key);
		else storage(kind)?.setItem(key, value);
	} catch {
		// Storage refused: the value lasts as long as this page does.
	}
}

function loadTarget(): RepoTarget {
	try {
		const saved = JSON.parse(read('local', TARGET_KEY) ?? 'null');
		if (saved?.owner && saved?.repo && saved?.branch) return saved;
	} catch {
		// fall through to the default
	}
	return { ...DEFAULT_TARGET };
}

class Session {
	target = $state<RepoTarget>(loadTarget());
	token = $state<string | null>(read('session', TOKEN_KEY) ?? read('local', TOKEN_KEY));
	remembered = $state(read('local', TOKEN_KEY) !== null);

	/** One Repo and data cache per sign-in, so a new token or target starts clean. */
	data = $derived(this.token ? new Data(new Repo({ ...this.target }, this.token)) : null);

	signIn(token: string, target: RepoTarget, remember: boolean): void {
		this.signOut();
		this.target = { ...target };
		write('local', TARGET_KEY, JSON.stringify(target));
		write(remember ? 'local' : 'session', TOKEN_KEY, token);
		this.remembered = remember;
		this.token = token;
	}

	signOut(): void {
		write('session', TOKEN_KEY, null);
		write('local', TOKEN_KEY, null);
		this.token = null;
		this.remembered = false;
	}
}

export const session = new Session();
