/**
 * Where the lesson files are being read from: a folder on this computer, a
 * GitHub repo, or the made-up sample. At most one at a time.
 *
 * A folder is remembered in IndexedDB (see folderAccess.ts); the browser may
 * ask for access again on a later visit, so a remembered folder waits for a
 * click before it opens.
 *
 * For GitHub, the token lives in sessionStorage, so closing the tab signs out. Ticking
 * "Remember on this device" moves it to localStorage instead; that is for a
 * personal machine, never a shared one. The repo target is not secret and is
 * always remembered. Storage can be unavailable (private windows, blocked
 * site data), so every access is guarded and the app still works for the tab.
 */

import { Data } from './data.ts';
import { DEMO_TARGET, demoFetch } from './demo.ts';
import { FolderStore } from './domain/folder.ts';
import { Repo, type RepoTarget } from './domain/repo.ts';
import { allowed, rememberFolder, savedFolder, type BrowserFolder } from './folderAccess.ts';

const TOKEN_KEY = 'almanac-editor:token';
const TARGET_KEY = 'almanac-editor:target';
const DEMO_KEY = 'almanac-editor:demo';
const YEAR_KEY = 'almanac-editor:year';

export const DEFAULT_TARGET: RepoTarget = { owner: '', repo: '', branch: 'main' };

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

export type Source = 'folder' | 'github' | 'sample';

class Session {
	target = $state<RepoTarget>(loadTarget());
	token = $state<string | null>(read('session', TOKEN_KEY) ?? read('local', TOKEN_KEY));
	remembered = $state(read('local', TOKEN_KEY) !== null);
	/** Looking around the made-up sample repo; no token, nothing leaves the tab. */
	demo = $state(read('session', DEMO_KEY) === '1');
	/** The open folder, with access granted. */
	folder = $state.raw<BrowserFolder | null>(null);
	/** A folder chosen on an earlier visit, waiting for a click to allow access. */
	waiting = $state.raw<BrowserFolder | null>(null);
	/** False until the remembered folder has been looked up, so pages don't flash. */
	ready = $state(false);
	/** The year the class lists show ("all", or a year); null means this year. */
	year = $state<string | null>(read('local', YEAR_KEY));
	/** Bumped after a change the lists must re-read, such as a class's colour. */
	revision = $state(0);

	constructor() {
		this.restore();
	}

	private async restore(): Promise<void> {
		try {
			if (this.token || this.demo || typeof indexedDB === 'undefined') return;
			const folder = await savedFolder();
			if (!folder) return;
			if (await allowed(folder, false)) this.folder = folder;
			else this.waiting = folder;
		} catch {
			// The folder is gone or unreadable; the teacher chooses again.
		} finally {
			this.ready = true;
		}
	}

	/** One store and data cache per source, so a new one starts clean. */
	data = $derived(
		this.token
			? new Data(new Repo({ ...this.target }, this.token))
			: this.folder
				? new Data(new FolderStore(this.folder))
				: this.demo
					? new Data(new Repo({ ...DEMO_TARGET }, 'sample', demoFetch()))
					: null
	);

	get source(): Source | null {
		return this.token ? 'github' : this.folder ? 'folder' : this.demo ? 'sample' : null;
	}

	/** Whether there is anything to show. */
	get active(): boolean {
		return this.source !== null;
	}

	/** Where the files are, in a few words: a folder name, owner/repo, or the sample. */
	get label(): string {
		if (this.source === 'github') return `${this.target.owner}/${this.target.repo}`;
		if (this.source === 'folder') return this.folder?.name ?? 'folder';
		return 'the sample lessons';
	}

	showYear(year: string | null): void {
		this.year = year;
		write('local', YEAR_KEY, year);
	}

	startDemo(): void {
		this.close();
		write('session', DEMO_KEY, '1');
		this.demo = true;
	}

	async openFolder(folder: BrowserFolder): Promise<void> {
		this.close();
		this.folder = folder;
		await rememberFolder(folder);
	}

	/** Allows access to the remembered folder again. Must run from a click. */
	async reopen(): Promise<boolean> {
		const folder = this.waiting ?? this.folder;
		if (!folder || !(await allowed(folder, true))) return false;
		this.waiting = null;
		this.folder = folder;
		this.revision += 1;
		return true;
	}

	/** The folder lost its access (it was revoked or the tab was restored). */
	suspend(): void {
		if (this.folder) {
			this.waiting = this.folder;
			this.folder = null;
		}
	}

	signIn(token: string, target: RepoTarget, remember: boolean): void {
		this.close();
		this.target = { ...target };
		write('local', TARGET_KEY, JSON.stringify(target));
		write(remember ? 'local' : 'session', TOKEN_KEY, token);
		this.remembered = remember;
		this.token = token;
	}

	/** Signs out of GitHub, closes and forgets the folder, leaves the sample. */
	close(): void {
		write('session', TOKEN_KEY, null);
		write('local', TOKEN_KEY, null);
		write('session', DEMO_KEY, null);
		this.token = null;
		this.remembered = false;
		this.demo = false;
		if (this.folder || this.waiting) rememberFolder(null);
		this.folder = null;
		this.waiting = null;
	}
}

export const session = new Session();
