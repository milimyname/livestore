import { Effect, Stream } from 'effect';
import type {
	SyncBackend,
	InvalidPullError,
	InvalidPushError,
	MakeBackendArgs,
	SyncBackendConstructor
} from '@livestore/common';
import * as LiveStore from '@livestore/livestore';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '$lib/supabaseClient';

type LiveStoreEvent = typeof LiveStore.LiveStoreEvent;
type EventSequenceNumber = typeof LiveStore.EventSequenceNumber;

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateDeviceId(): string {
	if (typeof window !== 'undefined' && window.localStorage) {
		let deviceId = localStorage.getItem('livestore_device_id');
		if (!deviceId) {
			deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			localStorage.setItem('livestore_device_id', deviceId);
		}
		return deviceId;
	}
	return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// TYPES
// ============================================

interface SupabaseEvent {
	id: number;
	sequence_number: number;
	event_id: string;
	entity_type: string;
	entity_id: string;
	operation: string;
	data: any;
	timestamp: string;
	device_id: string;
	user_id?: string;
}

interface SyncBackendConfig {
	tableName?: string;
	deviceId?: string;
	userId?: string;
	batchSize?: number;
	enableRealtime?: boolean;
}

// ============================================
// SUPABASE SYNC BACKEND CONSTRUCTOR
// ============================================

/**
 * Creates a Supabase sync backend constructor for LiveStore
 * This returns a constructor function that LiveStore expects
 */
export function makeSupabaseSyncBackend(
	config: SyncBackendConfig = {}
): SyncBackendConstructor<any> {
	// Return a constructor function that LiveStore can call
	return (args: MakeBackendArgs) => {
		console.log('Creating Supabase sync backend with args:', args);

		// Create the backend within an Effect context
		return Effect.gen(function* (_) {
			const {
				tableName = 'livestore_events',
				deviceId = generateDeviceId(),
				userId = args.syncPayload?.userId,
				batchSize = 100,
				enableRealtime = true
			} = config;

			// Store for realtime
			let realtimeChannel: RealtimeChannel | null = null;
			const pullCallbacks = new Set<(events: LiveStoreEvent[]) => void>();

			// Transform functions
			function transformToLiveStoreEvent(supabaseEvent: SupabaseEvent): LiveStoreEvent {
				return {
					id: supabaseEvent.event_id,
					sequenceNumber: supabaseEvent.sequence_number,
					entityType: supabaseEvent.entity_type,
					entityId: supabaseEvent.entity_id,
					operation: supabaseEvent.operation as any,
					data: supabaseEvent.data,
					timestamp: new Date(supabaseEvent.timestamp).getTime(),
					deviceId: supabaseEvent.device_id,
					userId: supabaseEvent.user_id
				} as LiveStoreEvent;
			}

			function transformToSupabaseEvent(
				event: LiveStoreEvent,
				sequenceNumber: number
			): Omit<SupabaseEvent, 'id' | 'timestamp'> {
				return {
					sequence_number: sequenceNumber,
					event_id: event.id,
					entity_type: event.entityType,
					entity_id: event.entityId,
					operation: event.operation,
					data: event.data,
					device_id: event.deviceId || deviceId,
					user_id: event.userId || userId
				};
			}

			// Setup realtime if enabled
			function setupRealtime() {
				if (!enableRealtime) return;

				realtimeChannel = supabase
					.channel('livestore_sync')
					.on(
						'postgres_changes',
						{
							event: 'INSERT',
							schema: 'public',
							table: tableName,
							filter: userId ? `user_id=eq.${userId}` : undefined
						},
						(payload) => {
							const newEvent = transformToLiveStoreEvent(payload.new as SupabaseEvent);
							pullCallbacks.forEach((callback) => callback([newEvent]));
						}
					)
					.subscribe();
			}

			// Initialize realtime
			setupRealtime();

			// Add cleanup to scope
			yield* _(
				Effect.addFinalizer(() =>
					Effect.sync(() => {
						if (realtimeChannel) {
							supabase.removeChannel(realtimeChannel);
						}
						pullCallbacks.clear();
					})
				)
			);

			// Create the SyncBackend implementation
			const backend: SyncBackend = {
				pull: (cursor: EventSequenceNumber) => {
					return Stream.async<{ batch: LiveStoreEvent[] }, InvalidPullError>((emit) => {
						let isCancelled = false;
						let pollInterval: NodeJS.Timeout | null = null;
						let lastCursor = cursor || 0;

						const realtimeCallback = (events: LiveStoreEvent[]) => {
							if (!isCancelled && events.length > 0) {
								emit(Effect.succeed({ batch: events }));
							}
						};

						if (enableRealtime) {
							pullCallbacks.add(realtimeCallback);
						}

						const pullEvents = async () => {
							try {
								const { data, error } = await supabase
									.from(tableName)
									.select('*')
									.gt('sequence_number', lastCursor)
									.order('sequence_number', { ascending: true })
									.limit(batchSize);

								if (error) {
									console.error('Pull error:', error);
									emit(
										Effect.fail({
											_tag: 'InvalidPullError',
											message: error.message
										} as InvalidPullError)
									);
									return;
								}

								if (data && data.length > 0) {
									const events = data.map(transformToLiveStoreEvent);
									lastCursor = data[data.length - 1].sequence_number;

									if (!isCancelled) {
										emit(Effect.succeed({ batch: events }));
									}
								}
							} catch (error) {
								console.error('Pull exception:', error);
								emit(
									Effect.fail({
										_tag: 'InvalidPullError',
										message: error instanceof Error ? error.message : 'Unknown error'
									} as InvalidPullError)
								);
							}
						};

						// Initial pull
						pullEvents();

						// Polling fallback
						if (!enableRealtime) {
							pollInterval = setInterval(pullEvents, 5000);
						}

						// Cleanup
						return Effect.sync(() => {
							isCancelled = true;
							if (pollInterval) clearInterval(pollInterval);
							if (enableRealtime) pullCallbacks.delete(realtimeCallback);
						});
					});
				},

				push: (batch: LiveStoreEvent[]) => {
					return Effect.tryPromise({
						try: async () => {
							if (batch.length === 0) return;

							// Get sequence numbers
							const { data: sequences, error: seqError } = await supabase.rpc(
								'get_next_sequences',
								{ count: batch.length }
							);

							if (seqError || !sequences) {
								throw new Error(`Failed to get sequences: ${seqError?.message || 'Unknown error'}`);
							}

							// Transform and insert
							const supabaseEvents = batch.map((event, index) =>
								transformToSupabaseEvent(event, sequences[index])
							);

							const { error: insertError } = await supabase.from(tableName).insert(supabaseEvents);

							if (insertError) {
								if (insertError.code === '23505') {
									console.log('Some events already exist, skipping...');
									return;
								}
								throw new Error(`Insert failed: ${insertError.message}`);
							}
						},
						catch: (error) =>
							({
								_tag: 'InvalidPushError',
								message: error instanceof Error ? error.message : 'Unknown push error'
							}) as InvalidPushError
					});
				}
			};

			return backend;
		});
	};
}
