<script lang="ts">
	// A unit's syllabus dot points. A point already in the file keeps its id,
	// because lessons link it by id; one a lesson links cannot be removed.
	import Icon from './Icon.svelte';
	import { move } from '#lib/domain/lessonEdit.ts';
	import { blankPoint, type PointDraft } from '#lib/domain/unitEdit.ts';

	let {
		points = $bindable(),
		linked = new Set<string>(),
		framework = ''
	}: {
		points: PointDraft[];
		/** Ids a lesson links. */
		linked?: Set<string>;
		/** For the first new point, when there is none to copy. */
		framework?: string;
	} = $props();

	function add() {
		const last = points.at(-1);
		points.push(last ? blankPoint(last) : { ...blankPoint(), framework });
	}
</script>

{#each points as point, i (i)}
	{@const kept = point.from !== undefined}
	{@const inUse = kept && linked.has(point.id)}
	<div class="point">
		<div class="point-row">
			<label class="field">
				<span>Id</span>
				<input
					type="text"
					bind:value={point.id}
					placeholder="DP-01"
					spellcheck="false"
					readonly={kept}
					title={kept ? 'Lessons link a dot point by its id, so it stays fixed.' : undefined}
				/>
			</label>
			<label class="field">
				<span>Framework</span>
				<input type="text" bind:value={point.framework} list="frameworks" />
			</label>
			<label class="field grow">
				<span>Phase</span>
				<input type="text" bind:value={point.phase} placeholder="Researching and planning" />
			</label>
			<div class="controls">
				<button
					type="button"
					class="quiet icon"
					aria-label="Move dot point {i + 1} up"
					title="Move up"
					disabled={i === 0}
					onclick={() => move(points, i, -1)}><Icon name="up" /></button
				>
				<button
					type="button"
					class="quiet icon"
					aria-label="Move dot point {i + 1} down"
					title="Move down"
					disabled={i === points.length - 1}
					onclick={() => move(points, i, 1)}><Icon name="down" /></button
				>
				<button
					type="button"
					class="quiet icon danger"
					aria-label="Remove dot point {i + 1}"
					title={inUse ? 'Lessons link this dot point. Unlink it first.' : 'Remove dot point'}
					disabled={inUse}
					onclick={() => points.splice(i, 1)}><Icon name="bin" /></button
				>
			</div>
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
<button type="button" onclick={add}><Icon name="plus" size={16} /> Add dot point</button>

<style>
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

	.controls {
		display: flex;
		margin-bottom: 16px;
	}

	input[readonly] {
		color: var(--ink-2);
		background: transparent;
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
</style>
