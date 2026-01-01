import type { PageServerLoad } from './$types';
import { getJobs, getQueues } from '$lib/server/arq';
import type { JobStatus, JobSort } from '$lib/types';

export const load: PageServerLoad = async ({ url }) => {
	// Parse query params
	const page = parseInt(url.searchParams.get('page') || '1');
	const pageSize = 50;
	const search = url.searchParams.get('search') || undefined;
	const status = url.searchParams.get('status') as JobStatus | undefined;
	const queue = url.searchParams.get('queue') || undefined;
	const sortField = (url.searchParams.get('sort') || 'enqueuedAt') as JobSort['field'];
	const sortDir = (url.searchParams.get('dir') || 'desc') as JobSort['direction'];

	const [jobsResponse, queues] = await Promise.all([
		getJobs(
			{ search, status, queue },
			{ field: sortField, direction: sortDir },
			page,
			pageSize
		),
		getQueues()
	]);

	return {
		pageTitle: 'Jobs',
		...jobsResponse,
		queues,
		filters: {
			search,
			status,
			queue
		},
		sort: {
			field: sortField,
			direction: sortDir
		}
	};
};

