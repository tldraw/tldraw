// https://developers.cloudflare.com/analytics/analytics-engine/

import { Queue } from '@cloudflare/workers-types'
import type { RoomSnapshot } from '@tldraw/sync-core'
import type { TLDrawDurableObject } from './TLDrawDurableObject'
import type { TLLoggerDurableObject } from './TLLoggerDurableObject'
import type { TLPostgresReplicator } from './TLPostgresReplicator'
import { TLStatsDurableObject } from './TLStatsDurableObject'
import type { TLUserDurableObject } from './TLUserDurableObject'

// This type isn't available in @cloudflare/workers-types yet
export interface Analytics {
	writeDataPoint(data: {
		blobs?: string[]
		doubles?: number[]
		indexes?: [string] // only one here
	}): void
}

export interface Environment {
	// bindings
	TLDR_DOC: DurableObjectNamespace<TLDrawDurableObject>
	TL_PG_REPLICATOR: DurableObjectNamespace<TLPostgresReplicator>
	TL_USER: DurableObjectNamespace<TLUserDurableObject>
	TL_LOGGER: DurableObjectNamespace<TLLoggerDurableObject>
	TL_STATS: DurableObjectNamespace<TLStatsDurableObject>

	BOTCOM_POSTGRES_CONNECTION_STRING: string
	BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: string

	DISCORD_FEEDBACK_WEBHOOK_URL?: string

	MEASURE: Analytics | undefined

	ROOMS: R2Bucket
	ROOMS_HISTORY_EPHEMERAL: R2Bucket

	ROOM_SNAPSHOTS: R2Bucket
	SNAPSHOT_SLUG_TO_PARENT_SLUG: KVNamespace

	UPLOADS: R2Bucket
	USER_DO_SNAPSHOTS: R2Bucket

	SLUG_TO_READONLY_SLUG: KVNamespace
	READONLY_SLUG_TO_SLUG: KVNamespace

	CF_VERSION_METADATA: WorkerVersionMetadata

	// env vars
	SUPABASE_URL: string | undefined
	SUPABASE_KEY: string | undefined

	CLERK_SECRET_KEY: string | undefined
	CLERK_PUBLISHABLE_KEY: string | undefined

	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	SENTRY_CSP_REPORT_URI: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
	ASSET_UPLOAD_ORIGIN: string | undefined
	MULTIPLAYER_SERVER: string | undefined

	HEALTH_CHECK_BEARER_TOKEN: string | undefined

	ANALYTICS_API_URL: string | undefined
	ANALYTICS_API_TOKEN: string | undefined

	RATE_LIMITER: RateLimit

	QUEUE: Queue<QueueMessage>
}

export function isDebugLogging(env: Environment) {
	return env.TLDRAW_ENV === 'development' || env.TLDRAW_ENV === 'preview'
}

export function getUserDoSnapshotKey(env: Environment, userId: string) {
	const snapshotPrefix = env.TLDRAW_ENV === 'preview' ? env.WORKER_NAME + '/' : ''
	return `${snapshotPrefix}${userId}`
}

export type DBLoadResult =
	| {
			type: 'error'
			error?: Error | undefined
	  }
	| {
			type: 'room_found'
			snapshot: RoomSnapshot
			roomSizeMB: number
	  }
	| {
			type: 'room_not_found'
	  }

export type TLServerEvent =
	| {
			type: 'client'
			name: 'room_create' | 'room_reopen' | 'enter' | 'leave' | 'last_out'
			roomId: string
			instanceId: string
			localClientId: string
	  }
	| {
			type: 'client'
			name: 'rate_limited'
			userId: string | undefined
			localClientId: string
	  }
	| {
			type: 'room'
			name:
				| 'failed_load_from_db'
				| 'failed_persist_to_db'
				| 'room_empty'
				| 'fail_persist'
				| 'room_start'
			roomId: string
	  }
	| {
			type: 'send_message'
			roomId: string
			messageType: string
			messageLength: number
	  }

export type TLPostgresReplicatorRebootSource =
	| 'constructor'
	| 'inactivity'
	| 'retry'
	| 'subscription_closed'
	| 'test'

export type TLPostgresReplicatorEvent =
	| { type: 'reboot'; source: TLPostgresReplicatorRebootSource }
	| { type: 'request_lsn_update' }
	| {
			type:
				| 'reboot_error'
				| 'register_user'
				| 'unregister_user'
				| 'get_file_record'
				| 'prune'
				| 'resume_sequence'
	  }
	| { type: 'reboot_duration'; duration: number }
	| { type: 'rpm'; rpm: number }
	| { type: 'active_users'; count: number }

export type TLUserDurableObjectEvent =
	| {
			type:
				| 'reboot'
				| 'full_data_fetch'
				| 'full_data_fetch_hard'
				| 'found_snapshot'
				| 'reboot_error'
				| 'rate_limited'
				| 'broadcast_message'
				| 'mutation'
				| 'reject_mutation'
				| 'replication_event'
				| 'connect_retry'
				| 'user_do_abort'
				| 'not_enough_history_for_fast_reboot'
				| 'woken_up_by_replication_event'
			id: string
	  }
	| { type: 'reboot_duration'; id: string; duration: number }
	| { type: 'cold_start_time'; id: string; duration: number }

export interface QueueMessage {
	type: 'asset-upload'
	objectName: string
	fileId: string
	userId: string | null
}
