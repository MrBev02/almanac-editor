<script lang="ts">
	import { AuthError, NotFoundError, Repo } from '#lib/domain/repo.ts';
	import Icon from '#lib/components/Icon.svelte';
	import PageHead from '#lib/components/PageHead.svelte';
	import { chooseFolder } from '#lib/chooseFolder.ts';
	import { canOpenFolders } from '#lib/folderAccess.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';
	import { goto } from '$app/navigation';

	let owner = $state(session.target.owner);
	let repo = $state(session.target.repo);
	let branch = $state(session.target.branch);
	let token = $state('');
	let remember = $state(false);
	let status = $state<{ kind: 'ok' | 'warn'; text: string } | null>(null);
	let busy = $state(false);

	const folders = canOpenFolders();
	let folderProblem = $state<string | null>(null);
	let opening = $state(false);

	async function openFolder() {
		opening = true;
		folderProblem = await chooseFolder();
		opening = false;
		if (!folderProblem && session.source === 'folder') await goto(links.home());
	}

	async function connect(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		status = null;
		const target = { owner: owner.trim(), repo: repo.trim(), branch: branch.trim() };
		const candidate = token.trim();
		try {
			const probe = new Repo(target, candidate);
			await probe.check();
			const paths = await probe.paths();
			const units = [...paths.keys()].filter((p) => p.endsWith('/unit.json')).length;
			if (units === 0) {
				status = { kind: 'warn', text: `Connected, but ${target.repo} has no unit.json files.` };
				return;
			}
			session.signIn(candidate, target, remember);
			token = '';
			await goto(links.home());
		} catch (error) {
			status = {
				kind: 'warn',
				text:
					error instanceof AuthError
						? 'GitHub did not accept that token for this repo.'
						: error instanceof NotFoundError
							? `Cannot see ${target.owner}/${target.repo} at ${target.branch}. Check the names, and that the token was given access to this repo.`
							: `Could not connect: ${(error as Error).message}`
			};
		} finally {
			busy = false;
		}
	}
</script>

<PageHead
	crumbs={session.active ? [{ href: links.home(), label: 'Classes' }] : []}
	title="Lesson files"
	lede="Almanac reads and saves lesson plans in one place: a folder on this computer, or a GitHub repo. Use whichever suits you."
/>

<div class="page">
	{#if session.token}
		<div class="msg ok">
			<div>
				Signed in to <strong>{session.target.owner}/{session.target.repo}</strong>.
				{session.remembered
					? 'The token is remembered on this device.'
					: 'The token is forgotten when this tab closes.'}
				<br /><button type="button" onclick={() => session.close()}>Sign out</button>
			</div>
		</div>
	{:else if session.source === 'folder'}
		<div class="msg ok">
			<div>
				Using the folder <strong>{session.label}</strong>. Saves go straight into its files; nothing
				is committed or uploaded.
				<br /><button type="button" onclick={() => session.close()}>Close the folder</button>
			</div>
		</div>
	{:else if session.demo}
		<div class="msg note">
			<div>
				You are looking at sample lessons. Open your own below, or
				<button type="button" onclick={() => session.close()}>Leave the sample</button>
			</div>
		</div>
	{/if}

	<section class="folder">
		<h2>A folder on this computer</h2>
		<p>
			Choose the folder that holds <code>subjects/</code> and <code>offerings/</code>. Almanac saves
			into those files.
		</p>
		{#if folders}
			<button class="primary connect" type="button" onclick={openFolder} disabled={opening}>
				<Icon name="file" size={16} />
				{session.source === 'folder' ? 'Choose another folder' : 'Open a folder'}
			</button>
			{#if folderProblem}<div class="msg warn"><div>{folderProblem}</div></div>{/if}
		{:else}
			<p class="muted">This browser cannot open folders. Use Chrome or Edge, or a GitHub repo.</p>
		{/if}
	</section>

	<div class="grid">
		<form onsubmit={connect}>
			<h2>A GitHub repo</h2>
			<p class="muted">Almanac commits each save to the branch for you.</p>
			<div class="row">
				<label class="field"
					><span>Owner</span><input type="text" bind:value={owner} required /></label
				>
				<label class="field"
					><span>Repo</span><input type="text" bind:value={repo} required /></label
				>
				<label class="field"
					><span>Branch</span><input type="text" bind:value={branch} required /></label
				>
			</div>

			<h2>GitHub token</h2>
			<label class="field">
				<span>Token</span>
				<input
					type="password"
					bind:value={token}
					autocomplete="off"
					spellcheck="false"
					required
					placeholder="github_pat_…"
				/>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={remember} />
				<span
					>Remember on this device. Only on your own computer, never a shared or school machine.</span
				>
			</label>

			{#if status}
				<div class="msg {status.kind}"><div>{status.text}</div></div>
			{/if}

			<button class="primary connect" type="submit" disabled={busy}>
				{busy ? 'Checking…' : 'Connect'}
				{#if !busy}<Icon name="right" size={16} />{/if}
			</button>
		</form>

		<aside class="how">
			<h2>Making the token</h2>
			<ol>
				<li>
					Open
					<a
						href="https://github.com/settings/personal-access-tokens/new"
						target="_blank"
						rel="noreferrer">github.com/settings/personal-access-tokens/new</a
					>
					and make a <strong>fine-grained personal access token</strong>.
				</li>
				<li>Repository access: <em>Only select repositories</em>, then this data repo alone.</li>
				<li>Permissions: <em>Contents</em>, read and write. Nothing else.</li>
				<li>Expiration: 90 days.</li>
			</ol>
			<p class="muted">
				The token is only ever sent to api.github.com, and the page does not connect anywhere else.
			</p>
		</aside>
	</div>
</div>

<style>
	.folder {
		max-width: 68ch;
		padding-bottom: 32px;
		margin-bottom: 32px;
		border-bottom: 2px solid var(--ink);
	}

	.folder h2 {
		margin-top: 8px;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(260px, 380px);
		gap: 48px;
		align-items: start;
	}

	h2 {
		margin: 28px 0 14px;
	}

	form > h2:first-child {
		margin-top: 0;
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0 12px;
	}

	.check {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		margin: 4px 0 20px;
		font-size: 14px;
	}

	.check input {
		margin-top: 3px;
		flex: none;
	}

	.connect {
		min-height: 44px;
		padding: 0 22px;
		font-size: 15px;
	}

	.how {
		background: var(--paper);
		padding: 22px 24px;
		box-shadow: var(--shadow);
	}

	.how h2 {
		margin-top: 0;
		font-size: 18px;
	}

	.how ol {
		counter-reset: step;
		list-style: none;
		padding: 0;
		margin: 0 0 16px;
		display: grid;
		gap: 12px;
	}

	.how li {
		counter-increment: step;
		position: relative;
		padding-left: 34px;
		font-size: 14px;
		overflow-wrap: anywhere;
	}

	.how li::before {
		content: counter(step);
		position: absolute;
		left: 0;
		top: -2px;
		width: 24px;
		height: 24px;
		display: grid;
		place-items: center;
		background: var(--ink);
		color: var(--chalk);
		font-weight: 800;
		font-size: 13px;
	}

	.how p {
		font-size: 13px;
		margin: 0;
	}

	@media (max-width: 860px) {
		.folder {
			max-width: 68ch;
			padding-bottom: 32px;
			margin-bottom: 32px;
			border-bottom: 2px solid var(--ink);
		}

		.folder h2 {
			margin-top: 8px;
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
