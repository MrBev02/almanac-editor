<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	/**
	 * A modal panel for one quick piece of work, such as marking a lesson taught.
	 * Closing it keeps whatever the owner holds, so nothing typed is lost; the
	 * owner clears its own input once the work is saved. Ctrl+Enter submits.
	 */
	let {
		open = $bindable(false),
		title,
		lede,
		onsubmit,
		children,
		foot
	}: {
		open: boolean;
		title: string;
		lede?: string | null;
		onsubmit: () => void;
		children: Snippet;
		foot: Snippet;
	} = $props();

	let dialog = $state<HTMLDialogElement>();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function onkeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && (event.key === 'Enter' || event.key === 's')) {
			event.preventDefault();
			onsubmit();
		}
	}
</script>

<dialog bind:this={dialog} aria-label={title} onclose={() => (open = false)} {onkeydown}>
	<form
		method="dialog"
		onsubmit={(e) => {
			e.preventDefault();
			onsubmit();
		}}
	>
		<header>
			<div>
				<h2>{title}</h2>
				{#if lede}<p>{lede}</p>{/if}
			</div>
			<button type="button" class="quiet icon" aria-label="Close" onclick={() => (open = false)}>
				<Icon name="close" />
			</button>
		</header>
		<div class="body">{@render children()}</div>
		<footer>{@render foot()}</footer>
	</form>
</dialog>

<style>
	dialog {
		width: min(640px, calc(100vw - 32px));
		max-height: calc(100vh - 64px);
		margin: 8vh auto auto;
		padding: 0;
		border: 0;
		background: var(--paper);
		color: var(--ink);
		box-shadow:
			0 2px 4px rgb(0 0 0 / 0.08),
			0 24px 60px -12px rgb(0 0 0 / 0.35);
	}

	dialog[open] {
		animation: rise 220ms var(--ease);
	}

	dialog::backdrop {
		background: rgb(13 14 17 / 0.45);
		backdrop-filter: blur(2px);
	}

	@keyframes rise {
		from {
			transform: translateY(8px) scale(0.985);
			opacity: 0.6;
		}
	}

	form {
		display: flex;
		flex-direction: column;
		max-height: inherit;
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 18px 16px 14px 20px;
		border-bottom: 2px solid var(--ink);
	}

	h2 {
		margin: 0;
	}

	header p {
		margin: 4px 0 0;
		font-size: 13px;
		color: var(--muted);
	}

	.body {
		padding: 18px 20px 4px;
		overflow-y: auto;
	}

	footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 8px 10px;
		padding: 12px 20px 16px;
		border-top: 1px solid var(--rule);
	}

	@media (prefers-reduced-motion: reduce) {
		dialog[open] {
			animation: none;
		}
	}
</style>
