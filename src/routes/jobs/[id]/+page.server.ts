import type { PageServerLoad } from './$types';
import { getJobDetails } from '$lib/server/arq';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const job = await getJobDetails(params.id);

	if (!job) {
		throw error(404, {
			message: 'Job not found'
		});
	}

	return {
		pageTitle: `Job: ${job.function}`,
		job
	};
};

