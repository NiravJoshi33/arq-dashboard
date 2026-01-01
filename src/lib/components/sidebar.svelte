<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import Button from './ui/button.svelte';
	import { LayoutDashboard, ListTodo, Activity, Settings, Menu, X } from 'lucide-svelte';

	interface Props {
		collapsed?: boolean;
		onToggle?: () => void;
	}

	let { collapsed = false, onToggle }: Props = $props();

	const navItems = [
		{ href: '/', icon: LayoutDashboard, label: 'Dashboard' },
		{ href: '/jobs', icon: ListTodo, label: 'Jobs' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<aside
	class={cn(
		'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
		collapsed ? 'w-16' : 'w-64'
	)}
>
	<!-- Header -->
	<div class="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
		{#if !collapsed}
			<div class="flex items-center gap-2">
				<div class="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
					<Activity class="h-5 w-5 text-primary-foreground" />
				</div>
				<span class="font-semibold text-lg text-sidebar-foreground">ARQ Monitor</span>
			</div>
		{:else}
			<div class="mx-auto h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
				<Activity class="h-5 w-5 text-primary-foreground" />
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="flex flex-col gap-1 p-3">
		{#each navItems as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			<a
				href={item.href}
				class={cn(
					'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
					active
						? 'bg-sidebar-accent text-sidebar-accent-foreground'
						: 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
					collapsed && 'justify-center px-2'
				)}
			>
				<item.icon class="h-5 w-5 shrink-0" />
				{#if !collapsed}
					<span>{item.label}</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Toggle button -->
	<button
		onclick={onToggle}
		class="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
	>
		{#if collapsed}
			<Menu class="h-3.5 w-3.5" />
		{:else}
			<X class="h-3.5 w-3.5" />
		{/if}
	</button>
</aside>

