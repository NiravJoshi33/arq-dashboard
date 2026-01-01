import type { RequestHandler } from './$types';
import { getJobDetails } from '$lib/server/arq';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const job = await getJobDetails(params.id);

		if (!job) {
			return json(
				{ error: 'Job not found' },
				{ status: 404 }
			);
		}

		return json(job);
	} catch (error) {
		console.error('Failed to get job:', error);
		return json(
			{ error: 'Failed to fetch job' },
			{ status: 500 }
		);
	}
};

