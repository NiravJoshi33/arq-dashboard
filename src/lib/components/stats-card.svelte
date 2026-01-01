<script lang="ts">
	import { cn } from '$lib/utils';
	import Card from './ui/card.svelte';
	import CardHeader from './ui/card-header.svelte';
	import CardTitle from './ui/card-title.svelte';
	import CardContent from './ui/card-content.svelte';
	import type { Snippet, Component } from 'svelte';

	interface Props {
		title: string;
		value: string | number;
		description?: string;
		icon?: Component;
		trend?: { value: number; isPositive: boolean };
		variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
		class?: string;
	}

	let {
		title,
		value,
		description,
		icon: Icon,
		trend,
		variant = 'default',
		class: className
	}: Props = $props();

	const variantStyles = {
		default: 'border-border',
		success: 'border-success/30 bg-success/5',
		warning: 'border-warning/30 bg-warning/5',
		destructive: 'border-destructive/30 bg-destructive/5',
		info: 'border-info/30 bg-info/5'
	};

	const iconStyles = {
		default: 'text-muted-foreground',
		success: 'text-success',
		warning: 'text-warning',
		destructive: 'text-destructive',
		info: 'text-info'
	};
</script>

<Card class={cn(variantStyles[variant], className)}>
	<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
		<CardTitle class="text-sm font-medium text-muted-foreground">{title}</CardTitle>
		{#if Icon}
			<div class={cn('h-5 w-5', iconStyles[variant])}>
				<Icon size={20} />
			</div>
		{/if}
	</CardHeader>
	<CardContent>
		<div class="text-3xl font-bold tracking-tight">{value}</div>
		{#if description || trend}
			<p class="mt-1 text-xs text-muted-foreground">
				{#if trend}
					<span
						class={cn(
							'font-medium',
							trend.isPositive ? 'text-success' : 'text-destructive'
						)}
					>
						{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
					</span>
					{' '}
				{/if}
				{description || ''}
			</p>
		{/if}
	</CardContent>
</Card>

