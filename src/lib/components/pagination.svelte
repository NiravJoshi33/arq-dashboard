<script lang="ts">
	import Button from './ui/button.svelte';
	import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-svelte';

	interface Props {
		page: number;
		pageSize: number;
		total: number;
		onPageChange?: (page: number) => void;
	}

	let { page, pageSize, total, onPageChange }: Props = $props();

	const totalPages = $derived(Math.ceil(total / pageSize));
	const startItem = $derived((page - 1) * pageSize + 1);
	const endItem = $derived(Math.min(page * pageSize, total));

	function goToPage(newPage: number) {
		if (newPage >= 1 && newPage <= totalPages) {
			onPageChange?.(newPage);
		}
	}
</script>

<div class="flex items-center justify-between px-2">
	<div class="text-sm text-muted-foreground">
		{#if total > 0}
			Showing {startItem} to {endItem} of {total} jobs
		{:else}
			No jobs
		{/if}
	</div>

	<div class="flex items-center gap-1">
		<Button
			variant="outline"
			size="icon"
			disabled={page <= 1}
			onclick={() => goToPage(1)}
		>
			<ChevronsLeft class="h-4 w-4" />
		</Button>
		<Button
			variant="outline"
			size="icon"
			disabled={page <= 1}
			onclick={() => goToPage(page - 1)}
		>
			<ChevronLeft class="h-4 w-4" />
		</Button>

		<span class="px-3 text-sm">
			Page {page} of {totalPages || 1}
		</span>

		<Button
			variant="outline"
			size="icon"
			disabled={page >= totalPages}
			onclick={() => goToPage(page + 1)}
		>
			<ChevronRight class="h-4 w-4" />
		</Button>
		<Button
			variant="outline"
			size="icon"
			disabled={page >= totalPages}
			onclick={() => goToPage(totalPages)}
		>
			<ChevronsRight class="h-4 w-4" />
		</Button>
	</div>
</div>

