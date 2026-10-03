<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import ListEditor from './ListEditor.svelte';
	import {
		DIFFERENTIATION_LABELS,
		KIND_LABELS,
		TIER_LABELS,
		startTimes
	} from '#lib/domain/lessonView.ts';
	import {
		DIFFERENTIATION_KEYS,
		blankFeedback,
		blankSection,
		fromDraft,
		move,
		sectionTotal,
		toDraft,
		type LessonDraft
	} from '#lib/domain/lessonEdit.ts';
	import { stem } from '#lib/domain/paths.ts';
	import { AuthError, ConflictError, type Repo } from '#lib/domain/repo.ts';
	import type { Lesson, RegistryEntry } from '#lib/domain/types.ts';
	import type { Problem, Schemas } from '#lib/domain/validate.ts';
	import { session } from '#lib/session.svelte.ts';

	let {
		path,
		lesson,
		sha,
		registry,
		schemas,
		repo,
		hasContent,
		viewHref,
		onsaved
	}: {
		path: string;
		lesson: Lesson;
		sha: string;
		registry: Map<string, RegistryEntry>;
		schemas: Schemas;
		repo: Repo;
		hasContent: boolean;
		viewHref: string;
		onsaved: (lesson: Lesson, sha: string) => void;
	} = $props();

	// The editor works on a copy taken when it opens; a save makes the saved plan the new baseline.
	// svelte-ignore state_referenced_locally
	let draft = $state<LessonDraft>(toDraft(lesson));
	// svelte-ignore state_referenced_locally
	let baseline = $state(JSON.stringify(toDraft(lesson)));
	// svelte-ignore state_referenced_locally
	let message = $state(`Edit ${stem(path)}`);
	let saving = $state(false);
	let status = $state<
		| { kind: 'saved'; sectionsMoved: boolean }
		| { kind: 'problems'; problems: Problem[] }
		| { kind: 'conflict' }
		| { kind: 'error'; text: string }
		| null
	>(null);

	const dirty = $derived(JSON.stringify(draft) !== baseline);
	const total = $derived(sectionTotal(draft));
	const starts = $derived(startTimes(draft.sections.map((s) => s.duration_minutes)));

	function sectionsChanged(before: Lesson, after: Lesson): boolean {
		const shape = (l: Lesson) =>
			JSON.stringify(l.sections.map((s) => [s.label ?? '', s.duration_minutes]));
		return shape(before) !== shape(after);
	}

	async function save() {
		if (saving) return;
		status = null;
		let next: Lesson;
		try {
			next = fromDraft(lesson, $state.snapshot(draft) as LessonDraft);
		} catch (error) {
			status = { kind: 'error', text: (error as Error).message };
			return;
		}
		const problems = schemas.validate('lesson.schema.json', next);
		if (problems.length) {
			status = { kind: 'problems', problems };
			return;
		}
		saving = true;
		try {
			const newSha = await repo.writeJson(path, next, sha, message.trim() || `Edit ${stem(path)}`);
			const moved = sectionsChanged(lesson, next);
			onsaved(next, newSha);
			draft = toDraft(next);
			baseline = JSON.stringify(toDraft(next));
			status = { kind: 'saved', sectionsMoved: moved && hasContent };
		} catch (error) {
			if (error instanceof ConflictError) status = { kind: 'conflict' };
			else if (error instanceof AuthError) {
				status = {
					kind: 'error',
					text: 'GitHub no longer accepts the token. Copy your edits, then add a new token in Settings.'
				};
			} else status = { kind: 'error', text: (error as Error).message };
		} finally {
			saving = false;
		}
	}

	function onkeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 's') {
			event.preventDefault();
			save();
		}
	}

	let reloading = false;

	function onbeforeunload(event: BeforeUnloadEvent) {
		if (dirty && !reloading) event.preventDefault();
	}

	beforeNavigate(({ cancel, willUnload }) => {
		if (
			dirty &&
			!willUnload &&
			!confirm('Leave without saving? Your edits to this plan will be lost.')
		) {
			cancel();
		}
	});

	async function loadLatest() {
		if (dirty && !confirm('Load the version on GitHub? Your unsaved edits will be lost.')) return;
		reloading = true;
		location.reload();
	}

	const kinds = Object.entries(KIND_LABELS);
	const tiers = Object.entries(TIER_LABELS);
</script>

<svelte:window {onkeydown} {onbeforeunload} />

<div class="bar">
	<span
		class="total"
		class:off={draft.duration_minutes !== null && total !== draft.duration_minutes}
	>
		Sections {total} / {draft.duration_minutes ?? '?'} min
	</span>
	<span class="muted">{dirty ? 'Unsaved changes' : 'No changes'}</span>
	<input type="text" bind:value={message} aria-label="Commit message" class="message" />
	<button
		class="primary"
		type="button"
		onclick={save}
		disabled={saving || !dirty || !session.token}
	>
		{saving ? 'Saving…' : 'Save'}
	</button>
	<a href={viewHref}>{dirty ? 'Discard and view' : 'View'}</a>
</div>

{#if status?.kind === 'saved'}
	<div class="ok">
		Saved as a commit to {repo.target.branch}.
		{#if status.sectionsMoved}
			The run sheet changed, so the content file's section headings may no longer match. Update
			them, or record the change under <code>## Plan deviations</code>.
		{/if}
	</div>
{:else if status?.kind === 'problems'}
	<div class="warn">
		Not saved. Fix these first:
		<ul>
			{#each status.problems as p, i (i)}<li>
					<code>{p.path || 'plan'}</code>: {p.message}
				</li>{/each}
		</ul>
	</div>
{:else if status?.kind === 'conflict'}
	<div class="warn">
		Not saved: this plan changed on GitHub after you opened it. Your edits are still here. Copy what
		you need, then <button type="button" onclick={loadLatest}>load the latest version</button>.
	</div>
{:else if status?.kind === 'error'}
	<div class="warn">Not saved. {status.text}</div>
{/if}

<label class="field"><span>Title</span><input type="text" bind:value={draft.title} /></label>
<label class="field"
	><span>Description</span><textarea bind:value={draft.description}></textarea></label
>
<label class="field">
	<span>Lesson length (minutes)</span>
	<input type="number" min="1" step="1" bind:value={draft.duration_minutes} class="minutes" />
</label>
<label class="field"><span>Summary</span><textarea bind:value={draft.summary}></textarea></label>

<h2>Run sheet</h2>
<div class="sections">
	{#each draft.sections as s, i (i)}
		<fieldset class="card">
			<legend>Section {i + 1} <span class="muted">· starts at {starts[i]} min</span></legend>
			<div class="row">
				<label class="field grow"
					><span>Label</span><input type="text" bind:value={s.label} /></label
				>
				<label class="field"
					><span>Minutes</span><input
						type="number"
						min="1"
						step="1"
						bind:value={s.duration_minutes}
						class="minutes"
					/></label
				>
				<label class="field">
					<span>Kind</span>
					<select bind:value={s.kind}>
						<option value="">Unclassified</option>
						{#each kinds as [value, text] (value)}<option {value}>{text}</option>{/each}
					</select>
				</label>
				<label class="field">
					<span>Tier</span>
					<select bind:value={s.tier}>
						<option value="">Core (unset)</option>
						{#each tiers as [value, text] (value)}<option {value}>{text}</option>{/each}
					</select>
				</label>
			</div>
			<label class="field"><span>Section</span><textarea bind:value={s.section}></textarea></label>
			<div class="controls">
				<button type="button" disabled={i === 0} onclick={() => move(draft.sections, i, -1)}
					>↑ Move up</button
				>
				<button
					type="button"
					disabled={i === draft.sections.length - 1}
					onclick={() => move(draft.sections, i, 1)}>↓ Move down</button
				>
				<button type="button" onclick={() => draft.sections.splice(i, 1)}>Remove section</button>
			</div>
		</fieldset>
	{/each}
</div>
<button type="button" onclick={() => draft.sections.push(blankSection())}>Add section</button>

<h2>Learning intentions</h2>
<ListEditor
	bind:items={draft.learning_intentions}
	label="Learning intention"
	addLabel="Add learning intention"
/>

<h2>Success criteria</h2>
<ListEditor
	bind:items={draft.success_criteria}
	label="Success criterion"
	addLabel="Add success criterion"
/>

<h2>Syllabus dot points</h2>
<p class="muted">
	Ids, coverage and mode come from the unit's registry and are changed there. Notes can be edited.
</p>
{#each draft.curriculum_links as link, i (i)}
	<label class="field">
		<span>{link.id} <span class="muted">· {link.coverage}, {link.mode}</span></span>
		<span class="muted dot">{registry.get(link.id)?.text ?? "Not in the unit's registry"}</span>
		<textarea bind:value={link.note} placeholder="Note (optional)"></textarea>
	</label>
{/each}

<h2>Assessment</h2>
<label class="field"
	><span>Formative</span><textarea bind:value={draft.assessment.formative}></textarea></label
>
<h3>Evidence</h3>
<ListEditor bind:items={draft.assessment.evidence} label="Evidence" addLabel="Add evidence" />

<h2>Differentiation</h2>
{#each DIFFERENTIATION_KEYS as key (key)}
	<label class="field"
		><span>{DIFFERENTIATION_LABELS[key]}</span><textarea bind:value={draft.differentiation[key]}
		></textarea></label
	>
{/each}

<h2>Feedback for next time</h2>
{#each draft.feedback as f, i (i)}
	<fieldset class="card">
		<legend>Item {i + 1}</legend>
		<label class="field"><span>Issue</span><textarea bind:value={f.issue}></textarea></label>
		<label class="field"><span>Change</span><textarea bind:value={f.change}></textarea></label>
		<label class="field"
			><span>Raised by class (offering id, optional)</span><input
				type="text"
				bind:value={f.offering}
			/></label
		>
		<button type="button" onclick={() => draft.feedback.splice(i, 1)}>Remove item</button>
	</fieldset>
{/each}
<button type="button" onclick={() => draft.feedback.push(blankFeedback())}>Add feedback</button>

{#if draft.resources.length}
	<h2>Resources</h2>
	<p class="muted">
		Links, Canvas targets and files are set in the plan's source. Names and notes can be edited.
	</p>
	{#each draft.resources as r, i (i)}
		<fieldset class="card">
			<legend>
				Resource {i + 1}
				{#if r.canvas}<span class="pill">Canvas: {r.canvas}</span>{/if}
				{#if r.file}<span class="pill">File: {r.file}</span>{/if}
				{#if r.url}<span class="pill">Link</span>{/if}
			</legend>
			<label class="field"><span>Name</span><input type="text" bind:value={r.name} /></label>
			<label class="field"><span>Notes</span><textarea bind:value={r.notes}></textarea></label>
		</fieldset>
	{/each}
{/if}

<style>
	.bar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
		align-items: center;
		background: var(--page);
		border-bottom: 1px solid var(--line);
		padding: 8px 0;
		margin-bottom: 8px;
	}

	.total {
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 6px;
		background: var(--teal-bg);
	}

	.total.off {
		background: var(--coral-bg);
		border: 1px solid var(--coral);
	}

	.message {
		flex: 1 1 200px;
		width: auto;
	}

	.minutes {
		width: 7em;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0 12px;
	}

	.row .grow {
		flex: 1 1 260px;
	}

	fieldset {
		margin: 12px 0;
	}

	legend {
		font-weight: 600;
		padding: 0 4px;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.dot {
		display: block;
		font-size: 13px;
		margin-bottom: 4px;
	}
</style>
