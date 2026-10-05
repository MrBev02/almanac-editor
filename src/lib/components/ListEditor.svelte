<script lang="ts">
	import Icon from './Icon.svelte';
	import { move } from '#lib/domain/lessonEdit.ts';

	let {
		items = $bindable(),
		label,
		addLabel = 'Add'
	}: { items: string[]; label: string; addLabel?: string } = $props();
</script>

<ol class="list">
	{#each items, i (i)}
		<li>
			<span class="n" aria-hidden="true">{i + 1}</span>
			<textarea bind:value={items[i]} rows="1" aria-label="{label} {i + 1}"></textarea>
			<span class="controls">
				<button
					type="button"
					class="quiet icon"
					title="Move up"
					aria-label="Move {label} {i + 1} up"
					disabled={i === 0}
					onclick={() => move(items, i, -1)}><Icon name="up" size={16} /></button
				>
				<button
					type="button"
					class="quiet icon"
					title="Move down"
					aria-label="Move {label} {i + 1} down"
					disabled={i === items.length - 1}
					onclick={() => move(items, i, 1)}><Icon name="down" size={16} /></button
				>
				<button
					type="button"
					class="quiet icon danger"
					title="Remove"
					aria-label="Remove {label} {i + 1}"
					onclick={() => items.splice(i, 1)}><Icon name="close" size={16} /></button
				>
			</span>
		</li>
	{/each}
</ol>
<button type="button" class="add" onclick={() => items.push('')}>
	<Icon name="plus" size={16} />
	{addLabel}
</button>

<style>
	.list {
		list-style: none;
		padding: 0;
		margin: 0 0 10px;
		display: grid;
		gap: 6px;
	}

	.list li {
		display: grid;
		grid-template-columns: 20px minmax(0, 1fr) auto;
		gap: 6px;
		align-items: start;
	}

	.n {
		padding-top: 9px;
		font-size: 13px;
		font-weight: 800;
		color: var(--house-deep);
	}

	.controls {
		display: flex;
		gap: 0;
		padding-top: 3px;
	}

	.danger:hover:not(:disabled) {
		color: var(--warn);
	}

	.add {
		border-style: dashed;
	}

	@media (max-width: 560px) {
		.list li {
			grid-template-columns: 20px minmax(0, 1fr);
		}

		.controls {
			grid-column: 2;
			padding-top: 0;
		}
	}
</style>
