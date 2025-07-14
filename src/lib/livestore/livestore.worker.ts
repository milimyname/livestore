import { makeWorker } from '@livestore/adapter-web/worker';
import { makeSyncBackend } from '@livestore/sync-electric';
import { schema } from './schema.js';

makeWorker({
	schema,
	sync: {
		backend: makeSyncBackend({ endpoint: '/api/electric' }),
		// initialSyncOptions: { _tag: 'Blocking', timeout: 5000 }
	}
});
