/**
 * Choosing a folder, and finding it again next visit. The browser lets a
 * folder handle be kept in IndexedDB; on a later visit it usually asks the
 * teacher to allow access again, which needs a click. Chrome and Edge only.
 */

import type { FolderHandle } from './domain/folder.ts';

type Mode = { mode: 'readwrite' };

export interface BrowserFolder extends FolderHandle {
	queryPermission(options: Mode): Promise<PermissionState>;
	requestPermission(options: Mode): Promise<PermissionState>;
}

const DB = 'almanac-editor';
const TABLE = 'handles';
const KEY = 'folder';
const READWRITE: Mode = { mode: 'readwrite' };

export function canOpenFolders(): boolean {
	return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Asks the teacher to choose a folder. Throws an AbortError if they cancel. */
export async function pickFolder(): Promise<BrowserFolder> {
	const host = window as unknown as {
		showDirectoryPicker(options: Mode & { id: string }): Promise<BrowserFolder>;
	};
	return host.showDirectoryPicker({ ...READWRITE, id: 'almanac' });
}

/** Whether the folder can be used now; with `ask`, prompts (needs a click). */
export async function allowed(folder: BrowserFolder, ask: boolean): Promise<boolean> {
	if ((await folder.queryPermission(READWRITE)) === 'granted') return true;
	return ask && (await folder.requestPermission(READWRITE)) === 'granted';
}

function open(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(TABLE);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function run<T>(mode: IDBTransactionMode, act: (table: IDBObjectStore) => IDBRequest<T>) {
	const db = await open();
	try {
		return await new Promise<T>((resolve, reject) => {
			const request = act(db.transaction(TABLE, mode).objectStore(TABLE));
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	} finally {
		db.close();
	}
}

/** The folder chosen last time, or null. Storage can be refused; that is null too. */
export async function savedFolder(): Promise<BrowserFolder | null> {
	try {
		return ((await run('readonly', (t) => t.get(KEY))) as BrowserFolder | undefined) ?? null;
	} catch {
		return null;
	}
}

export async function rememberFolder(folder: BrowserFolder | null): Promise<void> {
	try {
		if (folder) await run('readwrite', (t) => t.put(folder, KEY));
		else await run('readwrite', (t) => t.delete(KEY));
	} catch {
		// Not remembered: the teacher chooses the folder again next time.
	}
}
