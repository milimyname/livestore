// // supabase-backend.ts
// import { createClient } from '@supabase/supabase-js';
// import { Effect, Stream, Option, SubscriptionRef } from '@livestore/utils/effect';
// import type { SyncBackend } from '@livestore/common';

// console.log('starting');
// export const makeSupabaseBackend = (supabase: ReturnType<typeof createClient>): SyncBackend => ({
// 	metadata: { name: 'Supabase', description: 'REST + RPC' },

// 	connect: Effect.log('🔌  SyncBackend.connect').pipe(Effect.asVoid),

// 	isConnected: SubscriptionRef.make(true),

// 	pull: (cursorOpt) =>
// 		Stream.fromEffect(
// 			Effect.gen(function* (_) {
// 				console.log('done');

// 				const cursor = Option.getOrElse(
// 					Option.flatMap(cursorOpt, (c) => c.cursor),
// 					() => 0
// 				);

// 				yield* _(Effect.log(`📥  pull cursor = ${cursor}`));

// 				const { data, error } = yield* _(
// 					Effect.tryPromise(() => supabase.rpc('get_events_after', { cursor }))
// 				);
// 				if (error) yield* _(Effect.fail(error));

// 				yield* _(Effect.log(`📦  pulled ${data?.length ?? 0} events`));

// 				const events = (data ?? []).map((row) => ({
// 					eventEncoded: {
// 						seqNum: row.seq_num,
// 						parentSeqNum: row.parent_seq,
// 						clientId: row.client_id,
// 						sessionId: row.session_id,
// 						name: row.name,
// 						args: row.args
// 					},
// 					metadata: Option.none()
// 				}));

// 				return { batch: events, remaining: 0 };
// 			})
// 		),

// 	push: (batch) =>
// 		Effect.gen(function* (_) {
// 			yield* _(Effect.log(`📤  push ${batch.length} events`));
// 			const { error } = yield* _(
// 				Effect.tryPromise(() =>
// 					supabase.rpc('push_events', { evs: batch.map((e) => e.eventEncoded) })
// 				)
// 			);
// 			if (error) yield* _(Effect.fail(error));
// 			yield* _(Effect.log('✅  push ok'));
// 		})
// });
