import { createStorePromise, type LiveStoreSchema, type LiveQueryDef } from '@livestore/livestore';
import { onDestroy } from 'svelte';
import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
import { makePersistedAdapter } from '@livestore/adapter-web';
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker';
import LiveStoreWorker from './livestore.worker?worker';
import { schema } from './schema.js';

export type LiveStore<S extends LiveStoreSchema> = Awaited<
	ReturnType<typeof createStorePromise<S>>
> & {
	useQuery: <Q extends LiveQueryDef.Any>(
		q: Q
	) => () => ReturnType<ReturnType<Q['make']>['value']['run']>;
};

export async function makeLiveStore<S extends LiveStoreSchema>(
	...args: Parameters<typeof createStorePromise<S>>
) {
	const core = await createStorePromise<S>(...args);

	const cache = new SvelteMap<string, () => unknown>();

	function useQuery<Q extends LiveQueryDef.Any>(def: Q) {
		const key = def.label;
		if (cache.has(key)) return cache.get(key)!;

		const query = def.make(core.reactivityGraph.context!).value;
		let value = $state(query.run({})); // ✅ use query.run(...)
		const unsub = core.subscribe(query, {
			onUpdate: (v) => (value = v),
			label: def.label
		});

		onDestroy(unsub);

		const getter = () => value;
		cache.set(key, getter);
		return getter;
	}

	return Object.assign(core, { useQuery }) as LiveStore<S>;
}

// Store the instance
let storeInstance: LiveStore<typeof schema> | null = null;
let initPromise: Promise<LiveStore<typeof schema>> | null = null;

export function initializeLiveStore(options?: {
	storeId?: string;
	authToken?: string;
	forceNew?: boolean;
}): Promise<LiveStore<typeof schema>> {
	// Force new instance if requested
	if (options?.forceNew) {
		storeInstance = null;
		initPromise = null;
	}

	// Return existing instance
	if (storeInstance) return Promise.resolve(storeInstance);

	// Return ongoing initialization
	if (initPromise) return initPromise;

	// Start new initialization
	initPromise = createStore(options).then((store) => {
		storeInstance = store;
		return store;
	});

	return initPromise;
}

/**
 * Get current store instance (sync)
 */
export function getStore(): LiveStore<typeof schema> | null {
	return storeInstance;
}

/**
 * Internal: Create the actual store
 */
async function createStore(options?: {
	storeId?: string;
	authToken?: string;
}): Promise<LiveStore<typeof schema>> {
	// Get or generate store ID
	const storeId = options?.storeId || getStoreId();

	// Get auth token
	const authToken = options?.authToken || getAuthToken();

	// Create adapter
	const adapter = makePersistedAdapter({
		storage: { type: 'opfs' }, // or 'indexeddb' for better browser support
		worker: LiveStoreWorker,
		sharedWorker: LiveStoreSharedWorker
	});

	// Create and return store
	return await makeLiveStore({
		schema,
		adapter,
		syncPayload: { authToken },
		storeId
	});
}

// ============================================
// 2. REACTIVE WRAPPER FOR SVELTE
// ============================================

/**
 * Create a reactive LiveStore for use in Svelte components
 */
export function createReactiveLiveStore(options?: { storeId?: string; authToken?: string }) {
	let store = $state<LiveStore<typeof schema> | null>(null);
	let loading = $state(true);
	let error = $state<Error | null>(null);

	// Initialize
	initializeLiveStore(options)
		.then((s) => {
			store = s;
			loading = false;
		})
		.catch((e) => {
			error = e;
			loading = false;
		});

	return {
		get store() {
			return store;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get ready() {
			return !loading && store !== null;
		}
	};
}

// ============================================
// 3. HELPER FUNCTIONS
// ============================================

/**
 * Get or create store ID from URL
 */
const getStoreId = () => {
	if (typeof window === 'undefined') return 'unused';

	const searchParams = new SvelteURLSearchParams(window.location.search);
	const storeId = searchParams.get('storeId');
	console.log({ storeId });
	if (storeId !== null) return storeId;

	const newAppId = crypto.randomUUID();
	searchParams.set('storeId', newAppId);

	window.location.search = searchParams.toString();
};

/**
 * Get auth token
 */
function getAuthToken(): string {
	if (typeof window === 'undefined') return 'server-token';

	// Try different sources
	return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || 'anonymous';
}
