<script lang="ts">
	// Fixes a class's colour by writing `colour` into its offering file (a
	// commit, on GitHub). "Automatic" removes the field again.
	import Icon from './Icon.svelte';
	import { ConflictError } from '#lib/domain/repo.ts';
	import { HOUSES } from '#lib/house.ts';
	import { session } from '#lib/session.svelte.ts';

	let {
		path,
		name,
		fixed,
		onsaved
	}: {
		path: string;
		name: string;
		fixed: string | null;
		onsaved: (colour: string | null) => void;
	} = $props();

	let open = $state(false);
	let saving = $state<string | null>(null);
	let error = $state<string | null>(null);

	async function choose(colour: string | null) {
		const data = session.data;
		if (!data || saving || colour === fixed) return;
		saving = colour ?? 'auto';
		error = null;
		try {
			await data.setColour(path, colour);
			onsaved(colour);
			session.revision += 1;
			open = false;
		} catch (e) {
			error =
				e instanceof ConflictError
					? 'This class’s file changed since the page loaded. Reload the page and try again.'
					: /colour|additional/i.test((e as Error).message)
						? 'Your offering schema does not allow colour yet. Add it to schemas/offering.schema.json.'
						: `Not saved. ${(e as Error).message}`;
		} finally {
			saving = null;
		}
	}
</script>

<div class="picker">
	<button
		type="button"
		class="toggle"
		aria-expanded={open}
		onclick={() => (open = !open)}
		title="Choose {name}’s colour"
	>
		<span class="dot" aria-hidden="true"></span>
		{fixed ? 'Colour fixed' : 'Colour: automatic'}
		<Icon name={open ? 'up' : 'down'} size={14} />
	</button>

	{#if open}
		<div class="choices" role="group" aria-label="Colour for {name}">
			{#each HOUSES as h (h)}
				<button
					type="button"
					class="swatch"
					data-house={h}
					aria-pressed={fixed === h}
					aria-label="{h}{fixed === h ? ' (current)' : ''}"
					title={h}
					disabled={saving !== null}
					onclick={() => choose(h)}
				>
					{#if saving === h}<span class="busy" aria-hidden="true"></span>{/if}
				</button>
			{/each}
			<button
				type="button"
				class="auto"
				aria-pressed={!fixed}
				disabled={saving !== null}
				onclick={() => choose(null)}
			>
				{saving === 'auto' ? 'Saving…' : 'Automatic'}
			</button>
		</div>
		<p class="note">
			{#if error}{error}{:else if session.source === 'sample'}Saved in this tab only.{:else if session.source === 'github'}Saved
				as a commit to the offering file.{:else}Saved to the offering file.{/if}
		</p>
	{/if}
</div>

<style>
	.picker {
		margin-top: 12px;
	}

	.toggle {
		min-height: 28px;
		padding: 0 8px;
		gap: 6px;
		font-size: 12px;
		font-weight: 650;
		background: color-mix(in oklab, var(--house-on) 12%, transparent);
		border-color: color-mix(in oklab, var(--house-on) 35%, transparent);
		color: var(--house-on);
	}

	.toggle:hover:not(:disabled) {
		border-color: var(--house-on);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--house-on);
	}

	.choices {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}

	.swatch {
		position: relative;
		width: 28px;
		min-height: 28px;
		padding: 0;
		background: var(--house);
		border: 2px solid color-mix(in oklab, #fff 70%, transparent);
	}

	.swatch:hover:not(:disabled) {
		border-color: #fff;
	}

	.swatch[aria-pressed='true'] {
		border-color: #fff;
		box-shadow: 0 0 0 2px var(--ink);
	}

	.swatch[aria-pressed='true']::after {
		content: '';
		position: absolute;
		inset: 7px;
		border-radius: 50%;
		background: var(--house-on);
	}

	.busy {
		position: absolute;
		inset: 6px;
		border: 2px solid var(--house-on);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}

	.auto {
		min-height: 28px;
		padding: 0 8px;
		font-size: 12px;
		background: transparent;
		color: var(--house-on);
		border-color: color-mix(in oklab, var(--house-on) 50%, transparent);
	}

	.auto[aria-pressed='true'] {
		background: var(--house-on);
		color: var(--house);
	}

	.note {
		margin: 8px 0 0;
		font-size: 11px;
		line-height: 1.35;
		opacity: 0.85;
	}
</style>
