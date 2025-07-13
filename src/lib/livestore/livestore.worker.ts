import { makeWorker } from '@livestore/adapter-web/worker';
// import { makeCfSync } from '@livestore/sync-cf';
import { schema } from './schema.js';

// const url = 'ws://localhost:8787';

makeWorker({
	schema,
	sync: {
		// backend: makeCfSync({ url: url ?? import.meta.env.VITE_LIVESTORE_SYNC_URL }),
		initialSyncOptions: { _tag: 'Blocking', timeout: 5000 }
	}
});
