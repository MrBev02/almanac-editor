<script lang="ts">
	import Icon from './Icon.svelte';
	import type { HeldRecord } from '#lib/data.ts';
	import { feedbackEntries, formatDate, type FeedbackEntry } from '#lib/domain/deliveries.ts';
	import { className } from '#lib/house.ts';

	/**
	 * Feedback on one lesson from every class's delivery records, newest first.
	 * Open items show; applied and declined ones wait under History.
	 */
	let {
		held,
		error = null,
		onclose = null
	}: {
		/** Null while the records load. */
		held: HeldRecord[] | null;
		error?: unknown;
		/** Offers to apply or decline the open items, when given. */
		onclose?: (() => void) | null;
	} = $props();

	const entries = $derived(
		held ? feedbackEntries(held.map(({ path, record }) => ({ path, record }))) : []
	);
	const open = $derived(entries.filter((e) => e.item.status === 'open'));
	const closed = $derived(entries.filter((e) => e.item.status !== 'open'));
	const classes = $derived(new Map(held?.map((h) => [h.path, h.offering]) ?? []));

	function whose(e: FeedbackEntry): string {
		const offering = classes.get(e.path);
		return offering ? className(offering) : 'Class not recorded';
	}

	function when(e: FeedbackEntry): string {
		const date = e.item.raised ?? e.taught;
		return date ? formatDate(date) : 'migrated';
	}
</script>

<section class="feedback" aria-labelledby="feedback-h">
	<h2 id="feedback-h">Feedback for next time</h2>
	{#if error}
		<p class="muted">Could not read the delivery records: {(error as Error)?.message ?? error}</p>
	{:else if !held}
		<div class="loading" aria-label="Loading feedback"><span></span><span></span></div>
	{:else}
		{#if open.length}
			<ul>
				{#each open as e (`${e.path}#${e.delivery}#${e.index}`)}
					<li>
						<p>{e.item.issue}</p>
						{#if e.item.change}<p class="change"><strong>Change:</strong> {e.item.change}</p>{/if}
						<span class="by">{whose(e)} · {when(e)}</span>
					</li>
				{/each}
			</ul>
			{#if onclose}
				<button type="button" class="close" onclick={onclose}>
					<Icon name="check" size={16} /> Apply or decline…
				</button>
			{/if}
		{:else}
			<p class="muted">Nothing open. After teaching it, mark it taught and note what to change.</p>
		{/if}
		{#if closed.length}
			<details>
				<summary>History ({closed.length})</summary>
				<ul>
					{#each closed as e (`${e.path}#${e.delivery}#${e.index}`)}
						<li class="done">
							<p>{e.item.issue}</p>
							{#if e.item.change}<p class="change"><strong>Change:</strong> {e.item.change}</p>{/if}
							<p class="outcome">
								<strong>{e.item.status === 'applied' ? 'Applied' : 'Declined'}</strong
								>{#if e.item.resolved}&nbsp;{formatDate(e.item.resolved)}{/if}{#if e.item.note}: {e
										.item.note}{/if}
							</p>
							<span class="by">{whose(e)} · {when(e)}</span>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	{/if}
</section>

<style>
	/* A margin heading, as in the lesson view and the editor. */
	h2 {
		margin-bottom: 14px;
		font-size: 17px;
		font-stretch: 90%;
	}

	ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 12px;
	}

	li {
		background: var(--paper);
		color: var(--ink);
		padding: 12px 14px 12px 16px;
		font-size: 14px;
		border-top: 3px solid var(--house);
	}

	li.done {
		border-top-color: var(--rule-strong);
	}

	li p {
		margin: 0;
	}

	.change,
	.outcome {
		margin-top: 8px;
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

	.close {
		margin-top: 2px;
	}

	details {
		margin-top: 14px;
	}

	summary {
		cursor: pointer;
		font-size: 13px;
		font-weight: 700;
		color: var(--ink-2);
	}

	details ul {
		margin-top: 10px;
	}
</style>
