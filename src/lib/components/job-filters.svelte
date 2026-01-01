<script lang="ts">
	import Input from './ui/input.svelte';
	import Select from './ui/select.svelte';
	import Button from './ui/button.svelte';
	import { Search, X, Filter } from 'lucide-svelte';
	import type { JobStatus } from '$lib/types';

	interface Props {
		search?: string;
		status?: JobStatus | '';
		queue?: string;
		queues?: string[];
		onFilterChange?: (filters: { search?: string; status?: JobStatus | ''; queue?: string }) => void;
	}

	let {
		search = '',
		status = '',
		queue = '',
		queues = [],
		onFilterChange
	}: Props = $props();

	let localSearch = $state(search);
	let localStatus = $state(status);
	let localQueue = $state(queue);

	function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		localSearch = target.value;
		emitChange();
	}

	function handleStatusChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		localStatus = target.value as JobStatus | '';
		emitChange();
	}

	function handleQueueChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		localQueue = target.value;
		emitChange();
	}

	function clearFilters() {
		localSearch = '';
		localStatus = '';
		localQueue = '';
		emitChange();
	}

	function emitChange() {
		onFilterChange?.({
			search: localSearch || undefined,
			status: localStatus || undefined,
			queue: localQueue || undefined
		});
	}

	const hasFilters = $derived(localSearch || localStatus || localQueue);
</script>

<div class="flex flex-wrap items-center gap-3">
	<div class="relative flex-1 min-w-[200px]">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="text"
			placeholder="Search by job ID or function..."
			value={localSearch}
			oninput={handleSearchInput}
			class="pl-9"
		/>
	</div>

	<Select value={localStatus} onchange={handleStatusChange} class="w-[150px]">
		<option value="">All Status</option>
		<option value="queued">Queued</option>
		<option value="in-progress">In Progress</option>
		<option value="complete">Complete</option>
		<option value="failed">Failed</option>
	</Select>

	<Select value={localQueue} onchange={handleQueueChange} class="w-[150px]">
		<option value="">All Queues</option>
		{#each queues as q}
			<option value={q}>{q}</option>
		{/each}
	</Select>

	{#if hasFilters}
		<Button variant="ghost" size="sm" onclick={clearFilters}>
			<X class="mr-1 h-4 w-4" />
			Clear
		</Button>
	{/if}
</div>

