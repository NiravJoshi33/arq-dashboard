<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableRowElement> {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<tr
	class={cn(
		'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</tr>

