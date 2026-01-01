<script lang="ts">
	import Badge from './ui/badge.svelte';
	import type { JobStatus } from '$lib/types';

	interface Props {
		status: JobStatus;
		class?: string;
	}

	let { status, class: className }: Props = $props();

	const statusConfig: Record<JobStatus, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default' }> = {
		queued: { label: 'Queued', variant: 'secondary' },
		'in-progress': { label: 'In Progress', variant: 'warning' },
		complete: { label: 'Complete', variant: 'success' },
		failed: { label: 'Failed', variant: 'destructive' }
	};

	const config = $derived(statusConfig[status] || { label: status, variant: 'default' as const });
</script>

<Badge variant={config.variant} class={className}>
	{#if status === 'in-progress'}
		<span class="mr-1 h-2 w-2 animate-pulse rounded-full bg-current"></span>
	{/if}
	{config.label}
</Badge>

