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

	function isSortedAsc(field: SortableField): boolean {
		return sort?.field === field && sort.direction === 'asc';
	}

	function isSortedDesc(field: SortableField): boolean {
		return sort?.field === field && sort.direction === 'desc';
	}
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
					{#if isSortedAsc('id')}
						<ChevronUp class="h-4 w-4" />
					{:else if isSortedDesc('id')}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ArrowUpDown class="h-4 w-4" />
					{/if}
				</button>
			</TableHead>
			<TableHead>
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('function')}
				>
					Function
					{#if isSortedAsc('function')}
						<ChevronUp class="h-4 w-4" />
					{:else if isSortedDesc('function')}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ArrowUpDown class="h-4 w-4" />
					{/if}
				</button>
			</TableHead>
			<TableHead class="w-[100px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('status')}
				>
					Status
					{#if isSortedAsc('status')}
						<ChevronUp class="h-4 w-4" />
					{:else if isSortedDesc('status')}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ArrowUpDown class="h-4 w-4" />
					{/if}
				</button>
			</TableHead>
			<TableHead class="w-[100px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('queue')}
				>
					Queue
					{#if isSortedAsc('queue')}
						<ChevronUp class="h-4 w-4" />
					{:else if isSortedDesc('queue')}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ArrowUpDown class="h-4 w-4" />
					{/if}
				</button>
			</TableHead>
			<TableHead class="w-[140px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('enqueuedAt')}
				>
					Enqueued
					{#if isSortedAsc('enqueuedAt')}
						<ChevronUp class="h-4 w-4" />
					{:else if isSortedDesc('enqueuedAt')}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ArrowUpDown class="h-4 w-4" />
					{/if}
				</button>
			</TableHead>
			<TableHead class="w-[100px]">
				<button
					class="flex items-center gap-1 hover:text-foreground transition-colors"
					onclick={() => handleSort('duration')}
				>
					Duration
					{#if isSortedAsc('duration')}
						<ChevronUp class="h-4 w-4" />
					{:else if isSortedDesc('duration')}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ArrowUpDown class="h-4 w-4" />
					{/if}
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
