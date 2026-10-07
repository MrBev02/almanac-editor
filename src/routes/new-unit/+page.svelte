<script lang="ts">
	// A new unit, in a subject the files have or a new one. In an empty folder
	// this is the first thing made: lessons go in units, and classes take units.
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Failure from '#lib/components/Failure.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHead from '#lib/components/PageHead.svelte';
	import { lessonSlug, validSlug } from '#lib/domain/newLesson.ts';
	import { blankUnit, newSubjectDir, subjectDirs, unitDir } from '#lib/domain/newUnit.ts';
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
					subjects: subjectDirs(units.map((u) => u.dir))
				}))
			: null
	);

	let picked = $state<string | null>(null);
	let subjectName = $state('');
	let title = $state('');
	let description = $state('');
	let slug = $state('');
	let slugEdited = $state(false);
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
	{:then { units, paths, subjects }}
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
						await data.createUnit(dir, blankUnit(title.trim(), name, description.trim()));
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
