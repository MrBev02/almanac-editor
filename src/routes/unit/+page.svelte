<script lang="ts">
	import { page } from '$app/state';
	import Failure from '#lib/components/Failure.svelte';
	import { lessonRefs, offeringEntries } from '#lib/domain/offerings.ts';
	import { join } from '#lib/domain/paths.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	const u = $derived(page.url.searchParams.get('u') ?? '');
	const o = $derived(page.url.searchParams.get('o'));
	const t = $derived(page.url.searchParams.get('t'));

	const load = $derived.by(() => {
		const data = session.data;
		if (!data || !u) return null;
		return (async () => {
			const [unit, offerings] = await Promise.all([data.unit(u), data.offerings()]);
			const offering = o ? (offerings.find(([path]) => path === o)?.[1] ?? null) : null;
			if (o && !offering) throw new Error(`${o} is not an offering in this repo.`);
			const refs = lessonRefs(u, unit, offering, t);
			const lessons = await Promise.all(
				refs.map(async (ref) => {
					try {
						return { ref, lesson: (await data.lesson(join(u, ref))).doc };
					} catch {
						return { ref, lesson: null };
					}
				})
			);
			return { unit, offering, lessons, entries: offeringEntries(u, offerings) };
		})();
	});
</script>

{#if !u}
	<div class="warn">No unit given.</div>
{:else if load}
	{#await load}
		<p class="muted">Reading the unit…</p>
	{:then { unit, offering, lessons, entries }}
		<p class="muted">{u}</p>
		<h1>{unit.unit_title}</h1>
		{#if unit.description}<p class="lede">{unit.description}</p>{/if}

		<nav class="views" aria-label="Lesson order">
			<a href={links.unit(u)} aria-current={!o ? 'page' : undefined}>Every plan</a>
			{#each entries as entry, i (i)}
				<a
					href={links.unit(u, entry.path, entry.term)}
					aria-current={o === entry.path && t === entry.term ? 'page' : undefined}
				>
					{entry.offering.id}{entry.term ? ` · ${entry.term}` : ''}
				</a>
			{/each}
		</nav>

		<h2>
			{offering ? `Lessons for ${offering.id}${t ? `, ${t}` : ''}` : 'Every plan in the unit'}
		</h2>
		<ol class="lessons">
			{#each lessons as { ref, lesson } (ref)}
				<li>
					{#if lesson}
						<a href={links.lesson(u, ref, o, t)}>{lesson.title}</a>
						<span class="muted">· {lesson.duration_minutes} min · {ref}</span>
					{:else}
						<span class="warn">{ref} is listed but not in the repo.</span>
					{/if}
				</li>
			{/each}
		</ol>
	{:catch error}
		<Failure {error} />
	{/await}
{/if}

<style>
	.views {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 12px 0;
	}

	.views a {
		font-size: 13px;
		padding: 3px 10px;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--paper);
		text-decoration: none;
	}

	.views a[aria-current='page'] {
		background: var(--ink2);
		color: var(--page);
		border-color: var(--ink2);
	}

	.lessons li {
		margin: 4px 0;
	}
</style>
