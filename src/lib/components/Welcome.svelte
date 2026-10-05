<script lang="ts">
	// The signed-out front door. It shows the product doing its job (classes in
	// their house colours, a run sheet as a lane) with sample data, and offers
	// the two ways in: your own repo, or a look around the sample lessons.
	import { goto } from '$app/navigation';
	import Icon from './Icon.svelte';
	import Lane from './Lane.svelte';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	const classes = [
		{ house: 'cobalt', yr: 'Year 7', cl: 'Class A', unit: 'Designing everyday products' },
		{ house: 'emerald', yr: 'Year 8', cl: 'Class B', unit: 'Simple circuits' },
		{ house: 'ruby', yr: 'Year 9', cl: 'Media elective', unit: 'Stop-motion storytelling' },
		{ house: 'saffron', yr: 'Year 10', cl: 'Class 2', unit: 'Designing everyday products' }
	];

	const sample = [
		{ label: 'Hook', section: '', duration_minutes: 5, kind: 'discussion' as const },
		{
			label: 'Design is a choice',
			section: '',
			duration_minutes: 10,
			kind: 'instruction' as const
		},
		{ label: 'Rank the table', section: '', duration_minutes: 20, kind: 'practice' as const },
		{ label: 'Share the rules', section: '', duration_minutes: 15, kind: 'discussion' as const },
		{
			label: 'Stretch',
			section: '',
			duration_minutes: 5,
			kind: 'practice' as const,
			tier: 'stretch' as const
		},
		{ label: 'Exit', section: '', duration_minutes: 5, kind: 'review' as const }
	];

	async function tryIt() {
		session.startDemo();
		await goto(links.home());
	}
</script>

<div class="welcome">
	<section class="pitch">
		<p class="mark">Almanac</p>
		<h1>Fix the lesson once.<br />Every deck and workbook follows.</h1>
		<p class="lede">
			Almanac edits the lesson plans in your git repo. Find any lesson in two keystrokes, change the
			wording or the timings, and save. Each save is a commit, so nothing is ever lost and the
			slides, workbooks and plans built from it stay in step.
		</p>
		<div class="ways">
			<a class="btn primary" href={links.settings()}>
				Connect your repo
				<Icon name="right" size={16} />
			</a>
			<button onclick={tryIt}> Look around with sample lessons </button>
		</div>
		<ul class="facts">
			<li>
				<strong>Your files stay yours.</strong> The repo can be private; the token only reaches that one
				repo.
			</li>
			<li><strong>Nothing to install.</strong> It runs in the browser and talks only to GitHub.</li>
			<li><strong>Byte for byte.</strong> Saved files match what the repo’s own scripts write.</li>
		</ul>
	</section>

	<section class="show" aria-label="What it looks like, with sample classes">
		<ul class="bands">
			{#each classes as c, i (i)}
				<li data-house={c.house} style:--i={i}>
					<span class="yr">{c.yr}</span>
					<span class="cl">{c.cl}</span>
					<span class="unit">{c.unit}</span>
				</li>
			{/each}
		</ul>
		<div class="card" data-house="cobalt">
			<div class="card-head">
				<span class="num">01</span>
				<div>
					<p class="small">Year 7 Class A · Term 1</p>
					<p class="title">What makes good design?</p>
				</div>
			</div>
			<Lane sections={sample} nominal={60} />
			<p class="legend">
				<span class="k talk"></span> Talk
				<span class="k act"></span> Activity
				<span class="k str"></span> Stretch
				<span class="finish">60 min finish line</span>
			</p>
		</div>
	</section>
</div>

<style>
	.welcome {
		min-height: 100vh;
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
		background: var(--rail);
		color: var(--rail-ink);
	}

	.pitch {
		padding: clamp(32px, 7vw, 96px) clamp(20px, 6vw, 80px);
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.mark {
		font-weight: 900;
		font-stretch: 72%;
		font-size: 30px;
		letter-spacing: -0.02em;
		margin: 0 0 clamp(28px, 6vh, 64px);
	}

	h1 {
		font-size: clamp(40px, 5.4vw, 78px);
		font-weight: 900;
		font-stretch: 70%;
		line-height: 0.92;
		letter-spacing: -0.03em;
		max-width: 13ch;
	}

	.lede {
		margin: 28px 0 0;
		font-size: 18px;
		line-height: 1.55;
		max-width: 52ch;
		color: #c9ccc5;
	}

	.ways {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 32px;
	}

	.ways .btn,
	.ways button {
		min-height: 48px;
		padding: 0 20px;
		font-size: 16px;
	}

	.ways .primary {
		--house: #f3f4f0;
		--house-on: #15171c;
		--house-deep: #ffffff;
	}

	.ways button {
		background: transparent;
		color: var(--rail-ink);
		border-color: #4a4d55;
	}

	.ways button:hover:not(:disabled) {
		border-color: var(--rail-ink);
	}

	.facts {
		list-style: none;
		padding: 0;
		margin: 44px 0 0;
		display: grid;
		gap: 10px;
		font-size: 14px;
		color: #a9ada6;
		max-width: 56ch;
	}

	.facts strong {
		color: var(--rail-ink);
	}

	.show {
		position: relative;
		background: var(--chalk);
		color: var(--ink);
		padding: clamp(32px, 6vw, 72px) clamp(20px, 4vw, 56px);
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 28px;
		overflow: hidden;
	}

	.bands {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
	}

	.bands li {
		display: grid;
		grid-template-columns: auto auto 1fr;
		align-items: baseline;
		gap: 10px;
		padding: 14px 18px;
		background: var(--house);
		color: var(--house-on);
		margin-right: calc(var(--i) * 18px);
		animation: slide 700ms var(--ease) both;
		animation-delay: calc(var(--i) * 70ms);
	}

	@keyframes slide {
		from {
			transform: translateX(-24px);
		}
	}

	.yr {
		font-weight: 850;
		font-stretch: 75%;
		font-size: 24px;
		line-height: 1;
	}

	.cl {
		font-size: 14px;
		font-weight: 600;
		opacity: 0.85;
	}

	.unit {
		justify-self: end;
		font-size: 13px;
		opacity: 0.85;
		text-align: right;
	}

	.card {
		background: var(--paper);
		padding: 20px 20px 14px;
		box-shadow: var(--shadow);
	}

	.card-head {
		display: flex;
		gap: 14px;
		align-items: flex-end;
		margin-bottom: 18px;
	}

	.num {
		font-size: 64px;
		font-weight: 900;
		font-stretch: 70%;
		line-height: 0.8;
		color: var(--house);
		letter-spacing: -0.04em;
	}

	.small {
		margin: 0;
		font-size: 12px;
		font-weight: 700;
		color: var(--muted);
	}

	.title {
		margin: 2px 0 0;
		font-size: 22px;
		font-weight: 850;
		font-stretch: 78%;
		line-height: 1.05;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 8px;
		margin: 6px 0 0;
		font-size: 12px;
		color: var(--muted);
	}

	.k {
		width: 14px;
		height: 10px;
		margin-left: 6px;
	}

	.k:first-child {
		margin-left: 0;
	}

	.k.talk {
		background: var(--house);
	}

	.k.act {
		background:
			repeating-linear-gradient(
				135deg,
				color-mix(in oklab, var(--house) 35%, transparent) 0 2px,
				transparent 2px 5px
			),
			var(--house-soft);
	}

	.k.str {
		outline: 2px dashed var(--house);
		outline-offset: -2px;
	}

	.finish {
		margin-left: auto;
		font-weight: 700;
		color: var(--ink);
	}

	@media (max-width: 899px) {
		.welcome {
			grid-template-columns: 1fr;
		}

		.bands li {
			margin-right: calc(var(--i) * 8px);
			grid-template-columns: auto 1fr;
		}

		.unit {
			display: none;
		}
	}
</style>
