<script lang="ts">
	import { page } from '$app/state';
	import Failure from '#lib/components/Failure.svelte';
	import NewClassForm from '#lib/components/NewClassForm.svelte';
	import PageHead from '#lib/components/PageHead.svelte';
	import { session } from '#lib/session.svelte.ts';

	const load = $derived(
		session.data
			? Promise.all([session.data.offerings(), session.data.units()]).then(
					([offerings, units]) => ({ offerings, units })
				)
			: null
	);
</script>

{#if load}
	{#await load}
		<PageHead title={null} />
		<div class="page"><div class="loading"><span></span><span></span><span></span></div></div>
	{:then { offerings, units }}
		<NewClassForm {offerings} {units} from={page.url.searchParams.get('from')} />
	{:catch error}
		<PageHead title="Could not read the classes" />
		<div class="page"><Failure {error} /></div>
	{/await}
{/if}
