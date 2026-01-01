import type { RequestHandler } from './$types';
import { getStats } from '$lib/server/arq';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	try {
		const stats = await getStats();
		return json(stats);
	} catch (error) {
		console.error('Failed to get stats:', error);
		return json(
			{ error: 'Failed to fetch stats' },
			{ status: 500 }
		);
	}
};

