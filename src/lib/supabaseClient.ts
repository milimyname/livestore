import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	'sb_secret_5sqIHe-vMNqAL1qgUgfg1w_StCa1vyQ'
);
