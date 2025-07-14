import { makeLiveStore } from '$lib/livestore/livestore.svelte';
import { schema } from '$lib/livestore/schema';
import { makePersistedAdapter } from '@livestore/adapter-web';
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker';
import LiveStoreWorker from '$lib/livestore/livestore.worker?worker';

export const ssr = false;

const getStoreId = () => {
	if (typeof window === 'undefined') return 'unused';

	const searchParams = new URLSearchParams(window.location.search);
	const storeId = searchParams.get('storeId');
	if (storeId !== null) return storeId;

	const newAppId = crypto.randomUUID();
	searchParams.set('storeId', newAppId);

	window.location.search = searchParams.toString();
};

export async function load() {
	const storeId = getStoreId();
	const adapter = makePersistedAdapter({
		storage: { type: 'opfs' },
		worker: LiveStoreWorker,
		sharedWorker: LiveStoreSharedWorker
	});

	const liveStore = await makeLiveStore({
		schema,
		adapter,
		syncPayload: { authToken: 'insecure-token-change-me' },
		storeId
	});
	return { liveStore };
}
