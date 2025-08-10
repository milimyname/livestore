import { ApiSchema, makeElectricUrl } from '@livestore/sync-electric';
import { Schema } from '@livestore/livestore';
import { makeDb } from '$lib/server/db';
import { env } from '$env/dynamic/private';

const electricHost = env.ELECTRIC_HOST ?? 'http://localhost:30000';
const sourceId = env.ELECTRIC_SOURCE_ID ?? 'sourceId';
const apiSecret = env.ELECTRIC_API_SECRET ?? 'change-me-electric-secret';
const sourceSecret = env.ELECTRIC_SOURCE_SECRET ?? 'change-me-electric-secret';

// Client pulls from the server to get the latest mutation events
export async function GET({ request }) {
	const searchParams = new URL(request.url).searchParams;
	const { url, storeId, needsInit, payload } = makeElectricUrl({
		electricHost,
		searchParams,
		// You can also provide a sourceId and sourceSecret for Electric Cloud
		sourceId,
		sourceSecret,
		apiSecret
	});

	if ((payload as any)?.authToken !== 'insecure-token-change-me') {
		return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
			status: 401
		});
	}

	// Here we initialize the database if it doesn't exist yet. You might not need this if you
	// already have the necessary tables created in the database.
	if (needsInit) {
		const db = makeDb(storeId);
		await db.migrate();
		await db.disconnect();
	}

	// We are simply proxying the request to the Electric server but you could implement
	// any custom logic here, e.g. auth, rate limiting, etc.
	return fetch(url);
}

// Client pushes new mutation events to the server
export async function POST({ request }) {
	const payload = await request.json();

	const parsedPayload = Schema.decodeUnknownSync(ApiSchema.PushPayload)(payload);

	const db = makeDb(parsedPayload.storeId);

	await db.migrate();

	await db.createEvents(parsedPayload.batch);

	await db.disconnect();

	return new Response(JSON.stringify({ success: true }));
}
