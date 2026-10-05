/**
 * The only module that talks to the GitHub API.
 *
 * The data repo is read through the Git Trees and Blobs APIs: one recursive
 * tree lists every path with its blob sha, and blobs are fetched on demand and
 * cached by sha, which never changes for the same content. Writes go through
 * the Contents API with the blob sha the editor loaded, so GitHub refuses a
 * save over a file that changed since.
 */

import { dump, type Json } from './format.ts';
import type { Store } from './store.ts';

const API = 'https://api.github.com';

export interface RepoTarget {
	owner: string;
	repo: string;
	branch: string;
}

export interface TreeEntry {
	path: string;
	sha: string;
}

export interface Loaded<T> {
	doc: T;
	sha: string;
}

/** The token is missing, expired, revoked or lacks access to the repo. */
export class AuthError extends Error {}
/** The file changed (on GitHub, or on disk) since it was loaded. */
export class ConflictError extends Error {}
export class NotFoundError extends Error {}
export class GitHubError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

type Fetch = typeof fetch;

export class Repo implements Store {
	private tree: Map<string, string> | null = null;
	private blobs = new Map<string, string>();

	constructor(
		readonly target: RepoTarget,
		private readonly token: string,
		private readonly fetcher: Fetch = (input, init) => fetch(input, init)
	) {}

	private async request(path: string, init: RequestInit = {}): Promise<Response> {
		const response = await this.fetcher(`${API}${path}`, {
			...init,
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `Bearer ${this.token}`,
				'X-GitHub-Api-Version': '2022-11-28',
				...(init.body ? { 'Content-Type': 'application/json' } : {}),
				...init.headers
			}
		});
		if (response.ok) return response;
		const detail = await response
			.json()
			.then((body: { message?: string }) => body.message ?? '')
			.catch(() => '');
		if (response.status === 401) throw new AuthError('GitHub did not accept the token.');
		if (response.status === 403 && /resource not accessible|permission/i.test(detail)) {
			throw new AuthError(`The token cannot do this: ${detail}`);
		}
		if (response.status === 404) throw new NotFoundError(`Not found: ${path}`);
		if (response.status === 409 || (response.status === 422 && /sha/i.test(detail))) {
			throw new ConflictError(detail || 'The file changed on GitHub since it was loaded.');
		}
		throw new GitHubError(detail || response.statusText, response.status);
	}

	private get base(): string {
		const { owner, repo } = this.target;
		return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
	}

	/** Checks the token can read the repo. Returns its full name. */
	async check(): Promise<string> {
		const response = await this.request(this.base);
		const body: { full_name: string } = await response.json();
		return body.full_name;
	}

	/** Every file path in the branch, mapped to its blob sha. Cached until `refresh`. */
	async paths(): Promise<Map<string, string>> {
		if (this.tree) return this.tree;
		const branch = encodeURIComponent(this.target.branch);
		const response = await this.request(`${this.base}/git/trees/${branch}?recursive=1`);
		const body: { tree: { path: string; sha: string; type: string }[]; truncated: boolean } =
			await response.json();
		if (body.truncated) {
			throw new GitHubError('The repository is too large to list in one request.', 200);
		}
		this.tree = new Map(body.tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));
		return this.tree;
	}

	/** Forget the listing so the next read sees commits made elsewhere. */
	refresh(): void {
		this.tree = null;
	}

	async has(path: string): Promise<boolean> {
		return (await this.paths()).has(path);
	}

	async readText(path: string): Promise<Loaded<string>> {
		const sha = (await this.paths()).get(path);
		if (!sha) throw new NotFoundError(`${path} is not in ${this.target.branch}.`);
		let text = this.blobs.get(sha);
		if (text === undefined) {
			const response = await this.request(`${this.base}/git/blobs/${sha}`);
			const body: { content: string; encoding: string } = await response.json();
			text = body.encoding === 'base64' ? decodeBase64(body.content) : body.content;
			this.blobs.set(sha, text);
		}
		return { doc: text, sha };
	}

	async readJson<T = Json>(path: string): Promise<Loaded<T>> {
		const { doc, sha } = await this.readText(path);
		return { doc: JSON.parse(doc) as T, sha };
	}

	/**
	 * Commits `doc` to `path` in the house format. `sha` is the blob the editor
	 * loaded; GitHub refuses the write if the file has changed since. Returns
	 * the new blob sha.
	 */
	async writeJson(path: string, doc: unknown, sha: string, message: string): Promise<string> {
		const text = dump(doc);
		const response = await this.request(`${this.base}/contents/${encodePath(path)}`, {
			method: 'PUT',
			body: JSON.stringify({
				message,
				content: encodeBase64(text),
				sha,
				branch: this.target.branch
			})
		});
		const body: { content: { sha: string } } = await response.json();
		const newSha = body.content.sha;
		this.blobs.set(newSha, text);
		this.tree?.set(path, newSha);
		return newSha;
	}
}

function encodePath(path: string): string {
	return path.split('/').map(encodeURIComponent).join('/');
}

export function encodeBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

export function decodeBase64(encoded: string): string {
	const binary = atob(encoded.replace(/\s/g, ''));
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}
