<script lang="ts">
	import Sheet from './Sheet.svelte';
	import type { Data, HeldRecord } from '#lib/data.ts';
	import {
		feedbackEntries,
		formatDate,
		today,
		type FeedbackEntry,
		type Resolution
	} from '#lib/domain/deliveries.ts';
	import { stem } from '#lib/domain/paths.ts';
	import { AuthError, ConflictError } from '#lib/domain/repo.ts';
	import { className } from '#lib/house.ts';
	import { session } from '#lib/session.svelte.ts';

	/**
	 * Applies or declines a lesson's open feedback. After a lesson save it asks
	 * which items the change dealt with; from the margin it closes items any
	 * time. Nothing is deleted. One write per class record touched; choices
	 * stay on screen through a conflict.
	 */
	let {
		open = $bindable(false),
		data,
		lessonPath,
		held,
		commit = null,
		afterSave = false,
		onsaved,
		onreload
	}: {
		open: boolean;
		data: Data;
		lessonPath: string;
		held: HeldRecord[];
		/** The commit that saved the lesson, recorded on applied items. */
		commit?: string | null;
		afterSave?: boolean;
		/** The records changed; read them again. */
		onsaved: () => void;
		/** A record changed elsewhere; read them again, keeping the choices. */
		onreload: () => void;
	} = $props();

	type Choice = { status: 'open' | 'applied' | 'declined'; note: string };
	let choices = $state<Record<string, Choice>>({});
	let saving = $state(false);
	let status = $state<string | null>(null);

	const keyOf = (e: FeedbackEntry) => `${e.path}#${e.delivery}#${e.index}`;
	const entries = $derived(
		feedbackEntries(held.map(({ path, record }) => ({ path, record }))).filter(
			(e) => e.item.status === 'open'
		)
	);
	const classes = $derived(new Map(held.map((h) => [h.path, h.offering])));
	// Every open item starts open; a choice survives the records being read again.
	$effect.pre(() => {
		for (const e of entries) choices[keyOf(e)] ??= { status: 'open', note: '' };
	});
	const chosen = $derived(entries.filter((e) => (choices[keyOf(e)]?.status ?? 'open') !== 'open'));
	const where = $derived(session.source === 'github' ? 'on GitHub' : 'on disk');

	async function save() {
		if (saving) return;
		if (!chosen.length) {
			open = false;
			return;
		}
		const unexplained = chosen.find(
			(e) => choices[keyOf(e)].status === 'declined' && !choices[keyOf(e)].note.trim()
		);
		if (unexplained) {
			status = 'Say why each declined item will not be done.';
			return;
		}
		saving = true;
		status = null;
		const date = today();
		const message = `Close feedback on ${stem(lessonPath)}`;
		let wrote = false;
		try {
			for (const record of held) {
				const resolutions: Resolution[] = chosen
					.filter((e) => e.path === record.path)
					.map((e) => {
						const c = choices[keyOf(e)];
						return {
							delivery: e.delivery,
							index: e.index,
							status: c.status as 'applied' | 'declined',
							date,
							note: c.note,
							commit
						};
					});
				if (!resolutions.length) continue;
				await data.resolve(record, resolutions, message);
				wrote = true;
				for (const e of chosen.filter((e) => e.path === record.path)) delete choices[keyOf(e)];
			}
			open = false;
			onsaved();
		} catch (error) {
			if (wrote) onsaved();
			if (error instanceof ConflictError) {
				data.store.refresh();
				onreload();
				status = `Not saved: a class’s record for this lesson changed ${where} since it was read. It has been read again; check your choices and save again.`;
			} else if (error instanceof AuthError) {
				status = 'GitHub no longer accepts the token. Add a new token in Settings.';
			} else status = `Not saved. ${(error as Error).message}`;
		} finally {
			saving = false;
		}
	}
</script>

<Sheet
	bind:open
	title={afterSave ? 'Did this change deal with any feedback?' : 'Apply or decline feedback'}
	lede={afterSave
		? 'Mark what the saved plan now does. Anything left open stays in the margin.'
		: 'Nothing is deleted: closed items move to the history.'}
	onsubmit={save}
>
	{#if entries.length}
		<ul>
			{#each entries as e (keyOf(e))}
				{@const c = choices[keyOf(e)]}
				{@const offering = classes.get(e.path)}
				{@const date = e.item.raised ?? e.taught}
				<li>
					<p class="issue">{e.item.issue}</p>
					{#if e.item.change}<p class="change"><strong>Change:</strong> {e.item.change}</p>{/if}
					<span class="by"
						>{offering ? className(offering) : 'Class not recorded'} · {date
							? formatDate(date)
							: 'migrated'}</span
					>
					{#if c}
						<fieldset>
							<legend class="sr-only">What happened to this item</legend>
							<label
								><input type="radio" bind:group={choices[keyOf(e)].status} value="open" /> Still open</label
							>
							<label
								><input type="radio" bind:group={choices[keyOf(e)].status} value="applied" /> Dealt with</label
							>
							<label
								><input type="radio" bind:group={choices[keyOf(e)].status} value="declined" /> Declined</label
							>
						</fieldset>
					{/if}
					{#if c?.status === 'applied'}
						<label class="field">
							<span>What was done (optional)</span>
							<input type="text" bind:value={choices[keyOf(e)].note} />
						</label>
					{:else if c?.status === 'declined'}
						<label class="field">
							<span>Why not</span>
							<input type="text" bind:value={choices[keyOf(e)].note} required />
						</label>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">No open feedback on this lesson.</p>
	{/if}

	{#snippet foot()}
		{#if status}<div class="msg warn"><div>{status}</div></div>{/if}
		<button type="button" class="quiet" onclick={() => (open = false)}>
			{afterSave ? 'Not now' : 'Close'}
		</button>
		<button type="submit" class="primary" disabled={saving || !session.active}>
			{saving ? 'Saving…' : chosen.length ? `Save ${chosen.length}` : 'Done'}
			<kbd>Ctrl Enter</kbd>
		</button>
	{/snippet}
</Sheet>

<style>
	ul {
		list-style: none;
		margin: 0 0 12px;
		padding: 0;
		border-top: 2px solid var(--ink);
	}

	li {
		padding: 14px 0 6px;
		border-bottom: 1px solid var(--rule);
		font-size: 14px;
	}

	li p {
		margin: 0;
	}

	.change {
		margin-top: 6px;
		color: var(--ink-2);
	}

	.change strong {
		color: var(--house-deep);
	}

	.by {
		display: inline-block;
		margin-top: 6px;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
	}

	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 18px;
		border: 0;
		margin: 10px 0 8px;
		padding: 0;
	}

	fieldset label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 650;
		cursor: pointer;
	}

	input[type='radio'] {
		accent-color: var(--house);
	}

	.msg {
		flex: 1 1 100%;
		margin: 0;
	}

	kbd {
		font-size: 10px;
	}

	@media (max-width: 640px) {
		kbd {
			display: none;
		}
	}
</style>
