<script lang="ts">
	import { cn } from '$lib/utils';
	import Button from './ui/button.svelte';
	import Badge from './ui/badge.svelte';
	import { Sun, Moon, Wifi, WifiOff, RefreshCw } from 'lucide-svelte';
	import type { RedisStatus } from '$lib/types';

	interface Props {
		title?: string;
		darkMode?: boolean;
		redisStatus?: RedisStatus;
		onToggleTheme?: () => void;
		onRefresh?: () => void;
		class?: string;
	}

	let {
		title = 'Dashboard',
		darkMode = true,
		redisStatus,
		onToggleTheme,
		onRefresh,
		class: className
	}: Props = $props();

	let isRefreshing = $state(false);

	async function handleRefresh() {
		if (isRefreshing) return;
		isRefreshing = true;
		onRefresh?.();
		setTimeout(() => (isRefreshing = false), 1000);
	}
</script>

<header
	class={cn(
		'sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6',
		className
	)}
>
	<h1 class="text-xl font-semibold">{title}</h1>

	<div class="flex items-center gap-3">
		<!-- Redis status -->
		{#if redisStatus}
			<div class="flex items-center gap-2">
				{#if redisStatus.connected}
					<Badge variant="success" class="flex items-center gap-1">
						<Wifi class="h-3 w-3" />
						Redis
						{#if redisStatus.latency}
							<span class="text-[10px] opacity-75">{redisStatus.latency}ms</span>
						{/if}
					</Badge>
				{:else}
					<Badge variant="destructive" class="flex items-center gap-1">
						<WifiOff class="h-3 w-3" />
						Disconnected
					</Badge>
				{/if}
			</div>
		{/if}

		<!-- Refresh button -->
		{#if onRefresh}
			<Button variant="ghost" size="icon" onclick={handleRefresh} disabled={isRefreshing}>
				<RefreshCw class={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
			</Button>
		{/if}

		<!-- Theme toggle -->
		<Button variant="ghost" size="icon" onclick={onToggleTheme}>
			{#if darkMode}
				<Sun class="h-4 w-4" />
			{:else}
				<Moon class="h-4 w-4" />
			{/if}
		</Button>
	</div>
</header>

