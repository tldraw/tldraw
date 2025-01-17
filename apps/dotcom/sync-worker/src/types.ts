// https://developers.cloudflare.com/analytics/analytics-engine/

import type { RoomSnapshot } from '@tldraw/sync-core'
// import { TLAppDurableObject } from './TLAppDurableObject'
import type { TLDrawDurableObject } from './TLDrawDurableObject'
import type { TLLoggerDurableObject } from './TLLoggerDurableObject'
import type { TLPostgresReplicator } from './TLPostgresReplicator'
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
	// TLAPP_DO: DurableObjectNamespace<TLAppDurableObject>
	TL_PG_REPLICATOR: DurableObjectNamespace<TLPostgresReplicator>
	TL_USER: DurableObjectNamespace<TLUserDurableObject>
	TL_LOGGER: DurableObjectNamespace<TLLoggerDurableObject>

	BOTCOM_POSTGRES_CONNECTION_STRING: string
	BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: string
	MEASURE: Analytics | undefined

	ROOMS: R2Bucket
	ROOMS_HISTORY_EPHEMERAL: R2Bucket

	ROOM_SNAPSHOTS: R2Bucket
	SNAPSHOT_SLUG_TO_PARENT_SLUG: KVNamespace

	SLUG_TO_READONLY_SLUG: KVNamespace
	READONLY_SLUG_TO_SLUG: KVNamespace

	CF_VERSION_METADATA: WorkerVersionMetadata

	// env vars
	SUPABASE_URL: string | undefined
	SUPABASE_KEY: string | undefined

	APP_ORIGIN: string | undefined
	CLERK_SECRET_KEY: string | undefined
	CLERK_PUBLISHABLE_KEY: string | undefined

	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	SENTRY_CSP_REPORT_URI: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
	ASSET_UPLOAD_ORIGIN: string | undefined

	RATE_LIMITER: RateLimit
}

export function isDebugLogging(env: Environment) {
	return env.TLDRAW_ENV === 'development' || env.TLDRAW_ENV === 'preview'
}

export type DBLoadResult =
	| {
			type: 'error'
			error?: Error | undefined
	  }
	| {
			type: 'room_found'
			snapshot: RoomSnapshot
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

export type TLPostgresReplicatorEvent =
	| { type: 'reboot' | 'reboot_error' | 'register_user' | 'unregister_user' | 'get_file_record' }
	| { type: 'reboot_duration'; duration: number }
	| { type: 'rpm'; rpm: number }

export type TLUserDurableObjectEvent =
	| {
			type:
				| 'reboot'
				| 'reboot_error'
				| 'rate_limited'
				| 'broadcast_message'
				| 'mutation'
				| 'reject_mutation'
				| 'replication_event'
				| 'connect_retry'
			id: string
	  }
	| { type: 'reboot_duration'; id: string; duration: number }
