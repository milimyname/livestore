import { createStorePromise, type LiveStoreSchema, type LiveQueryDef } from '@livestore/livestore';
import { onDestroy } from 'svelte';

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

	const cache = new Map<string, () => unknown>();

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
