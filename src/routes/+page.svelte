<script lang="ts">
	import ColourPicker from '#lib/components/ColourPicker.svelte';
	import Failure from '#lib/components/Failure.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import PageHead from '#lib/components/PageHead.svelte';
	import { subjectOf } from '#lib/domain/layout.ts';
	import { join } from '#lib/domain/paths.ts';
	import { className, houseMap, houseOf, humanise, termParts, titleCase } from '#lib/house.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	const load = $derived(
		session.data
			? Promise.all([session.data.units(), session.data.offerings()]).then(([units, offerings]) => {
					const subjects = Object.entries(Object.groupBy(units, (entry) => subjectOf(entry.dir)));
					const plans = units.reduce((n, e) => n + (e.unit.lessons?.length ?? 0), 0);
					return { units, subjects: subjects as [string, typeof units][], offerings, plans };
				})
			: null
	);

	// Colours fixed since the page loaded, so the bands change without a reload.
	let chosen = $state<Record<string, string | null>>({});
</script>

{#if load}
	{#await load}
		<PageHead title={null} />
		<div class="page"><div class="loading"><span></span><span></span><span></span></div></div>
	{:then { units, subjects, offerings, plans }}
		{@const colourOf = (path: string, colour: unknown) =>
			path in chosen ? chosen[path] : typeof colour === 'string' ? colour : null}
		{@const houses = houseMap(offerings.map(([p, o]) => [p, { colour: colourOf(p, o.colour) }]))}
		{@const unitOf = (dir: string) => units.find((e) => e.dir === dir)?.unit}
		<PageHead
			title="Your classes"
			lede="{offerings.length} classes, {units.length} units and {plans} lesson plans in {session.label}."
		>
			{#snippet actions()}
				{#if session.demo}
					<a class="btn solid" href={links.settings()}>Use your own lessons</a>
				{/if}
			{/snippet}
		</PageHead>

		<div class="page">
			{#if session.demo}
				<div class="msg note">
					<div>
						You are looking at made-up sample lessons. Edits work, but stay in this tab. Press
						<kbd>/</kbd> to jump to anything.
					</div>
				</div>
			{/if}

			{#if offerings.length === 0}
				<p class="muted">There are no classes in <code>offerings/</code> yet.</p>
			{/if}

			<ul class="classes">
				{#each offerings as [path, offering] (path)}
					<li class="class" data-house={houseOf(path, houses)}>
						<div class="tag">
							<a
								class="tag-link"
								href={offering.units[0]
									? links.unit(
											join(offering.subject, offering.units[0].unit),
											path,
											offering.units[0].term
										)
									: links.home()}
							>
								<span class="yr">{offering.year_group ?? className(offering)}</span>
								<span class="cl">{offering.class_label ?? ''}</span>
								<span class="id">{offering.id} · {offering.year}</span>
							</a>
							<ColourPicker
								{path}
								name={className(offering)}
								fixed={colourOf(path, offering.colour)}
								onsaved={(colour) => (chosen[path] = colour)}
							/>
						</div>
						<ol class="units">
							{#each offering.units as entry, i (i)}
								{@const dir = join(offering.subject, entry.unit)}
								{@const unit = unitOf(dir)}
								{@const count = entry.lessons?.length ?? unit?.lessons?.length ?? 0}
								{@const parts = termParts(entry.term)}
								<li>
									<a href={links.unit(dir, path, entry.term)}>
										<span
											class="term"
											class:long={parts.length > 1 || (parts[0]?.length ?? 0) > 3}
											title={entry.term ?? 'Unscheduled'}
										>
											{#each parts as part, i (i)}<span>{part}</span>{:else}–{/each}
										</span>
										<span class="title"
											>{unit?.unit_title ?? humanise(entry.unit.split('/').pop() ?? '')}</span
										>
										<span class="count">
											<strong>{count}</strong>
											{count === 1 ? 'lesson' : 'lessons'}
											{#if entry.duration_weeks}· {entry.duration_weeks} wks{/if}
										</span>
									</a>
								</li>
							{/each}
						</ol>
					</li>
				{/each}
			</ul>

			<div class="section-h">
				<h2>Every unit</h2>
				<p>Each unit’s full set of plans, in the unit’s own order.</p>
			</div>
			<div class="subjects">
				{#each subjects as [subject, list] (subject)}
					<section>
						<h3>{titleCase(subject)}</h3>
						<ul>
							{#each list as { dir, unit } (dir)}
								<li>
									<a href={links.unit(dir)}>
										<span>{unit.unit_title}</span>
										<span class="n">{unit.lessons?.length ?? 0}</span>
										<Icon name="right" size={16} />
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		</div>
	{:catch error}
		<PageHead title="Could not read the repo" />
		<div class="page"><Failure {error} /></div>
	{/await}
{/if}

<style>
	.classes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 14px;
	}

	.class {
		display: grid;
		grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
		background: var(--house);
		color: var(--house-on);
		padding: 6px 6px 6px 0;
	}

	.tag {
		display: flex;
		flex-direction: column;
		padding: 18px 20px;
		background: var(--house);
		color: var(--house-on);
	}

	.tag-link {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		text-decoration: none;
	}

	.tag-link:hover .yr {
		text-decoration: underline;
		text-decoration-thickness: 3px;
	}

	.yr {
		font-size: 34px;
		font-weight: 900;
		font-stretch: 70%;
		line-height: 0.95;
		letter-spacing: -0.02em;
	}

	.cl {
		font-size: 15px;
		font-weight: 700;
	}

	.id {
		margin-top: auto;
		padding-top: 14px;
		font-size: 12px;
		opacity: 0.8;
	}

	.units {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 4px;
		align-content: start;
	}

	.units a {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		grid-template-rows: auto 1fr;
		gap: 2px 14px;
		height: 100%;
		padding: 14px 16px;
		text-decoration: none;
		background: var(--paper);
		color: var(--ink);
		transition: background-color 160ms var(--ease);
	}

	.units a:hover {
		background: var(--house-soft);
	}

	.term {
		grid-row: span 2;
		display: flex;
		flex-direction: column;
		min-width: 2ch;
		font-size: 34px;
		font-weight: 900;
		font-stretch: 70%;
		line-height: 0.85;
		color: var(--house);
	}

	/* Two terms, or a term with its year: stacked, smaller, still in the cell. */
	.term.long {
		gap: 4px;
		font-size: 17px;
		line-height: 1;
		max-width: 7ch;
	}

	.title {
		font-size: 17px;
		font-weight: 750;
		font-stretch: 88%;
		line-height: 1.2;
	}

	.count {
		align-self: end;
		padding-top: 6px;
		font-size: 13px;
		color: var(--muted);
	}

	.count strong {
		color: var(--ink);
	}

	.subjects {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 18px 32px;
	}

	.subjects h3 {
		padding-bottom: 8px;
		border-bottom: 2px solid var(--ink);
	}

	.subjects ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.subjects a {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: 12px;
		align-items: center;
		padding: 10px 2px;
		border-bottom: 1px solid var(--rule);
		text-decoration: none;
		font-weight: 600;
	}

	.subjects a:hover {
		background: var(--sunk);
	}

	.n {
		font-size: 13px;
		color: var(--muted);
		font-weight: 500;
	}

	@media (max-width: 640px) {
		.class {
			grid-template-columns: 1fr;
		}

		.class {
			padding: 0 6px 6px;
		}

		.tag {
			padding: 16px 14px;
		}

		.tag-link {
			flex-direction: row;
			align-items: baseline;
			flex-wrap: wrap;
			gap: 4px 10px;
		}

		.id {
			margin: 0 0 0 auto;
			padding: 0;
		}
	}
</style>
