<script lang="ts">
	// A unit's own fields: title, description, syllabus dot points, and which
	// of the subject's outcomes apply. Lessons and their order are not here.
	import { page } from '$app/state';
	import { beforeNavigate, goto } from '$app/navigation';
	import DotPointsEditor from '#lib/components/DotPointsEditor.svelte';
	import Failure from '#lib/components/Failure.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHead from '#lib/components/PageHead.svelte';
	import { basename } from '#lib/domain/paths.ts';
	import { ConflictError } from '#lib/domain/repo.ts';
	import type { Unit } from '#lib/domain/types.ts';
	import { fromUnitDraft, toUnitDraft, type UnitDraft } from '#lib/domain/unitEdit.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	const u = $derived(page.url.searchParams.get('u') ?? '');
	const o = $derived(page.url.searchParams.get('o'));
	const t = $derived(page.url.searchParams.get('t'));

	const load = $derived.by(() => {
		const data = session.data;
		void session.revision;
		if (!data || !u) return null;
		return Promise.all([data.unitFile(u), data.linkedIds(u), data.outcomesFor(u)]).then(
			([loaded, linked, outcomes]) => {
				draft = toUnitDraft(loaded.doc);
				baseline = JSON.stringify(draft);
				return { data, loaded, linked, outcomes };
			}
		);
	});

	let draft = $state<UnitDraft>({
		unit_title: '',
		description: '',
		syllabus_registry: [],
		applicable_outcomes: []
	});
	let baseline = $state('');
	let saving = $state(false);
	let problem = $state<string | null>(null);
	const dirty = $derived(baseline !== '' && JSON.stringify(draft) !== baseline);

	beforeNavigate(({ cancel, willUnload }) => {
		if (
			dirty &&
			!willUnload &&
			!confirm('Leave without saving? Your edits to this unit will be lost.')
		) {
			cancel();
		}
	});

	async function save(original: Unit, sha: string, linked: Set<string>) {
		const data = session.data;
		if (!data || saving) return;
		problem = null;
		saving = true;
		try {
			const next = fromUnitDraft(original, $state.snapshot(draft) as UnitDraft, linked);
			await data.saveUnit(u, next, sha, `Edit unit ${basename(u)}`);
			baseline = JSON.stringify(draft);
			session.revision += 1;
			await goto(links.unit(u, o, t));
		} catch (error) {
			problem =
				error instanceof ConflictError
					? 'Not saved: the unit changed since you opened it. Copy what you need, then reload the page.'
					: `Not saved. ${(error as Error).message}`;
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window onbeforeunload={(e) => dirty && e.preventDefault()} />

{#if !u}
	<PageHead title="No unit given" />
	<div class="page"><div class="msg warn"><div>Open a unit first.</div></div></div>
{:else if load}
	{#await load}
		<PageHead title={null} />
		<div class="page"><div class="loading"><span></span><span></span><span></span></div></div>
	{:then { loaded, linked, outcomes }}
		<PageHead
			crumbs={[{ href: links.unit(u, o, t), label: loaded.doc.unit_title }]}
			title="Edit unit"
			lede="The unit’s title, description, syllabus dot points and outcomes. Lessons are added from the unit page."
		/>

		<div class="page">
			<form
				class="fields"
				onsubmit={(event) => {
					event.preventDefault();
					save(loaded.doc, loaded.sha, linked);
				}}
			>
				<label class="field">
					<span>Unit title</span>
					<input type="text" bind:value={draft.unit_title} class="title-input" />
				</label>
				<label class="field">
					<span>Description</span>
					<textarea bind:value={draft.description}></textarea>
				</label>

				<section>
					<h2>Syllabus dot points</h2>
					<p class="hint">
						What the unit’s lessons link to. An id stays fixed once saved, and a dot point a lesson
						links can’t be removed.
					</p>
					<DotPointsEditor bind:points={draft.syllabus_registry} {linked} />
				</section>

				<section>
					<h2>Outcomes</h2>
					{#if outcomes && outcomes.doc.outcomes.length}
						<p class="hint">
							Tick the outcomes this unit addresses. They come from <code>{outcomes.path}</code>.
						</p>
						<ul class="outcomes">
							{#each outcomes.doc.outcomes as outcome (outcome.code)}
								<li>
									<label>
										<input
											type="checkbox"
											checked={draft.applicable_outcomes.includes(outcome.code)}
											onchange={(e) =>
												(draft.applicable_outcomes = e.currentTarget.checked
													? outcomes.doc.outcomes
															.map((x) => x.code)
															.filter(
																(c) => c === outcome.code || draft.applicable_outcomes.includes(c)
															)
													: draft.applicable_outcomes.filter((c) => c !== outcome.code))}
										/>
										<b>{outcome.code}</b>
										<span>{outcome.text}</span>
									</label>
								</li>
							{/each}
						</ul>
						{@const unknown = draft.applicable_outcomes.filter(
							(c) => !outcomes.doc.outcomes.some((x) => x.code === c)
						)}
						{#if unknown.length}
							<p class="hint bad">Not in the subject’s outcomes: {unknown.join(', ')}.</p>
						{/if}
					{:else}
						<p class="hint">The subject has no outcomes yet.</p>
					{/if}
					<a class="btn" href={links.outcomes(u, o, t)}>
						<Icon name="pencil" size={16} />
						{outcomes ? 'Edit the subject’s outcomes' : 'Add the subject’s outcomes'}
					</a>
				</section>

				{#if problem}<div class="msg warn"><div>{problem}</div></div>{/if}

				<div class="actions">
					<button class="primary go" type="submit" disabled={saving || !dirty}>
						{saving ? 'Saving…' : 'Save unit'}
					</button>
					<a class="btn quiet" href={links.unit(u, o, t)}>{dirty ? 'Discard' : 'Back'}</a>
				</div>
			</form>
		</div>
	{:catch error}
		<PageHead title="Could not open this unit" />
		<div class="page"><Failure {error} /></div>
	{/await}
{/if}

<style>
	.fields {
		max-width: 760px;
	}

	.title-input {
		font-size: 20px;
		font-weight: 750;
	}

	section {
		margin: 28px 0;
	}

	h2 {
		margin: 0 0 4px;
	}

	.hint {
		margin: 0 0 12px;
		font-size: 13px;
		color: var(--muted);
	}

	.hint.bad {
		color: var(--warn);
	}

	.outcomes {
		list-style: none;
		padding: 0;
		margin: 0 0 14px;
	}

	.outcomes label {
		display: grid;
		grid-template-columns: auto minmax(90px, max-content) 1fr;
		gap: 10px;
		align-items: baseline;
		padding: 8px 10px;
		background: var(--paper);
		border-bottom: 1px solid var(--rule);
		font-size: 14px;
	}

	.msg {
		margin-bottom: 20px;
	}

	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.go {
		min-height: 44px;
		padding: 0 22px;
		font-size: 15px;
	}
</style>
