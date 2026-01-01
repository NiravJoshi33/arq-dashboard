import type { PageServerLoad } from './$types';
import { getStats, getQueues } from '$lib/server/arq';

export const load: PageServerLoad = async () => {
	const [stats, queues] = await Promise.all([getStats(), getQueues()]);

	return {
		pageTitle: 'Dashboard',
		stats,
		queues
	};
};

