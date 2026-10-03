<script lang="ts">
	import Failure from '#lib/components/Failure.svelte';
	import { subjectOf } from '#lib/domain/layout.ts';
	import { join } from '#lib/domain/paths.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	const load = $derived(
		session.data
			? Promise.all([session.data.units(), session.data.offerings()]).then(([units, offerings]) => {
					const subjects = Object.entries(Object.groupBy(units, (entry) => subjectOf(entry.dir)));
					return { subjects: subjects as [string, typeof units][], offerings };
				})
			: null
	);

	const titleCase = (slug: string) =>
		slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
</script>

<h1>Units and classes</h1>

{#if load}
	{#await load}
		<p class="muted">Reading the repo…</p>
	{:then { subjects, offerings }}
		<h2>Classes</h2>
		<div class="grid">
			{#each offerings as [path, offering] (path)}
				<div class="card">
					<strong>{offering.year_group ?? ''} {offering.class_label ?? ''}</strong>
					<span class="muted">· {offering.year} · {offering.id}</span>
					<ul>
						{#each offering.units as entry, i (i)}
							{@const dir = join(offering.subject, entry.unit)}
							<li>
								<a href={links.unit(dir, path, entry.term)}
									>{titleCase(entry.unit.split('/').pop() ?? '')}</a
								>
								{#if entry.term}<span class="muted">· {entry.term}</span>{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		{#each subjects as [subject, units] (subject)}
			<h2>{titleCase(subject)}</h2>
			<ul>
				{#each units as { dir, unit } (dir)}
					<li>
						<a href={links.unit(dir)}>{unit.unit_title}</a>
						<span class="muted">· {unit.lessons?.length ?? 0} plans</span>
					</li>
				{/each}
			</ul>
		{/each}
	{:catch error}
		<Failure {error} />
	{/await}
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 0 12px;
	}
</style>
