<script lang="ts">
	import { page } from '$app/state';
	import Failure from '#lib/components/Failure.svelte';
	import LessonEditor from '#lib/components/LessonEditor.svelte';
	import LessonView from '#lib/components/LessonView.svelte';
	import { lessonRefs, OfferingMismatch } from '#lib/domain/offerings.ts';
	import { join } from '#lib/domain/paths.ts';
	import type { Lesson } from '#lib/domain/types.ts';
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
			return { unit, loaded, content, schemas, refs, registry, repo: data.repo };
		})();
	});

	// The plan as last loaded or saved; a save replaces it without refetching.
	let saved = $state<{ path: string; lesson: Lesson; sha: string } | null>(null);
</script>

{#if !path}
	<div class="warn">No lesson given.</div>
{:else if load}
	{#await load}
		<p class="muted">Reading the plan…</p>
	{:then { unit, loaded, content, schemas, refs, registry, repo }}
		{@const current = saved?.path === path ? saved : { path, lesson: loaded.doc, sha: loaded.sha }}
		{@const index = refs.indexOf(l)}
		<p class="muted crumbs">
			<a href={links.unit(u, o, t)}>{unit.unit_title}</a>
			{#if index >= 0}· Lesson {index + 1} of {refs.length}{/if}
			· {l}
		</p>
		<div class="head">
			<h1>{current.lesson.title}</h1>
			{#if !editing}
				<a class="edit" href={links.lesson(u, l, o, t, true)}>Edit</a>
			{/if}
		</div>

		{#if editing}
			{#key current.path}
				<LessonEditor
					{path}
					lesson={current.lesson}
					sha={current.sha}
					{registry}
					{schemas}
					{repo}
					hasContent={content !== null}
					viewHref={links.lesson(u, l, o, t)}
					onsaved={(lesson, sha) => (saved = { path, lesson, sha })}
				/>
			{/key}
		{:else}
			<LessonView lesson={current.lesson} {registry} {content} />
		{/if}

		{#if !editing}
			<nav class="pager">
				{#if index > 0}
					<a href={links.lesson(u, refs[index - 1], o, t)}>← Previous</a>
				{:else}<span></span>{/if}
				{#if index >= 0 && index < refs.length - 1}
					<a href={links.lesson(u, refs[index + 1], o, t)}>Next →</a>
				{/if}
			</nav>
		{/if}
	{:catch error}
		<Failure {error} />
	{/await}
{/if}

<style>
	.head {
		display: flex;
		gap: 12px;
		align-items: baseline;
		justify-content: space-between;
	}

	.edit {
		background: var(--ink2);
		color: var(--page);
		padding: 5px 14px;
		border-radius: 6px;
		text-decoration: none;
		white-space: nowrap;
	}

	.pager {
		display: flex;
		justify-content: space-between;
		margin-top: 32px;
	}
</style>
