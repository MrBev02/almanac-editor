<script lang="ts">
	import { AuthError, NotFoundError, Repo } from '#lib/domain/repo.ts';
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

<h1>Settings</h1>

{#if session.token}
	<div class="ok">
		Signed in to {session.target.owner}/{session.target.repo}.
		{session.remembered
			? 'The token is remembered on this device.'
			: 'The token is forgotten when this tab closes.'}
		<button type="button" onclick={() => session.signOut()}>Sign out</button>
	</div>
{/if}

<form onsubmit={connect}>
	<h2>Data repo</h2>
	<div class="row">
		<label class="field"><span>Owner</span><input type="text" bind:value={owner} required /></label>
		<label class="field"><span>Repo</span><input type="text" bind:value={repo} required /></label>
		<label class="field"
			><span>Branch</span><input type="text" bind:value={branch} required /></label
		>
	</div>

	<h2>GitHub token</h2>
	<p>
		Create a <strong>fine-grained personal access token</strong> at
		<a
			href="https://github.com/settings/personal-access-tokens/new"
			target="_blank"
			rel="noreferrer">github.com/settings/personal-access-tokens/new</a
		>:
	</p>
	<ul>
		<li>Repository access: <em>Only select repositories</em>, then this data repo alone.</li>
		<li>Permissions: <em>Contents</em>, read and write. Nothing else.</li>
		<li>Expiration: 90 days.</li>
	</ul>
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
		Remember on this device. Only on your own computer, never a shared or school machine.
	</label>

	{#if status}
		<div class={status.kind}>{status.text}</div>
	{/if}

	<p>
		<button class="primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Connect'}</button>
	</p>
</form>

<style>
	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0 12px;
	}

	.check {
		display: flex;
		gap: 8px;
		align-items: baseline;
		margin: 12px 0;
	}
</style>
