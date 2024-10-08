// https://developers.cloudflare.com/analytics/analytics-engine/

import { RoomSnapshot } from '@tldraw/sync-core'
import { TLAppDurableObject } from './TLAppDurableObject'
import { TLDrawDurableObject } from './TLDrawDurableObject'

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
	TLAPP_DO: DurableObjectNamespace<TLAppDurableObject>
	MEASURE: Analytics | undefined

	DB: D1Database

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
