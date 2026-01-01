<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { StatsCard, Card, CardHeader, CardTitle, CardContent, Badge } from '$lib/components';
	import QueueChart from '$lib/components/queue-chart.svelte';
	import SuccessRateChart from '$lib/components/success-rate-chart.svelte';
	import { Clock, CheckCircle, XCircle, Loader2, TrendingUp, Activity } from 'lucide-svelte';

	let { data } = $props();

	let refreshInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		// Auto-refresh every 5 seconds
		refreshInterval = setInterval(() => {
			invalidateAll();
		}, 5000);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	const stats = $derived(data.stats);
</script>

<div class="space-y-6">
	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<StatsCard
			title="Queued"
			value={stats.queued}
			description="Jobs waiting"
			icon={Clock}
			variant="info"
		/>
		<StatsCard
			title="In Progress"
			value={stats.inProgress}
			description="Currently processing"
			icon={Loader2}
			variant="warning"
		/>
		<StatsCard
			title="Completed"
			value={stats.complete}
			description="Successfully finished"
			icon={CheckCircle}
			variant="success"
		/>
		<StatsCard
			title="Failed"
			value={stats.failed}
			description="Execution errors"
			icon={XCircle}
			variant="destructive"
		/>
	</div>

	<!-- Charts Row -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Queue Depth Chart -->
		<Card class="lg:col-span-2">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Activity class="h-5 w-5 text-primary" />
					Queue Depth
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if stats.queues.length > 0}
					<QueueChart queues={stats.queues} />
				{:else}
					<div class="flex h-[300px] items-center justify-center text-muted-foreground">
						No queue data available
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Success Rate -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<TrendingUp class="h-5 w-5 text-success" />
					Success Rate
				</CardTitle>
			</CardHeader>
			<CardContent>
				<SuccessRateChart
					hourRate={stats.successRate.hour}
					dayRate={stats.successRate.day}
				/>
				<div class="mt-4 space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Last Hour</span>
						<Badge variant={stats.successRate.hour >= 95 ? 'success' : stats.successRate.hour >= 80 ? 'warning' : 'destructive'}>
							{stats.successRate.hour.toFixed(1)}%
						</Badge>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Last 24 Hours</span>
						<Badge variant={stats.successRate.day >= 95 ? 'success' : stats.successRate.day >= 80 ? 'warning' : 'destructive'}>
							{stats.successRate.day.toFixed(1)}%
						</Badge>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Queue List -->
	<Card>
		<CardHeader>
			<CardTitle>Active Queues</CardTitle>
		</CardHeader>
		<CardContent>
			{#if stats.queues.length > 0}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each stats.queues as queue}
						<a
							href="/jobs?queue={queue.name}"
							class="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
						>
							<div>
								<p class="font-medium">{queue.name}</p>
								<p class="text-sm text-muted-foreground">
									{queue.depth} queued
								</p>
							</div>
							<Badge variant={queue.depth > 100 ? 'warning' : 'secondary'}>
								{queue.depth}
							</Badge>
						</a>
					{/each}
				</div>
			{:else}
				<p class="text-center text-muted-foreground py-8">
					No active queues found. Make sure Redis is connected and ARQ workers are running.
				</p>
			{/if}
		</CardContent>
	</Card>

	<!-- Last Updated -->
	<p class="text-center text-xs text-muted-foreground">
		Last updated: {stats.lastUpdated.toLocaleTimeString()}
		<span class="ml-2 inline-flex items-center gap-1">
			<span class="h-2 w-2 animate-pulse rounded-full bg-success"></span>
			Auto-refreshing
		</span>
	</p>
</div>
