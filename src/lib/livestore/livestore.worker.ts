import { makeWorker } from '@livestore/adapter-web/worker';
import { makeSyncBackend } from '@livestore/sync-electric';
import { schema } from './schema.js';
// import { makeSupabaseSyncBackend } from './makeSupabaseSync.js';

makeWorker({
	schema,
	sync: {
		// backend: makeSupabaseSyncBackend({
		// 	tableName: 'livestore_events',
		// 	enableRealtime: true,
		// 	batchSize: 100
		// })
		backend: makeSyncBackend({ endpoint: '/api/electric' }),
		// initialSyncOptions: { _tag: 'Blocking', timeout: 5000 }
	}
});
