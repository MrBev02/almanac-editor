<script lang="ts">
	// A new class (offering): copied from an existing one into a new year, or
	// blank. The preview on the right is the file that will be written.
	import { goto } from '$app/navigation';
	import Icon from './Icon.svelte';
	import PageHead from './PageHead.svelte';
	import type { UnitEntry } from '#lib/data.ts';
	import {
		blankOffering,
		copyOffering,
		offeringPath,
		suggestId,
		validId
	} from '#lib/domain/newOffering.ts';
	import { join } from '#lib/domain/paths.ts';
	import { ConflictError } from '#lib/domain/repo.ts';
	import type { Offering } from '#lib/domain/types.ts';
	import { className, houseMap, humanise, termParts, titleCase, yearsOf } from '#lib/house.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	let {
		offerings,
		units,
		from
	}: { offerings: [string, Offering][]; units: UnitEntry[]; from: string | null } = $props();

	const BLANK = '';
	const byPath = $derived(new Map(offerings));
	const years = $derived(yearsOf(offerings));

	/** Subject directories: every offering's subject, and every unit's (the part before /units/). */
	const subjects = $derived(
		[
			...new Set([
				...offerings.map(([, o]) => o.subject),
				...units.map((u) => u.dir.slice(0, u.dir.indexOf('/units/'))).filter(Boolean)
			])
		].sort()
	);

	function start(path: string) {
		const source = byPath.get(path);
		if (source) {
			year = source.year + 1;
			yearGroup = source.year_group ?? '';
			classLabel = source.class_label ?? '';
			subject = source.subject;
		} else {
			year = new Date().getFullYear();
			yearGroup = '';
			classLabel = '';
		}
		idEdited = false;
	}

	// svelte-ignore state_referenced_locally
	let source = $state(
		from && offerings.some(([p]) => p === from) ? from : (offerings.at(-1)?.[0] ?? BLANK)
	);
	let year = $state(new Date().getFullYear());
	let yearGroup = $state('');
	let classLabel = $state('');
	// svelte-ignore state_referenced_locally
	let subject = $state(offerings[0]?.[1].subject ?? subjects[0] ?? '');
	let chosenUnits = $state<string[]>([]);
	let id = $state('');
	let idEdited = $state(false);
	let saving = $state(false);
	let problem = $state<string | null>(null);

	// svelte-ignore state_referenced_locally
	start(source);

	const copying = $derived(byPath.get(source) ?? null);
	// A straight copy keeps the source's id with the new year; a renamed one is built from the name.
	const suggested = $derived(
		copying &&
			yearGroup === (copying.year_group ?? '') &&
			classLabel === (copying.class_label ?? '') &&
			/^\d{4}-/.test(copying.id)
			? `${year}${copying.id.slice(4)}`
			: suggestId(year, yearGroup, classLabel)
	);
	$effect(() => {
		if (!idEdited) id = suggested;
	});

	const subjectUnits = $derived(units.filter((u) => u.dir.startsWith(subject + '/')));

	const draft = $derived.by<Offering | null>(() => {
		const name = { id, year, year_group: yearGroup, class_label: classLabel };
		if (copying) return copyOffering(copying, name);
		if (!subject || chosenUnits.length === 0) return null;
		return blankOffering(name, subject, chosenUnits);
	});

	const path = $derived(offeringPath(id));
	const taken = $derived(byPath.has(path));
	const idProblem = $derived(
		!validId(id)
			? 'Start with the year, then lowercase words and numbers joined by hyphens.'
			: taken
				? `${path} already exists.`
				: null
	);
	const house = $derived(
		draft ? (houseMap([...offerings, [path, draft]]).get(path) ?? 'none') : 'none'
	);

	const unitTitle = (dir: string) =>
		units.find((u) => u.dir === dir)?.unit.unit_title ?? humanise(dir.split('/').pop() ?? dir);

	async function create(event: SubmitEvent) {
		event.preventDefault();
		const data = session.data;
		if (!data || !draft || idProblem || saving) return;
		saving = true;
		problem = null;
		try {
			await data.createOffering($state.snapshot(draft) as Offering);
			session.showYear(String(year));
			session.revision += 1;
			await goto(links.home());
		} catch (error) {
			problem =
				error instanceof ConflictError
					? `${path} already exists. Choose another id.`
					: `Not created. ${(error as Error).message}`;
		} finally {
			saving = false;
		}
	}
</script>

<PageHead
	crumbs={[{ href: links.home(), label: 'Classes' }]}
	title="New class"
	lede="Copy a class into a new year, or start a blank one. Nothing is saved until you create it."
/>

<div class="page">
	<form class="grid" onsubmit={create}>
		<div class="fields">
			<label class="field">
				<span>Start from</span>
				<select bind:value={source} onchange={() => start(source)}>
					{#each years as y (y)}
						<optgroup label={String(y)}>
							{#each offerings.filter(([, o]) => o.year === y) as [p, o] (p)}
								<option value={p}>Copy {className(o)} ({o.id})</option>
							{/each}
						</optgroup>
					{/each}
					<option value={BLANK}>A blank class</option>
				</select>
			</label>

			<div class="row">
				<label class="field year">
					<span>Year</span>
					<input type="number" min="2000" max="2100" step="1" bind:value={year} required />
				</label>
				<label class="field">
					<span>Year group</span>
					<input type="text" bind:value={yearGroup} placeholder="Year 10" />
				</label>
				<label class="field">
					<span>Class</span>
					<input type="text" bind:value={classLabel} placeholder="Class 1" />
				</label>
			</div>

			{#if copying}
				<p class="kept">
					<strong>Subject:</strong>
					{titleCase(copying.subject.split('/').pop() ?? copying.subject)}, as in {copying.id}.
				</p>
			{:else}
				<label class="field">
					<span>Subject</span>
					<select bind:value={subject} onchange={() => (chosenUnits = [])}>
						{#each subjects as s (s)}
							<option value={s}
								>{titleCase(s.replace(/^subjects\//, '').replace(/\//g, ' · '))}</option
							>
						{/each}
					</select>
				</label>
				<fieldset class="field units">
					<legend>Units, ticked in the order they are taught</legend>
					{#each subjectUnits as u (u.dir)}
						{@const rel = u.dir.slice(subject.length + 1)}
						<label class="check">
							<input
								type="checkbox"
								checked={chosenUnits.includes(rel)}
								onchange={() =>
									(chosenUnits = chosenUnits.includes(rel)
										? chosenUnits.filter((u) => u !== rel)
										: [...chosenUnits, rel])}
							/>
							<span>{u.unit.unit_title}</span>
							{#if chosenUnits.includes(rel)}
								<span class="order">{chosenUnits.indexOf(rel) + 1}</span>
							{/if}
						</label>
					{:else}
						<p class="muted">This subject has no units yet.</p>
					{/each}
				</fieldset>
			{/if}

			<label class="field">
				<span>Id</span>
				<input
					type="text"
					bind:value={id}
					oninput={() => (idEdited = true)}
					spellcheck="false"
					autocomplete="off"
				/>
			</label>
			<p class="file" class:bad={idProblem}>
				{#if idProblem}{idProblem}{:else}Saved as <code>{path}</code>.{/if}
			</p>

			{#if problem}<div class="msg warn"><div>{problem}</div></div>{/if}

			<div class="actions">
				<button class="primary create" type="submit" disabled={!draft || !!idProblem || saving}>
					<Icon name="plus" size={16} />
					{saving ? 'Creating…' : 'Create class'}
				</button>
				<a class="btn quiet" href={links.home()}>Cancel</a>
			</div>
		</div>

		<aside class="preview" data-house={house} aria-label="The new class">
			<div class="band">
				<span class="yr">{yearGroup || 'Year group'}</span>
				<span class="cl">{classLabel}</span>
				<span class="id">{id || '…'} · {year}</span>
			</div>
			<div class="body">
				{#if draft}
					<ol class="taking">
						{#each draft.units as entry, i (i)}
							<li>
								<span class="term">{termParts(entry.term).join(' + ') || '–'}</span>
								<span>{unitTitle(join(draft.subject, entry.unit))}</span>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="muted">Choose at least one unit.</p>
				{/if}
				{#if copying}
					<h3>Carried over from {copying.id}</h3>
					<p>Units, their order and lesson lists, weeks, mode, colour, Canvas link names.</p>
					<h3>Reset for the new class</h3>
					<ul>
						<li>Notes, cohort and class differentiation are cleared.</li>
						<li>Unit dates are cleared; years in terms move to {year}.</li>
						<li>
							Canvas course and link ids become <code>TODO</code>; uploaded workbooks are emptied.
						</li>
					</ul>
				{/if}
				<p class="after">
					Terms and lesson lists can be changed in the file afterwards. {copying
						? `${copying.id} is left as it is.`
						: ''}
				</p>
			</div>
		</aside>
	</form>
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: minmax(0, 680px) minmax(280px, var(--margin-col));
		gap: 48px;
		align-items: start;
	}

	.fields {
		max-width: 680px;
	}

	.row {
		display: grid;
		grid-template-columns: 110px minmax(0, 1fr) minmax(0, 1fr);
		gap: 0 12px;
	}

	.kept {
		font-size: 14px;
		color: var(--ink-2);
		margin: -4px 0 16px;
	}

	.units {
		border: 0;
		padding: 0;
		margin: 0 0 16px;
	}

	.units legend {
		font-size: 13px;
		font-weight: 700;
		color: var(--ink-2);
		margin-bottom: 6px;
		padding: 0;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 10px;
		background: var(--paper);
		border-bottom: 1px solid var(--rule);
		font-size: 14px;
	}

	.check span:nth-child(2) {
		flex: 1;
	}

	.order {
		font-weight: 900;
		font-stretch: 75%;
		font-size: 18px;
		color: var(--house);
	}

	.file {
		margin: -8px 0 20px;
		font-size: 13px;
		color: var(--muted);
	}

	.file.bad {
		color: var(--warn);
	}

	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.create {
		min-height: 44px;
		padding: 0 22px;
		font-size: 15px;
	}

	.preview {
		position: sticky;
		top: 24px;
		background: var(--paper);
		box-shadow: var(--shadow);
	}

	.band {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 10px;
		padding: 18px 20px;
		background: var(--house);
		color: var(--house-on);
		transition: background-color 400ms var(--ease);
	}

	.yr {
		font-size: 30px;
		font-weight: 900;
		font-stretch: 70%;
		line-height: 1;
	}

	.cl {
		font-size: 15px;
		font-weight: 700;
	}

	.id {
		flex-basis: 100%;
		margin-top: 8px;
		font-size: 12px;
		opacity: 0.85;
	}

	.body {
		padding: 16px 20px 18px;
		font-size: 14px;
	}

	.taking {
		list-style: none;
		padding: 0;
		margin: 0 0 8px;
	}

	.taking li {
		display: grid;
		grid-template-columns: minmax(36px, max-content) 1fr;
		gap: 10px;
		padding: 8px 0;
		border-bottom: 1px solid var(--rule);
	}

	.taking .term {
		font-weight: 900;
		font-stretch: 75%;
		color: var(--house);
	}

	.body h3 {
		margin: 16px 0 4px;
		font-size: 14px;
	}

	.body p,
	.body ul {
		margin: 0;
		color: var(--ink-2);
	}

	.body ul {
		padding-left: 1.1em;
		display: grid;
		gap: 3px;
	}

	.after {
		margin-top: 14px !important;
		font-size: 13px;
		color: var(--muted) !important;
	}

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.preview {
			position: static;
		}
	}

	@media (max-width: 560px) {
		.row {
			grid-template-columns: 1fr 1fr;
		}

		.row .year {
			grid-column: span 2;
		}
	}
</style>
