import type { EventSequenceNumber, LiveStoreEvent } from '@livestore/livestore';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const makeSupabaseSync = {
	async pull(cursor: typeof EventSequenceNumber) {
		console.log({ cursor });
		const { data } = await supabase.rpc('get_events_after', { cursor });
		return data ?? [];
	},

	async push(events: (typeof LiveStoreEvent)[]) {
		console.log({ events });
		const data = await supabase.rpc('push_events', { evs: events });
		console.log({ data });
	},

	// subscribe(onEvent) {
	// 	supabase
	// 		.channel('livestore')
	// 		.on(
	// 			'postgres_changes',
	// 			{ event: 'INSERT', schema: 'public', table: 'livestore_events' },
	// 			({ new: e }) => onEvent(e)
	// 		)
	// 		.subscribe();
	// }
};
