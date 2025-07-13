import { makeLiveStore } from '$lib/livestore/livestore.svelte';
import { adapter } from '$lib/livestore/adapter';
import { schema } from '$lib/livestore/schema';

export const ssr = false;

export async function load() {
	const liveStore = await makeLiveStore({ schema, adapter, storeId: 'default-id' });
	return { liveStore };
}
