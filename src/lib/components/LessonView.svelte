<script lang="ts">
	import {
		DIFFERENTIATION_LABELS,
		KIND_LABELS,
		TIER_LABELS,
		kindClass,
		startTimes,
		timing
	} from '#lib/domain/lessonView.ts';
	import type { Lesson, RegistryEntry } from '#lib/domain/types.ts';

	let {
		lesson,
		registry,
		content
	}: { lesson: Lesson; registry: Map<string, RegistryEntry>; content: string | null } = $props();

	const t = $derived(timing(lesson));
	const starts = $derived(startTimes(lesson.sections.map((s) => s.duration_minutes)));
	const differentiation = $derived(
		Object.entries(DIFFERENTIATION_LABELS).filter(
			([key]) => lesson.differentiation?.[key as keyof typeof DIFFERENTIATION_LABELS]
		)
	);
</script>

<p class="lede">{lesson.description}</p>
<p>
	<span class="pill talk">{t.talk} min talk</span>
	<span class="pill activity">{t.activity} min activity</span>
	{#if t.other}<span class="pill">{t.other} min unclassified</span>{/if}
</p>
{#if t.nominal && t.total !== t.nominal}
	<div class="warn">Sections add up to {t.total} minutes; the lesson is {t.nominal}.</div>
{/if}

{#if lesson.summary}
	<h2>Summary</h2>
	<p>{lesson.summary}</p>
{/if}

<h2>Run sheet</h2>
<div class="scroll">
	<table>
		<thead><tr><th>Min</th><th>At</th><th>Section</th><th>Kind</th></tr></thead>
		<tbody>
			{#each lesson.sections as s, i (i)}
				<tr class:stretch={s.tier === 'stretch'}>
					<td class="num">{s.duration_minutes}</td>
					<td class="num muted">{starts[i]}</td>
					<td>
						{#if s.label}<strong>{s.label}</strong><br />{/if}
						{s.section}
					</td>
					<td>
						<span class="pill {kindClass(s.kind)}"
							>{s.kind ? KIND_LABELS[s.kind] : 'Unclassified'}</span
						>
						{#if s.tier && s.tier !== 'core'}<span class="pill">{TIER_LABELS[s.tier]}</span>{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<h2>Learning intentions</h2>
<ul>
	{#each lesson.learning_intentions as item, i (i)}<li>{item}</li>{/each}
</ul>

<h2>Success criteria</h2>
<ul>
	{#each lesson.success_criteria as item, i (i)}<li>{item}</li>{/each}
</ul>

<h2>Syllabus dot points</h2>
<div class="scroll">
	<table>
		<thead><tr><th>Id</th><th>Dot point</th><th>Coverage</th><th>Note</th></tr></thead>
		<tbody>
			{#each lesson.curriculum_links as link, i (i)}
				<tr>
					<td>{link.id}</td>
					<td>
						{#if registry.get(link.id)}{registry.get(link.id)?.text}{:else}<span class="warn"
								>Not in the unit's registry</span
							>{/if}
					</td>
					<td>{link.coverage}, {link.mode}</td>
					<td class="muted">{link.note ?? ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if lesson.assessment?.formative || lesson.assessment?.evidence?.length}
	<h2>Assessment</h2>
	{#if lesson.assessment.formative}<p>{lesson.assessment.formative}</p>{/if}
	{#if lesson.assessment.evidence?.length}
		<h3>Evidence</h3>
		<ul>
			{#each lesson.assessment.evidence as item, i (i)}<li>{item}</li>{/each}
		</ul>
	{/if}
{/if}

{#if differentiation.length}
	<h2>Differentiation</h2>
	<dl>
		{#each differentiation as [key, label] (key)}
			<dt>{label}</dt>
			<dd>{lesson.differentiation?.[key as keyof typeof DIFFERENTIATION_LABELS]}</dd>
		{/each}
	</dl>
{/if}

{#if lesson.feedback?.length}
	<h2>Feedback for next time</h2>
	<ul>
		{#each lesson.feedback as f, i (i)}
			<li>
				{f.issue}
				{#if f.offering}<span class="pill">{f.offering}</span>{/if}
				{#if f.change}<br /><span class="muted">Change: {f.change}</span>{/if}
			</li>
		{/each}
	</ul>
{/if}

{#if lesson.resources?.length}
	<h2>Resources</h2>
	<ul>
		{#each lesson.resources as r, i (i)}
			<li>
				{#if r.url}<a href={r.url} target="_blank" rel="noreferrer">{r.name}</a>{:else}{r.name}{/if}
				{#if r.canvas}<span class="pill">Canvas: {r.canvas}</span>{/if}
				{#if r.file}<span class="pill">File: {r.file}</span>{/if}
				{#if r.notes}<br /><span class="muted">{r.notes}</span>{/if}
			</li>
		{/each}
	</ul>
{/if}

<h2>Content file</h2>
{#if content === null}
	<p class="muted">No content file written yet.</p>
{:else}
	<details>
		<summary>Show the content file</summary>
		<pre>{content}</pre>
	</details>
{/if}

<style>
	.stretch {
		opacity: 0.6;
	}
</style>
