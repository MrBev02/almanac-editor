<script lang="ts">
	// A new unit, in a subject the files have or a new one. In an empty folder
	// this is the first thing made: lessons go in units, and classes take units.
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Failure from '#lib/components/Failure.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHead from '#lib/components/PageHead.svelte';
	import { lessonSlug, validSlug } from '#lib/domain/newLesson.ts';
	import {
		blankUnit,
		newSubjectDir,
		subjectDirs,
		unitDir,
		type DotPoint
	} from '#lib/domain/newUnit.ts';
	import { basename, join } from '#lib/domain/paths.ts';
	import { ConflictError } from '#lib/domain/repo.ts';
	import { titleCase } from '#lib/house.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	const NEW = '';

	const load = $derived(
		session.data
			? Promise.all([session.data.units(), session.data.store.paths()]).then(([units, paths]) => ({
					units,
					paths,
					subjects: subjectDirs(units.map((u) => u.dir)),
					// The framework most dot points use already, for a new one to start with.
					framework:
						units
							.flatMap((u) => u.unit.syllabus_registry ?? [])
							.map((e) => e.framework)
							.find(Boolean) ?? ''
				}))
			: null
	);

	let picked = $state<string | null>(null);
	let subjectName = $state('');
	let title = $state('');
	let description = $state('');
	let slug = $state('');
	let slugEdited = $state(false);
	let points = $state<DotPoint[]>([]);
	let saving = $state(false);
	let problem = $state<string | null>(null);

	$effect(() => {
		if (!slugEdited) slug = lessonSlug(title);
	});
</script>

{#if load}
	{#await load}
		<PageHead title={null} />
		<div class="page"><div class="loading"><span></span><span></span><span></span></div></div>
	{:then { units, paths, subjects, framework }}
		{@const fromQuery = page.url.searchParams.get('s')}
		{@const subject =
			picked ?? (fromQuery && subjects.includes(fromQuery) ? fromQuery : (subjects[0] ?? NEW))}
		{@const fresh = subject === NEW}
		{@const subjectDir = fresh ? newSubjectDir(subjectName) : subject}
		{@const named = units.find((u) => u.dir.startsWith(subject + '/units/'))?.unit.subject}
		{@const existingName = typeof named === 'string' ? named : titleCase(basename(subject))}
		{@const dir = unitDir(subjectDir || 'subjects/…', slug || '…')}
		{@const taken = paths.has(join(dir, 'unit.json'))}
		{@const blocker =
			fresh && !subjectDir
				? 'Name the subject.'
				: !title.trim()
					? 'Give the unit a title.'
					: !validSlug(slug)
						? 'Use lowercase words and numbers joined by underscores for the folder.'
						: taken
							? `${dir} already exists.`
							: null}
		<PageHead
			crumbs={[{ href: links.home(), label: 'Classes' }]}
			title="New unit"
			lede="A unit holds a set of lesson plans. Classes take units, in the order you teach them."
		/>

		<div class="page">
			<form
				class="fields"
				onsubmit={async (event) => {
					event.preventDefault();
					const data = session.data;
					if (!data || blocker || saving) return;
					saving = true;
					problem = null;
					try {
						const name = fresh ? subjectName.trim() : existingName;
						await data.createUnit(
							dir,
							blankUnit(title.trim(), name, description.trim(), $state.snapshot(points))
						);
						session.revision += 1;
						await goto(links.unit(dir));
					} catch (error) {
						problem =
							error instanceof ConflictError
								? `${dir} already exists. Choose another folder name.`
								: `Not created. ${(error as Error).message}`;
					} finally {
						saving = false;
					}
				}}
			>
				{#if subjects.length}
					<label class="field">
						<span>Subject</span>
						<select value={subject} onchange={(e) => (picked = e.currentTarget.value)}>
							{#each subjects as s (s)}
								<option value={s}
									>{titleCase(s.replace(/^subjects\//, '').replace(/\//g, ' · '))}</option
								>
							{/each}
							<option value={NEW}>A new subject</option>
						</select>
					</label>
				{/if}
				{#if fresh}
					<label class="field">
						<span>Subject name</span>
						<input type="text" bind:value={subjectName} placeholder="Design and Technology" />
					</label>
				{/if}

				<label class="field">
					<span>Unit title</span>
					<input
						type="text"
						bind:value={title}
						class="title-input"
						placeholder="Designing everyday products"
					/>
				</label>
				<label class="field">
					<span>Description</span>
					<textarea
						bind:value={description}
						placeholder="One or two sentences on what the unit covers."></textarea>
				</label>

				<fieldset class="points">
					<legend>Syllabus dot points</legend>
					<p class="hint">
						The points this unit’s lessons link to. Add them now or later in <code>unit.json</code>,
						unless your schemas ask for at least one.
					</p>
					{#each points as point, i (i)}
						<div class="point">
							<div class="point-row">
								<label class="field">
									<span>Id</span>
									<input type="text" bind:value={point.id} placeholder="DP-01" spellcheck="false" />
								</label>
								<label class="field">
									<span>Framework</span>
									<input type="text" bind:value={point.framework} list="frameworks" />
								</label>
								<label class="field grow">
									<span>Phase</span>
									<input
										type="text"
										bind:value={point.phase}
										placeholder="Researching and planning"
									/>
								</label>
								<button
									type="button"
									class="quiet icon danger"
									title="Remove dot point"
									aria-label="Remove dot point {i + 1}"
									onclick={() => points.splice(i, 1)}><Icon name="bin" /></button
								>
							</div>
							<label class="field">
								<span>Text, as the syllabus words it</span>
								<textarea bind:value={point.text}></textarea>
							</label>
						</div>
					{/each}
					<datalist id="frameworks">
						<option value="NESA"></option>
						<option value="ACARA"></option>
						<option value="IB"></option>
					</datalist>
					<button
						type="button"
						class="add"
						onclick={() =>
							points.push({
								id: '',
								framework: points.at(-1)?.framework ?? framework,
								phase: points.at(-1)?.phase ?? '',
								text: ''
							})}
					>
						<Icon name="plus" size={16} /> Add dot point
					</button>
				</fieldset>

				<label class="field">
					<span>Folder name</span>
					<input
						type="text"
						bind:value={slug}
						oninput={() => (slugEdited = true)}
						spellcheck="false"
						autocomplete="off"
					/>
				</label>
				<p class="hint" class:bad={blocker && title}>
					{#if blocker && title}{blocker}{:else}Saved as <code>{join(dir, 'unit.json')}</code>.{/if}
				</p>

				{#if problem}<div class="msg warn"><div>{problem}</div></div>{/if}

				<div class="actions">
					<button class="primary go" type="submit" disabled={!!blocker || saving}>
						<Icon name="plus" size={16} />
						{saving ? 'Creating…' : 'Create unit'}
					</button>
					<a class="btn quiet" href={links.home()}>Cancel</a>
				</div>
			</form>
		</div>
	{:catch error}
		<PageHead title="Could not read the lessons" />
		<div class="page"><Failure {error} /></div>
	{/await}
{/if}

<style>
	.fields {
		max-width: 680px;
	}

	.title-input {
		font-size: 20px;
		font-weight: 750;
	}

	.hint {
		margin: -8px 0 20px;
		font-size: 13px;
		color: var(--muted);
	}

	.hint.bad {
		color: var(--warn);
	}

	.msg {
		margin-bottom: 20px;
	}

	.points {
		border: 0;
		padding: 0;
		margin: 8px 0 24px;
	}

	.points legend {
		font-size: 15px;
		font-weight: 800;
		padding: 0;
		margin-bottom: 4px;
	}

	.points .hint {
		margin: 0 0 12px;
	}

	.point {
		padding: 12px 14px 2px;
		margin-bottom: 8px;
		background: var(--paper);
	}

	.point-row {
		display: grid;
		grid-template-columns: 110px 120px minmax(0, 1fr) auto;
		gap: 0 10px;
		align-items: end;
	}

	.point-row button {
		margin-bottom: 16px;
	}

	@media (max-width: 560px) {
		.point-row {
			grid-template-columns: 1fr 1fr auto;
		}

		.point-row .grow {
			grid-column: 1 / -1;
			grid-row: 2;
		}
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
