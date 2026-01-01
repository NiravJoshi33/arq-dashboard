import type { RequestHandler } from './$types';
import { getJobs, getQueues } from '$lib/server/arq';
import { json } from '@sveltejs/kit';
import type { JobStatus, JobSort } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
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

		return json({
			...jobsResponse,
			queues
		});
	} catch (error) {
		console.error('Failed to get jobs:', error);
		return json(
			{ error: 'Failed to fetch jobs' },
			{ status: 500 }
		);
	}
};

