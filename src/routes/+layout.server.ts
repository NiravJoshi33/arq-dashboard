import type { LayoutServerLoad } from './$types';
import { getRedisStatus } from '$lib/server/redis';

export const load: LayoutServerLoad = async () => {
	const redisStatus = await getRedisStatus();

	return {
		redisStatus
	};
};

