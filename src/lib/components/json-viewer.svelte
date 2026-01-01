<script lang="ts">
	import { cn, formatBytes } from '$lib/utils';
	import Button from './ui/button.svelte';
	import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-svelte';

	interface Props {
		data: unknown;
		collapsed?: boolean;
		maxSize?: number;
		class?: string;
	}

	let { data, collapsed = false, maxSize = 102400, class: className }: Props = $props();

	let isCollapsed = $state(collapsed);
	let copied = $state(false);

	const jsonString = $derived(JSON.stringify(data, null, 2));
	const byteSize = $derived(new Blob([jsonString]).size);
	const isLarge = $derived(byteSize > maxSize);

	// Auto-collapse if large
	$effect(() => {
		if (isLarge && !isCollapsed) {
			isCollapsed = true;
		}
	});

	async function copyToClipboard() {
		await navigator.clipboard.writeText(jsonString);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}
</script>

<div class={cn('rounded-lg border border-border bg-muted/30', className)}>
	<div class="flex items-center justify-between px-3 py-2 border-b border-border">
		<button
			class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
			onclick={toggleCollapse}
		>
			{#if isCollapsed}
				<ChevronRight class="h-4 w-4" />
			{:else}
				<ChevronDown class="h-4 w-4" />
			{/if}
			<span class="font-mono">{typeof data === 'object' && data !== null ? (Array.isArray(data) ? `Array[${(data as unknown[]).length}]` : `Object{${Object.keys(data).length}}`) : typeof data}</span>
			{#if isLarge}
				<span class="text-warning">({formatBytes(byteSize)})</span>
			{/if}
		</button>

		<Button variant="ghost" size="sm" onclick={copyToClipboard}>
			{#if copied}
				<Check class="h-4 w-4 text-success" />
			{:else}
				<Copy class="h-4 w-4" />
			{/if}
		</Button>
	</div>

	{#if !isCollapsed}
		<pre class="p-3 overflow-auto max-h-[400px] text-sm font-mono text-foreground">{jsonString}</pre>
	{/if}
</div>

