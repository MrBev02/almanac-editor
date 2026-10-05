import { FolderStore } from './domain/folder.ts';
import { pickFolder } from './folderAccess.ts';
import { session } from './session.svelte.ts';

/**
 * Asks for a folder and opens it if it holds lesson plans. Returns a message
 * for the teacher when it does not, or null when it opened (or they cancelled).
 */
export async function chooseFolder(): Promise<string | null> {
	try {
		const folder = await pickFolder();
		const paths = await new FolderStore(folder).paths();
		const units = [...paths.keys()].filter((p) => p.endsWith('/unit.json')).length;
		if (units === 0) {
			return `${folder.name} has no lesson plans in it. Choose the folder that holds subjects/ and offerings/.`;
		}
		await session.openFolder(folder);
		return null;
	} catch (error) {
		if ((error as DOMException)?.name === 'AbortError') return null;
		return `Could not open the folder: ${(error as Error).message}`;
	}
}
