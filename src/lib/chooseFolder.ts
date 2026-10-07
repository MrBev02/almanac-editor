import { FolderStore } from './domain/folder.ts';
import { canOpen } from './domain/layout.ts';
import { pickFolder, type BrowserFolder } from './folderAccess.ts';
import { session } from './session.svelte.ts';

/**
 * Asks for a folder and opens it if it holds lesson plans, or nothing in
 * subfolders yet (a fresh start: the first unit is made in the app). Returns
 * a message for the teacher when it is neither, or null when it opened (or
 * they cancelled).
 */
export async function chooseFolder(): Promise<string | null> {
	try {
		const folder = await pickFolder();
		if (!canOpen((await new FolderStore(folder).paths()).keys())) {
			return `${folder.name} has other files in it, but no lesson plans. Choose the folder that holds subjects/ and offerings/, or an empty folder to start afresh.`;
		}
		await session.openFolder(folder);
		return null;
	} catch (error) {
		if ((error as DOMException)?.name === 'AbortError') return null;
		return `Could not open the folder: ${(error as Error).message}`;
	}
}

export const NEW_FOLDER = 'Almanac lessons';

/**
 * Asks where to keep a new set of lessons, makes an empty folder there
 * (`Almanac lessons`, or `Almanac lessons 2` and so on if that name is
 * taken) and opens it. Returns true when it opened, false if they cancelled,
 * or a message for the teacher.
 */
export async function startFolder(): Promise<true | false | string> {
	try {
		const parent = await pickFolder();
		let name = NEW_FOLDER;
		for (let n = 2; await exists(parent, name); n++) name = `${NEW_FOLDER} ${n}`;
		const folder = (await parent.getDirectoryHandle(name, { create: true })) as BrowserFolder;
		await session.openFolder(folder);
		return true;
	} catch (error) {
		if ((error as DOMException)?.name === 'AbortError') return false;
		return `Could not make the folder: ${(error as Error).message}`;
	}
}

async function exists(parent: BrowserFolder, name: string): Promise<boolean> {
	try {
		await parent.getDirectoryHandle(name);
		return true;
	} catch {
		// A file of that name also makes the name taken.
		try {
			await parent.getFileHandle(name);
			return true;
		} catch {
			return false;
		}
	}
}
