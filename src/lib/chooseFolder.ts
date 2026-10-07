import { FolderStore } from './domain/folder.ts';
import { canOpen } from './domain/layout.ts';
import { pickFolder } from './folderAccess.ts';
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
