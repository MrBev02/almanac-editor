<script lang="ts">
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
			<textarea bind:value={items[i]} rows="1" aria-label="{label} {i + 1}"></textarea>
			<span class="controls">
				<button
					type="button"
					class="icon"
					title="Move up"
					aria-label="Move {label} {i + 1} up"
					disabled={i === 0}
					onclick={() => move(items, i, -1)}>↑</button
				>
				<button
					type="button"
					class="icon"
					title="Move down"
					aria-label="Move {label} {i + 1} down"
					disabled={i === items.length - 1}
					onclick={() => move(items, i, 1)}>↓</button
				>
				<button
					type="button"
					class="icon"
					title="Remove"
					aria-label="Remove {label} {i + 1}"
					onclick={() => items.splice(i, 1)}>×</button
				>
			</span>
		</li>
	{/each}
</ol>
<button type="button" onclick={() => items.push('')}>{addLabel}</button>

<style>
	.list {
		padding-left: 22px;
	}

	.list li {
		margin: 6px 0;
	}

	.list li > * {
		vertical-align: top;
	}

	textarea {
		width: calc(100% - 120px);
	}

	.controls {
		display: inline-flex;
		gap: 2px;
		margin-left: 4px;
	}

	@media (max-width: 560px) {
		textarea {
			width: 100%;
		}
		.controls {
			margin: 4px 0 0;
		}
	}
</style>
