// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { RedisStatus } from '$lib/types';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			pageTitle?: string;
			redisStatus?: RedisStatus;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
