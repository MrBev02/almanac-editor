<script lang="ts">
	// A subject's outcomes (its outcome.json), reached from one of its units.
	// Units name outcomes by code, so a code stays fixed once saved, and one a
	// unit names cannot be removed. A subject without the file gets one here.
	import { page } from '$app/state';
	import { beforeNavigate, goto } from '$app/navigation';
	import Failure from '#lib/components/Failure.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHead from '#lib/components/PageHead.svelte';
	import { move } from '#lib/domain/lessonEdit.ts';
	import { join } from '#lib/domain/paths.ts';
	import { ConflictError } from '#lib/domain/repo.ts';
	import {
		blankOutcomeSet,
		fromOutcomeDraft,
		toOutcomeDraft,
		type OutcomeDraft,
		type OutcomeSet
	} from '#lib/domain/unitEdit.ts';
	import { titleCase } from '#lib/house.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	const u = $derived(page.url.searchParams.get('u') ?? '');
	const o = $derived(page.url.searchParams.get('o'));
	const t = $derived(page.url.searchParams.get('t'));

	const load = $derived.by(() => {
		const data = session.data;
		void session.revision;
		if (!data || !u) return null;
		return (async () => {
			const [found, unit] = await Promise.all([data.outcomesFor(u), data.unit(u)]);
			const subjectDir = u.slice(0, u.indexOf('/units/'));
			const path = found?.path ?? join(subjectDir, 'outcome.json');
			const set: OutcomeSet =
				found?.doc ??
				blankOutcomeSet(
					typeof unit.subject === 'string'
						? unit.subject
						: titleCase(subjectDir.split('/').pop() ?? ''),
					unit.syllabus_registry?.[0]?.framework ?? ''
				);
			const used = await data.usedCodes(path);
			draft = toOutcomeDraft(set);
			baseline = JSON.stringify(draft);
			return { data, path, set, sha: found?.sha ?? null, used, unit };
		})();
	});

	let draft = $state<OutcomeDraft>({ name: '', framework: '', stage: '', outcomes: [] });
	let baseline = $state('');
	let saving = $state(false);
	let problem = $state<string | null>(null);
	const dirty = $derived(JSON.stringify(draft) !== baseline);
	const back = $derived(links.unitEdit(u, o, t));

	beforeNavigate(({ cancel, willUnload }) => {
		if (
			dirty &&
			!saving &&
			!willUnload &&
			!confirm('Leave without saving? Your edits to these outcomes will be lost.')
		) {
			cancel();
		}
	});

	async function save(path: string, set: OutcomeSet, sha: string | null, used: Set<string>) {
		const data = session.data;
		if (!data || saving) return;
		problem = null;
		saving = true;
		try {
			const next = fromOutcomeDraft(set, $state.snapshot(draft) as OutcomeDraft, used);
			await data.saveOutcomes(path, next, sha, `Edit outcomes for ${next.name}`);
			baseline = JSON.stringify(draft);
			session.revision += 1;
			await goto(back);
		} catch (error) {
			problem =
				error instanceof ConflictError
					? 'Not saved: the outcomes changed since you opened them. Copy what you need, then reload the page.'
					: `Not saved. ${(error as Error).message}`;
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window onbeforeunload={(e) => dirty && e.preventDefault()} />

{#if !u}
	<PageHead title="No unit given" />
	<div class="page"><div class="msg warn"><div>Open the outcomes from a unit.</div></div></div>
{:else if load}
	{#await load}
		<PageHead title={null} />
		<div class="page"><div class="loading"><span></span><span></span><span></span></div></div>
	{:then { path, set, sha, used, unit }}
		<PageHead
			crumbs={[
				{ href: links.unit(u, o, t), label: unit.unit_title },
				{ href: back, label: 'Edit unit' }
			]}
			title="Outcomes"
			lede="The subject’s outcomes. Each unit ticks the ones it addresses. A code stays fixed once saved."
		>
			{#snippet meta()}<span class="file">{path}{sha === null ? ' (new)' : ''}</span>{/snippet}
		</PageHead>

		<div class="page">
			<form
				class="fields"
				onsubmit={(event) => {
					event.preventDefault();
					save(path, set, sha, used);
				}}
			>
				<div class="row">
					<label class="field grow">
						<span>Course name</span>
						<input type="text" bind:value={draft.name} />
					</label>
					<label class="field">
						<span>Framework</span>
						<input type="text" bind:value={draft.framework} list="frameworks" />
					</label>
					<label class="field">
						<span>Stage</span>
						<input type="text" bind:value={draft.stage} placeholder="Stage 5" />
					</label>
				</div>
				<datalist id="frameworks">
					<option value="NESA"></option>
					<option value="ACARA"></option>
					<option value="IB"></option>
				</datalist>

				<ol class="list">
					{#each draft.outcomes as outcome, i (i)}
						{@const kept = outcome.from !== undefined}
						{@const inUse = kept && used.has(outcome.code)}
						<li>
							<label class="field code">
								<span>Code</span>
								<input
									type="text"
									bind:value={outcome.code}
									readonly={kept}
									spellcheck="false"
									placeholder="CT5-DAT-01"
								/>
							</label>
							<label class="field grow">
								<span>Outcome, as the syllabus words it</span>
								<textarea bind:value={outcome.text}></textarea>
							</label>
							<div class="controls">
								<button
									type="button"
									class="quiet icon"
									aria-label="Move outcome {i + 1} up"
									title="Move up"
									disabled={i === 0}
									onclick={() => move(draft.outcomes, i, -1)}><Icon name="up" /></button
								>
								<button
									type="button"
									class="quiet icon"
									aria-label="Move outcome {i + 1} down"
									title="Move down"
									disabled={i === draft.outcomes.length - 1}
									onclick={() => move(draft.outcomes, i, 1)}><Icon name="down" /></button
								>
								<button
									type="button"
									class="quiet icon danger"
									aria-label="Remove outcome {i + 1}"
									title={inUse
										? 'A unit names this outcome. Untick it there first.'
										: 'Remove outcome'}
									disabled={inUse}
									onclick={() => draft.outcomes.splice(i, 1)}><Icon name="bin" /></button
								>
							</div>
						</li>
					{/each}
				</ol>
				<button type="button" onclick={() => draft.outcomes.push({ code: '', text: '' })}>
					<Icon name="plus" size={16} /> Add outcome
				</button>

				{#if problem}<div class="msg warn"><div>{problem}</div></div>{/if}

				<div class="actions">
					<button class="primary go" type="submit" disabled={saving || !dirty}>
						{saving ? 'Saving…' : 'Save outcomes'}
					</button>
					<a class="btn quiet" href={back}>{dirty ? 'Discard' : 'Back'}</a>
				</div>
			</form>
		</div>
	{:catch error}
		<PageHead title="Could not open the outcomes" />
		<div class="page"><Failure {error} /></div>
	{/await}
{/if}

<style>
	.fields {
		max-width: 760px;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 120px 140px;
		gap: 0 10px;
	}

	.file {
		opacity: 0.75;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 12px 0;
	}

	.list li {
		display: grid;
		grid-template-columns: 150px minmax(0, 1fr) auto;
		gap: 0 10px;
		align-items: start;
		padding: 12px 14px 0;
		margin-bottom: 8px;
		background: var(--paper);
	}

	.controls {
		display: flex;
		margin-top: 22px;
	}

	input[readonly] {
		color: var(--ink-2);
		background: transparent;
	}

	.msg {
		margin: 20px 0;
	}

	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-top: 24px;
	}

	.go {
		min-height: 44px;
		padding: 0 22px;
		font-size: 15px;
	}

	@media (max-width: 640px) {
		.row,
		.list li {
			grid-template-columns: 1fr;
		}
	}
</style>
