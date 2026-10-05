<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Failure from '#lib/components/Failure.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LessonEditor from '#lib/components/LessonEditor.svelte';
	import LessonView from '#lib/components/LessonView.svelte';
	import PageHead from '#lib/components/PageHead.svelte';
	import { lessonRefs, OfferingMismatch } from '#lib/domain/offerings.ts';
	import { join, stem } from '#lib/domain/paths.ts';
	import type { Lesson } from '#lib/domain/types.ts';
	import { className } from '#lib/house.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	const u = $derived(page.url.searchParams.get('u') ?? '');
	const l = $derived(page.url.searchParams.get('l') ?? '');
	const o = $derived(page.url.searchParams.get('o'));
	const t = $derived(page.url.searchParams.get('t'));
	const editing = $derived(page.url.searchParams.get('edit') === '1');
	const path = $derived(u && l ? join(u, l) : '');

	const load = $derived.by(() => {
		const data = session.data;
		void session.revision;
		if (!data || !path) return null;
		return (async () => {
			const [unit, loaded, content, schemas, offering] = await Promise.all([
				data.unit(u),
				data.lesson(path),
				data.content(path),
				data.schemas(),
				o ? data.offering(o) : Promise.resolve(null)
			]);
			let refs: string[] = [];
			try {
				refs = lessonRefs(u, unit, offering, t);
			} catch (error) {
				if (!(error instanceof OfferingMismatch)) throw error;
			}
			const registry = new Map((unit.syllabus_registry ?? []).map((r) => [r.id, r]));
			// Warm the neighbours so the next and previous lessons open at once.
			const at = refs.indexOf(l);
			for (const ref of [refs[at + 1], refs[at - 1]]) {
				if (ref) data.lesson(join(u, ref)).catch(() => {});
			}
			return { unit, loaded, content, schemas, refs, registry, offering, store: data.store };
		})();
	});

	// The plan as last loaded or saved; a save replaces it without refetching.
	let saved = $state<{ path: string; lesson: Lesson; sha: string } | null>(null);

	// Where J and K go, once the lesson's place in the order is known.
	let neighbours = $state<{ prev: string | null; next: string | null }>({ prev: null, next: null });
	$effect(() => {
		const pending = load;
		const at = { u, l, o, t };
		neighbours = { prev: null, next: null };
		pending
			?.then(({ refs }) => {
				if (load !== pending) return;
				const i = refs.indexOf(at.l);
				neighbours = {
					prev: i > 0 ? links.lesson(at.u, refs[i - 1], at.o, at.t) : null,
					next: i >= 0 && i < refs.length - 1 ? links.lesson(at.u, refs[i + 1], at.o, at.t) : null
				};
			})
			.catch(() => {});
	});

	function onkeydown(event: KeyboardEvent) {
		if (editing || event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select, dialog[open]')) return;
		if (event.key === 'j' && neighbours.next) goto(neighbours.next);
		else if (event.key === 'k' && neighbours.prev) goto(neighbours.prev);
		else if (event.key === 'e') goto(links.lesson(u, l, o, t, true));
	}
</script>

<svelte:window {onkeydown} />

{#if !path}
	<PageHead title="No lesson given" />
	<div class="page"><div class="msg warn"><div>Open a lesson from a unit.</div></div></div>
{:else if load}
	{#await load}
		<PageHead title={null} />
		<div class="page"><div class="loading"><span></span><span></span><span></span></div></div>
	{:then { unit, loaded, content, schemas, refs, registry, offering, store }}
		{@const current = saved?.path === path ? saved : { path, lesson: loaded.doc, sha: loaded.sha }}
		{@const index = refs.indexOf(l)}
		{@const prev = index > 0 ? links.lesson(u, refs[index - 1], o, t) : null}
		{@const next =
			index >= 0 && index < refs.length - 1 ? links.lesson(u, refs[index + 1], o, t) : null}
		<PageHead
			crumbs={[
				...(offering ? [{ href: links.home(), label: className(offering) }] : []),
				{ href: links.unit(u, o, t), label: unit.unit_title + (t ? ` · ${t}` : '') }
			]}
			numeral={index >= 0 ? String(index + 1).padStart(2, '0') : null}
			title={current.lesson.title}
			lede={editing ? null : current.lesson.description}
		>
			{#snippet actions()}
				{#if !editing}
					<a
						class="btn icon-btn"
						href={prev ?? undefined}
						aria-disabled={!prev}
						aria-label="Previous lesson (K)"
						title="Previous lesson (K)"
					>
						<Icon name="left" />
					</a>
					<a
						class="btn icon-btn"
						href={next ?? undefined}
						aria-disabled={!next}
						aria-label="Next lesson (J)"
						title="Next lesson (J)"
					>
						<Icon name="right" />
					</a>
					<a class="btn solid" href={links.lesson(u, l, o, t, true)} title="Edit (E)">
						<Icon name="pencil" size={16} /> Edit
					</a>
				{/if}
			{/snippet}
			{#snippet meta()}
				{#if index >= 0}<span>Lesson {index + 1} of {refs.length}</span>{/if}
				<span>{current.lesson.duration_minutes} minutes</span>
				<span class="file">{stem(l)}</span>
				{#if editing}<span>Editing</span>{/if}
			{/snippet}
		</PageHead>

		<div class="page">
			{#if editing}
				{#key current.path}
					<LessonEditor
						{path}
						lesson={current.lesson}
						sha={current.sha}
						{registry}
						{schemas}
						{store}
						hasContent={content !== null}
						viewHref={links.lesson(u, l, o, t)}
						onsaved={(lesson, sha) => (saved = { path, lesson, sha })}
						onreload={() => {
							store.refresh();
							saved = null;
							session.revision += 1;
						}}
					/>
				{/key}
			{:else}
				<LessonView lesson={current.lesson} {registry} {content} />

				<nav class="pager" aria-label="Lessons in order">
					{#if prev}
						<a href={prev} class="prev">
							<span class="dir"><Icon name="left" size={16} /> Previous <kbd>K</kbd></span>
							<span class="name">Lesson {index}</span>
						</a>
					{:else}<span></span>{/if}
					{#if next}
						<a href={next} class="next">
							<span class="dir">Next <kbd>J</kbd> <Icon name="right" size={16} /></span>
							<span class="name">Lesson {index + 2}</span>
						</a>
					{/if}
				</nav>
			{/if}
		</div>
	{:catch error}
		<PageHead title="Could not open this lesson" />
		<div class="page"><Failure {error} /></div>
	{/await}
{/if}

<style>
	.icon-btn {
		width: 36px;
		padding: 0;
	}

	.icon-btn[aria-disabled='true'] {
		opacity: 0.35;
		pointer-events: none;
	}

	.file {
		opacity: 0.75;
		font-weight: 500;
	}

	.pager {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		margin-top: 48px;
	}

	.pager a {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 18px 20px;
		background: var(--house-soft);
		text-decoration: none;
		transition: background-color 160ms var(--ease);
	}

	.pager a:hover {
		background: var(--house);
		color: var(--house-on);
	}

	.pager .next {
		align-items: flex-end;
		grid-column: 2;
	}

	.dir {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 700;
	}

	.name {
		font-size: 22px;
		font-weight: 850;
		font-stretch: 75%;
	}
</style>
