<script lang="ts">
	import { cn } from '$lib/utils';
	import Card from './ui/card.svelte';
	import CardHeader from './ui/card-header.svelte';
	import CardTitle from './ui/card-title.svelte';
	import CardContent from './ui/card-content.svelte';

	interface Props {
		title: string;
		value: string | number;
		description?: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
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
	<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-1.5">
		<CardTitle class="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
		{#if Icon}
			<div class={cn('h-4 w-4', iconStyles[variant])}>
				<Icon size={16} strokeWidth={2.5} />
			</div>
		{/if}
	</CardHeader>
	<CardContent class="pt-1">
		<div class="text-2xl font-semibold tracking-tight">{value}</div>
		{#if description || trend}
			<p class="mt-0.5 text-xs text-muted-foreground/80">
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
