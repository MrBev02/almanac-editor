<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { links } from '#lib/links.ts';
	import { session } from '#lib/session.svelte.ts';

	let { children } = $props();

	const onSettings = $derived(page.url.pathname.endsWith('/settings'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Almanac Editor</title>
</svelte:head>

<header>
	<nav>
		<a href={links.home()} class="brand">Almanac</a>
		{#if session.token}
			<span class="muted">{session.target.owner}/{session.target.repo}@{session.target.branch}</span
			>
		{/if}
		<a href={links.settings()} class="right">Settings</a>
	</nav>
</header>

<main>
	{#if session.token || onSettings}
		{@render children()}
	{:else}
		<h1>Almanac Editor</h1>
		<p class="lede">Read and edit lesson plans straight from the data repo.</p>
		<p>
			To start, <a href={links.settings()}>add a GitHub token</a> for the repo that holds your units,
			lessons and offerings.
		</p>
	{/if}
</main>

<style>
	header {
		background: var(--paper);
		border-bottom: 1px solid var(--line);
	}

	nav {
		max-width: 980px;
		margin: 0 auto;
		padding: 10px 16px;
		display: flex;
		gap: 14px;
		align-items: baseline;
		font-size: 14px;
		flex-wrap: wrap;
	}

	.brand {
		font-weight: 700;
		text-decoration: none;
	}

	.right {
		margin-left: auto;
	}

	main {
		max-width: 980px;
		margin: 0 auto;
		padding: 24px 16px 64px;
	}
</style>
