import type { RequestHandler } from './$types';
import { getStats } from '$lib/server/arq';

export const GET: RequestHandler = async ({ request }) => {
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			// Send initial connection event
			controller.enqueue(
				encoder.encode(
					`event: connection\ndata: ${JSON.stringify({ connected: true, timestamp: new Date().toISOString() })}\n\n`
				)
			);

			// Poll interval for updates
			const pollInterval = 2000; // 2 seconds
			let lastStats = await getStats();

			const sendUpdate = async () => {
				try {
					const stats = await getStats();

					// Send stats update
					controller.enqueue(
						encoder.encode(
							`event: stats-update\ndata: ${JSON.stringify({
								...stats,
								lastUpdated: stats.lastUpdated.toISOString()
							})}\n\n`
						)
					);

					lastStats = stats;
				} catch (error) {
					console.error('SSE update error:', error);
					controller.enqueue(
						encoder.encode(
							`event: error\ndata: ${JSON.stringify({ message: 'Failed to fetch stats' })}\n\n`
						)
					);
				}
			};

			// Send initial stats
			await sendUpdate();

			// Set up polling
			const interval = setInterval(sendUpdate, pollInterval);

			// Handle client disconnect
			request.signal.addEventListener('abort', () => {
				clearInterval(interval);
				controller.close();
			});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};

