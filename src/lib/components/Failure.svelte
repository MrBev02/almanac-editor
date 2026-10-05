<script lang="ts">
	import { AuthError } from '#lib/domain/repo.ts';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	let { error }: { error: unknown } = $props();

	const auth = $derived(error instanceof AuthError);
	// The browser withdrew access to the folder; the front page offers to reopen it.
	const lost = $derived((error as DOMException)?.name === 'NotAllowedError');

	// A token GitHub no longer accepts is useless; clear it so Settings asks again.
	$effect(() => {
		if (auth) session.close();
		else if (lost) session.suspend();
	});
</script>

<div class="msg warn">
	<div>
		{#if auth}
			GitHub no longer accepts the saved token. <a href={links.settings()}>Add a new one</a>.
		{:else}
			{(error as Error)?.message ?? String(error)}
		{/if}
	</div>
</div>
