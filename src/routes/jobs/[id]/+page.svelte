<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardContent,
		Badge,
		Button,
		StatusBadge,
		JsonViewer
	} from '$lib/components';
	import { formatDuration } from '$lib/utils';
	import { format } from 'date-fns';
	import {
		ArrowLeft,
		Clock,
		Timer,
		AlertTriangle,
		CheckCircle,
		XCircle,
		RotateCcw,
		Hash,
		Layers,
		Calendar
	} from 'lucide-svelte';

	let { data } = $props();

	const job = $derived(data.job);

	function formatDate(date: Date | undefined): string {
		if (!date) return '-';
		return format(date, 'PPpp');
	}
</script>

<div class="space-y-6">
	<!-- Back button -->
	<Button variant="ghost" onclick={() => goto('/jobs')}>
		<ArrowLeft class="mr-2 h-4 w-4" />
		Back to Jobs
	</Button>

	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold">{job.function}</h1>
			<p class="text-sm text-muted-foreground font-mono">{job.id}</p>
		</div>
		<StatusBadge status={job.status} class="text-sm px-3 py-1" />
	</div>

	<!-- Metadata Grid -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardContent class="flex items-center gap-3 pt-6">
				<div class="rounded-lg bg-info/10 p-2">
					<Layers class="h-5 w-5 text-info" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Queue</p>
					<p class="font-medium">{job.queue}</p>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent class="flex items-center gap-3 pt-6">
				<div class="rounded-lg bg-primary/10 p-2">
					<Calendar class="h-5 w-5 text-primary" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Enqueued</p>
					<p class="font-medium text-sm">{formatDate(job.enqueuedAt)}</p>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent class="flex items-center gap-3 pt-6">
				<div class="rounded-lg bg-warning/10 p-2">
					<Timer class="h-5 w-5 text-warning" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Duration</p>
					<p class="font-medium">{job.duration ? formatDuration(job.duration) : '-'}</p>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardContent class="flex items-center gap-3 pt-6">
				<div class="rounded-lg bg-secondary/50 p-2">
					<RotateCcw class="h-5 w-5 text-muted-foreground" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Retries</p>
					<p class="font-medium">{job.retryCount}</p>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Timeline -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Clock class="h-5 w-5" />
				Timeline
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="relative">
				<div class="absolute left-4 top-0 h-full w-0.5 bg-border"></div>
				<div class="space-y-6">
					<!-- Enqueued -->
					<div class="relative flex gap-4">
						<div class="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-info text-info-foreground">
							<Clock class="h-4 w-4" />
						</div>
						<div class="flex-1 pt-1">
							<p class="font-medium">Enqueued</p>
							<p class="text-sm text-muted-foreground">{formatDate(job.enqueuedAt)}</p>
						</div>
					</div>

					<!-- Started -->
					{#if job.startedAt}
						<div class="relative flex gap-4">
							<div class="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-warning text-warning-foreground">
								<Timer class="h-4 w-4" />
							</div>
							<div class="flex-1 pt-1">
								<p class="font-medium">Started</p>
								<p class="text-sm text-muted-foreground">{formatDate(job.startedAt)}</p>
							</div>
						</div>
					{/if}

					<!-- Completed/Failed -->
					{#if job.completedAt}
						<div class="relative flex gap-4">
							{#if job.status === 'complete'}
								<div class="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
									<CheckCircle class="h-4 w-4" />
								</div>
							{:else}
								<div class="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
									<XCircle class="h-4 w-4" />
								</div>
							{/if}
							<div class="flex-1 pt-1">
								<p class="font-medium">{job.status === 'complete' ? 'Completed' : 'Failed'}</p>
								<p class="text-sm text-muted-foreground">{formatDate(job.completedAt)}</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Arguments -->
	<Card>
		<CardHeader>
			<CardTitle>Arguments</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				{#if job.args.length > 0}
					<div>
						<p class="text-sm font-medium text-muted-foreground mb-2">Positional Arguments</p>
						<JsonViewer data={job.args} />
					</div>
				{/if}

				{#if Object.keys(job.kwargs).length > 0}
					<div>
						<p class="text-sm font-medium text-muted-foreground mb-2">Keyword Arguments</p>
						<JsonViewer data={job.kwargs} />
					</div>
				{/if}

				{#if job.args.length === 0 && Object.keys(job.kwargs).length === 0}
					<p class="text-muted-foreground">No arguments</p>
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Result -->
	{#if job.status === 'complete' && job.result !== undefined}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CheckCircle class="h-5 w-5 text-success" />
					Result
				</CardTitle>
			</CardHeader>
			<CardContent>
				<JsonViewer data={job.result} />
			</CardContent>
		</Card>
	{/if}

	<!-- Error -->
	{#if job.status === 'failed' && (job.error || job.stackTrace)}
		<Card class="border-destructive/50">
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-destructive">
					<AlertTriangle class="h-5 w-5" />
					Error Details
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if job.error}
					<div>
						<p class="text-sm font-medium text-muted-foreground mb-2">Error Message</p>
						<div class="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
							<p class="font-mono text-sm text-destructive">{job.error}</p>
						</div>
					</div>
				{/if}

				{#if job.stackTrace}
					<div>
						<p class="text-sm font-medium text-muted-foreground mb-2">Stack Trace</p>
						<pre class="rounded-lg bg-muted/50 p-4 overflow-auto max-h-[400px] text-xs font-mono text-foreground whitespace-pre-wrap">{job.stackTrace}</pre>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>

