<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { JobTable, JobFilters, Pagination, Card, CardContent } from '$lib/components';
	import type { Job, JobStatus, JobSort } from '$lib/types';

	let { data } = $props();

	function updateUrl(params: Record<string, string | undefined>) {
		const url = new URL($page.url);

		Object.entries(params).forEach(([key, value]) => {
			if (value) {
				url.searchParams.set(key, value);
			} else {
				url.searchParams.delete(key);
			}
		});

		// Reset to page 1 if filters changed
		if (!params.page) {
			url.searchParams.delete('page');
		}

		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	function handleFilterChange(filters: { search?: string; status?: JobStatus | ''; queue?: string }) {
		updateUrl({
			search: filters.search,
			status: filters.status || undefined,
			queue: filters.queue
		});
	}

	function handleSort(sort: JobSort) {
		updateUrl({
			sort: sort.field,
			dir: sort.direction
		});
	}

	function handlePageChange(newPage: number) {
		updateUrl({ page: newPage.toString() });
	}

	function handleJobClick(job: Job) {
		goto(`/jobs/${job.id}`);
	}
</script>

<div class="space-y-6">
	<!-- Filters -->
	<Card>
		<CardContent class="pt-6">
			<JobFilters
				search={data.filters.search || ''}
				status={data.filters.status || ''}
				queue={data.filters.queue || ''}
				queues={data.queues}
				onFilterChange={handleFilterChange}
			/>
		</CardContent>
	</Card>

	<!-- Job Table -->
	<Card>
		<CardContent class="p-0">
			<JobTable
				jobs={data.jobs}
				sort={data.sort}
				onSort={handleSort}
				onJobClick={handleJobClick}
			/>
		</CardContent>
	</Card>

	<!-- Pagination -->
	<Pagination
		page={data.page}
		pageSize={data.pageSize}
		total={data.total}
		onPageChange={handlePageChange}
	/>
</div>

