<script lang="ts">
	// The run sheet drawn as a carnival lane: one segment per section, sized by
	// its minutes, with a finish line at the lesson's length. Talk sections are
	// solid house colour, activity is hatched, unclassified is plain, stretch is
	// outlined. Minutes past the finish line run on into the warning colour.
	import { KIND_LABELS, TIER_LABELS, kindClass } from '#lib/domain/lessonView.ts';
	import type { Kind, Tier } from '#lib/domain/types.ts';

	type Part = {
		label?: string;
		section?: string;
		duration_minutes: number | null;
		kind?: Kind | '';
		tier?: Tier | '';
	};

	let {
		sections,
		nominal,
		compact = false
	}: { sections: Part[]; nominal: number | null; compact?: boolean } = $props();

	const parts = $derived.by(() => {
		let at = 0;
		return sections.map((s, i) => {
			const minutes = Math.max(0, Number(s.duration_minutes) || 0);
			const start = at;
			at += minutes;
			return { ...s, i, minutes, start };
		});
	});
	const total = $derived(parts.reduce((n, p) => n + p.minutes, 0));
	const length = $derived(Number(nominal) || 0);
	const scale = $derived(Math.max(total, length, 1));
	const pct = (minutes: number) => `${(minutes / scale) * 100}%`;
	const ticks = $derived(
		compact ? [] : Array.from({ length: Math.floor(scale / 5) + 1 }, (_, i) => i * 5)
	);
	const over = $derived(length > 0 && total > length);
	const under = $derived(length > 0 && total < length);

	function describe(p: (typeof parts)[number]): string {
		const kind = p.kind ? KIND_LABELS[p.kind] : 'Unclassified';
		const tier = p.tier && p.tier !== 'core' ? `, ${TIER_LABELS[p.tier]}` : '';
		return `${p.label || `Section ${p.i + 1}`}: ${p.minutes} min from ${p.start}, ${kind}${tier}`;
	}
</script>

<div
	class="lane"
	class:compact
	role="img"
	aria-label="Run sheet: {total} of {length || '?'} minutes{over
		? `, ${total - length} over`
		: under
			? `, ${length - total} spare`
			: ''}"
>
	<div class="track">
		{#each parts as p (p.i)}
			{#if p.minutes > 0}
				<div
					class="seg {kindClass(p.kind || undefined) || 'plain'}"
					class:stretch={p.tier === 'stretch'}
					class:late={length > 0 && p.start >= length}
					style:left={pct(p.start)}
					style:width={pct(p.minutes)}
					title={describe(p)}
				>
					{#if !compact}
						<span class="seg-min">{p.minutes}</span>
						<span class="seg-label">{p.label || p.section || ''}</span>
					{/if}
				</div>
			{/if}
		{/each}
		{#if length > 0}
			<div class="finish" class:over style:left={pct(length)}>
				{#if !compact}<span>{length}</span>{/if}
			</div>
		{/if}
	</div>
	{#if ticks.length}
		<div class="ticks" aria-hidden="true">
			{#each ticks as t (t)}
				<span style:left={pct(t)} class:major={t % 15 === 0}>{t % 15 === 0 ? t : ''}</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.lane {
		--lane-h: 64px;
		position: relative;
		padding-right: 18px;
	}

	.lane.compact {
		--lane-h: 12px;
		padding-right: 0;
	}

	.track {
		position: relative;
		height: var(--lane-h);
		background: var(--paper);
		border-top: 1px solid var(--rule-strong);
		border-bottom: 1px solid var(--rule-strong);
	}

	.compact .track {
		background: color-mix(in oklab, var(--rule) 55%, transparent);
		border: 0;
	}

	.seg {
		position: absolute;
		top: 4px;
		bottom: 4px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 5px 7px;
		overflow: hidden;
		container-type: inline-size;
		border-right: 2px solid var(--paper);
		transition:
			left 380ms cubic-bezier(0.22, 1, 0.36, 1),
			width 380ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.compact .seg {
		top: 0;
		bottom: 0;
		padding: 0;
		border-right-width: 1px;
	}

	.seg.talk {
		background: var(--house);
		color: var(--house-on);
	}

	.seg.activity {
		background:
			repeating-linear-gradient(
				135deg,
				color-mix(in oklab, var(--house) 30%, transparent) 0 2px,
				transparent 2px 7px
			),
			var(--house-soft);
		color: var(--house-deep);
	}

	.seg.plain {
		background: var(--rule);
		color: var(--ink-2);
	}

	.seg.stretch {
		background: var(--paper);
		color: var(--house-deep);
		outline: 2px dashed var(--house);
		outline-offset: -2px;
	}

	.seg.late {
		background: var(--warn-soft);
		color: var(--warn-deep);
		outline: 2px solid var(--warn);
		outline-offset: -2px;
	}

	@container (max-width: 64px) {
		.seg-label {
			display: none;
		}
	}

	@container (max-width: 22px) {
		.seg-min {
			display: none;
		}
	}

	.seg-min {
		font-size: 24px;
		font-weight: 800;
		font-stretch: 85%;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.seg-label {
		font-size: 11px;
		font-weight: 600;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.finish {
		position: absolute;
		top: -8px;
		bottom: -8px;
		width: 3px;
		margin-left: -1px;
		background: var(--ink);
		transition: left 380ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.compact .finish {
		top: -3px;
		bottom: -3px;
		width: 2px;
	}

	.finish.over {
		background: var(--warn);
	}

	.finish span {
		position: absolute;
		top: -2px;
		left: 4px;
		font-size: 11px;
		font-weight: 800;
		background: var(--ink);
		color: var(--chalk);
		padding: 0 5px;
		line-height: 16px;
		font-variant-numeric: tabular-nums;
	}

	.finish.over span {
		background: var(--warn);
		color: #fff;
	}

	.ticks {
		position: relative;
		height: 18px;
		font-size: 11px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}

	.ticks span {
		position: absolute;
		top: 0;
		height: 6px;
		border-left: 1px solid var(--rule-strong);
	}

	.ticks span.major {
		height: 16px;
		padding: 4px 0 0 4px;
		line-height: 1;
		border-left-color: var(--ink-2);
	}

	@media (prefers-reduced-motion: reduce) {
		.seg,
		.finish {
			transition: none;
		}
	}
</style>
