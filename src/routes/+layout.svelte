<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { darkMode } from '$lib/stores/theme';
	import Sidebar from '$lib/components/sidebar.svelte';
	import Header from '$lib/components/header.svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	let { children, data } = $props();

	let sidebarCollapsed = $state(false);

	onMount(() => {
		darkMode.init();
	});

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	function handleRefresh() {
		invalidateAll();
	}

	// Get page title from page store data (child routes)
	const pageTitle = $derived(
		($page.data as { pageTitle?: string })?.pageTitle || 'Dashboard'
	);
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
		rel="stylesheet"
	/>
	<title>ARQ Monitor</title>
	<meta name="description" content="Real-time monitoring dashboard for ARQ task queues" />
</svelte:head>

<div class="min-h-screen bg-background">
	<Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

	<div
		class="transition-all duration-300"
		style:margin-left={sidebarCollapsed ? '4rem' : '16rem'}
	>
		<Header
			title={pageTitle}
			darkMode={$darkMode}
			redisStatus={data?.redisStatus}
			onToggleTheme={() => darkMode.toggle()}
			onRefresh={handleRefresh}
		/>

		<main class="p-4">
			{@render children()}
		</main>
	</div>
</div>
