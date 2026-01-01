<script lang="ts">
	import Table from './ui/table.svelte';
	import TableHeader from './ui/table-header.svelte';
	import TableBody from './ui/table-body.svelte';
	import TableRow from './ui/table-row.svelte';
	import TableHead from './ui/table-head.svelte';
	import TableCell from './ui/table-cell.svelte';
	import StatusBadge from './status-badge.svelte';
	import { formatDuration, formatRelativeTime, truncateString } from '$lib/utils';
	import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-svelte';
	import type { Job, JobSort } from '$lib/types';
	import type { Component } from 'svelte';

	interface Props {
		jobs: Job[];
		sort?: JobSort;
		onSort?: (sort: JobSort) => void;
		onJobClick?: (job: Job) => void;
	}

	let { jobs, sort, onSort, onJobClick }: Props = $props();

	type SortableField = 'id' | 'function' | 'queue' | 'status' | 'enqueuedAt' | 'duration';

	function handleSort(field: SortableField) {
		if (!onSort) return;

		const newDirection =
			sort?.field === field && sort.direction === 'desc' ? 'asc' : 'desc';

		onSort({ field, direction: newDirection });
	}

	function getSortIcon(field: SortableField): Component {
		if (sort?.field !== field) return ArrowUpDown;
		return sort.direction === 'asc' ? ChevronUp : ChevronDown;
	}

	const idIcon = $derived(getSortIcon('id'));
	const functionIcon = $derived(getSortIcon('function'));
	const statusIcon = $derived(getSortIcon('status'));
	const queueIcon = $derived(getSortIcon('queue'));
	const enqueuedAtIcon = $derived(getSortIcon('enqueuedAt'));
	const durationIcon = $derived(getSortIcon('duration'));
</script>

<Table>
	<TableHeader>
		<TableRow>
			<TableHead class="w-[200px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('id')}
				>
					Job ID
					<svelte:component this={idIcon} class="h-4 w-4" />
				</button>
			</TableHead>
			<TableHead>
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('function')}
				>
					Function
					<svelte:component this={functionIcon} class="h-4 w-4" />
				</button>
			</TableHead>
			<TableHead class="w-[100px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('status')}
				>
					Status
					<svelte:component this={statusIcon} class="h-4 w-4" />
				</button>
			</TableHead>
			<TableHead class="w-[100px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('queue')}
				>
					Queue
					<svelte:component this={queueIcon} class="h-4 w-4" />
				</button>
			</TableHead>
			<TableHead class="w-[140px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('enqueuedAt')}
				>
					Enqueued
					<svelte:component this={enqueuedAtIcon} class="h-4 w-4" />
				</button>
			</TableHead>
			<TableHead class="w-[100px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('duration')}
				>
					Duration
					<svelte:component this={durationIcon} class="h-4 w-4" />
				</button>
			</TableHead>
		</TableRow>
	</TableHeader>
	<TableBody>
		{#if jobs.length === 0}
			<TableRow>
				<TableCell class="text-center text-muted-foreground py-8" colspan={6}>
					No jobs found
				</TableCell>
			</TableRow>
		{:else}
			{#each jobs as job (job.id)}
				<TableRow
					class="cursor-pointer"
					onclick={() => onJobClick?.(job)}
				>
					<TableCell class="font-mono text-xs">
						{truncateString(job.id, 20)}
					</TableCell>
					<TableCell class="font-medium">
						{job.function}
					</TableCell>
					<TableCell>
						<StatusBadge status={job.status} />
					</TableCell>
					<TableCell class="text-muted-foreground">
						{job.queue}
					</TableCell>
					<TableCell class="text-muted-foreground text-sm">
						{formatRelativeTime(job.enqueuedAt)}
					</TableCell>
					<TableCell class="text-muted-foreground text-sm">
						{job.duration ? formatDuration(job.duration) : '-'}
					</TableCell>
				</TableRow>
			{/each}
		{/if}
	</TableBody>
</Table>
